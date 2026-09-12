import { NextResponse } from 'next/server';
import { readValue } from '../../lib/session-cookie';
import { sunucuHatasi } from '../../lib/api-error';
import { cookies } from 'next/headers';
import { redisGetJSON } from '../../lib/redis';

const STEAM_API_KEY = process.env.STEAM_API_KEY;

// GET /api/steam-library  →  Kullanıcının Steam kütüphanesini döndür
export async function GET() {
  const cookieStore = await cookies();
  const userSession = cookieStore.get('gp_user_session');

  // Giriş yapılmış Gamerisen hesabı varsa Redis durumunu kontrol et
  if (userSession?.value) {
    try {
      // İMZALI ÇEREZ: `readValue` doğruluyor. Main bunu `JSON.parse` ile
      // okuyordu; bu ağaçta kimlik çerezleri imzalı olduğu icin parse her
      // zaman hata verir ve blok sessizce hiç çalışmazdı.
      const user = await readValue(userSession.value);
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          const accounts = Array.isArray(conn.steamAccounts)
            ? conn.steamAccounts
            : (conn.steam?.steamId ? [conn.steam] : []);
          if (accounts.length === 0) {
            // Hesap var, Steam kaydı BOŞ. Kullanıcı hiç bağlamamış ya da
            // kaydı düşmüş olabilir — ikisi de "yeniden bağla" ile çözülüyor.
            return NextResponse.json(
              { error: 'Steam hesabı bağlı değil', kod: 'STEAM_KAYIT_BOS', yenidenBagla: true, games: [] },
              { status: 401 },
            );
          }
        }
      }
    } catch {}
  }

  // Oturumdan steamId al
  const session = cookieStore.get('gp_steam_session');

  // ── ÜÇ FARKLI 401, ÜÇ FARKLI KOD ─────────────────────────────────────────
  //
  // Eskiden bu üç arıza noktasından İKİSİ aynı metni ("Giriş yapılmamış")
  // dönüyordu; yanıt hangisinin olduğunu söylemiyordu ve arayüz de kullanıcıya
  // tek tip bir hata gösteriyordu. Oysa üçünün de çözümü aynı tek dokunuş:
  // Steam'i yeniden bağlamak.
  //
  // `yenidenBagla: true` arayüzün "hata" yerine DÜĞME göstermesi için.
  if (!session?.value) {
    return NextResponse.json(
      { error: 'Steam bağlantın yenilenmeli', kod: 'STEAM_CEREZ_YOK', yenidenBagla: true, games: [] },
      { status: 401 },
    );
  }

  // ÇEREZ VAR AMA OKUNAMIYOR — bugün beklenen durum: kimlik çerezleri bu
  // birleştirmeyle İMZALI hâle geldi ve daha önce yazılmış imzasız çerezler
  // artık doğrulanamıyor. İmzasızı kabul etmek kapatılan açığı geri açardı,
  // o yüzden çözüm kabul etmek değil yeniden bağlamak.
  const steamId = (await readValue(session.value))?.steamId;
  if (!steamId) {
    return NextResponse.json(
      { error: 'Steam bağlantın yenilenmeli', kod: 'STEAM_CEREZ_GECERSIZ', yenidenBagla: true, games: [] },
      { status: 401 },
    );
  }

  if (!STEAM_API_KEY) {
    return NextResponse.json({ error: 'STEAM_API_KEY tanımlı değil', games: [] }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${STEAM_API_KEY}` +
      `&steamid=${steamId}` +
      `&include_appinfo=1` +
      `&include_played_free_games=1` +
      `&format=json`,
      { cache: 'no-store' }
    );

    if (!res.ok) throw new Error(`Steam API ${res.status}`);
    const data = await res.json();

    const raw   = data?.response?.games || [];
    const games = raw
      .map(g => ({
        appid:      g.appid,
        name:       g.name || `App ${g.appid}`,
        hours:      parseFloat((( g.playtime_forever || 0) / 60).toFixed(1)),
        hoursRecent: parseFloat(((g.playtime_2weeks   || 0) / 60).toFixed(1)),
        image:      `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        icon:       g.img_icon_url
          ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
        lastPlayed: g.rtime_last_played || 0,
        storeUrl:   `https://store.steampowered.com/app/${g.appid}`,
      }))
      .sort((a, b) => b.hours - a.hours);  // En çok oynanan önce

    const totalHours  = parseFloat(games.reduce((s, g) => s + g.hours, 0).toFixed(1));
    const playedGames = games.filter(g => g.hours > 0).length;

    return NextResponse.json({
      games,
      total:       games.length,
      played:      playedGames,
      totalHours,
    });

  } catch (err) {
    console.error('Steam library hatası:', err.message);
    
    // 401: Yetkilendirme hatası (Genellikle geçersiz API Key)
    if (err.message.includes('401')) {
      return NextResponse.json({
        error: 'Steam Web API Anahtarı geçersiz veya yetkisiz. Lütfen .env.local dosyasındaki STEAM_API_KEY değerini kontrol edin.',
        games: [],
        private: false
      }, { status: 401 });
    }
    
    // 403: Erişim engellendi (Gizli Profil)
    if (err.message.includes('403')) {
      return NextResponse.json({
        error: 'Steam profilin gizli. Profil gizliliğini "Herkese Açık" yapman gerekiyor.',
        games: [],
        private: true
      }, { status: 403 });
    }
    
    return sunucuHatasi(err, 'steam-library');
  }
}
