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

  let steamId = null;

  // 1. Giriş yapılmış Gamerisen hesabı varsa Redis'ten steamId al
  if (userSession?.value) {
    try {
      const user = await readValue(userSession.value);
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          const accounts = Array.isArray(conn.steamAccounts)
            ? conn.steamAccounts
            : (conn.steam?.steamId ? [conn.steam] : []);
          if (accounts[0]?.steamId) {
            steamId = accounts[0].steamId;
          }
        }
      }
    } catch {}
  }

  // 2. Çerezden steamId al
  if (!steamId) {
    const session = cookieStore.get('gp_steam_session');
    if (session?.value) {
      try {
        steamId = (await readValue(session.value))?.steamId;
      } catch {}
    }
  }

  // 3. Çoklu hesap çerezinden steamId al
  if (!steamId) {
    const multi = cookieStore.get('gp_steam_accounts');
    if (multi?.value) {
      try {
        const list = await readValue(multi.value);
        if (Array.isArray(list) && list[0]?.steamId) {
          steamId = list[0].steamId;
        }
      } catch {}
    }
  }

  if (!steamId) {
    return NextResponse.json(
      { error: 'Steam bağlantın yenilenmeli', kod: 'STEAM_CEREZ_YOK', yenidenBagla: true, games: [] },
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
