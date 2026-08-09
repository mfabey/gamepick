import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisGetJSON, redisPipeline } from '../../../lib/redis';
import { friendIds, summaries, libraries, intersect } from '../../../lib/steam-graph';
import { togetherFlags } from '../../../lib/steam-appinfo';
import { getProfiles, getHiddenUids } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Steam arkadaşları + kütüphane kesişimi.
//
// NEDEN VAR: yeni bir sosyal ağın klasik ölüm sebebi, ilk kullanıcının boş bir
// odaya girmesidir. Steam'in arkadaş grafiğini ödünç alarak bunu atlıyoruz —
// arkadaşın Gamerisen'i hiç kurmamış olsa bile "şu 13 oyuna birlikte
// sahipsiniz" diyebiliyoruz.
//
// İki kullanıcının ÖZEL kütüphanesi üzerinde hesaplama yapıyor; bir web
// sitesinin yapabileceği bir şey değil.
//
// GİZLİLİK: yalnızca Steam'in herkese açık verisini, kullanıcının KENDİ arkadaş
// listesi üzerinden okuyoruz. Gizli profiller `private: true` olarak dönüyor,
// içerik sızmıyor. Engellenen Gamerisen kullanıcıları eşleşmeden düşürülüyor.
// ─────────────────────────────────────────────────────────────────────────────

// Tek istekte kütüphanesi çekilecek arkadaş üst sınırı. 500 arkadaşlı bir hesap
// sınırsız bırakılsa tek kullanıcı günlük kotanın %0,5'ini bir seferde yerdi.
const MAX_FRIENDS = 100;

// Kaç ortak oyun geri dönsün — arayüzde ilk ekranda bu kadarı görünüyor.
const TOP_GAMES = 12;

const connKey = (uid) => `user_connections:${uid}`;

/** Eski tekli `steam` alanını da hesaba katarak diziye çevirir. */
function steamListOf(conn) {
  if (Array.isArray(conn?.steamAccounts) && conn.steamAccounts.length) return conn.steamAccounts;
  if (conn?.steam?.steamId) return [conn.steam];
  return [];
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Pahalı uç: her ıska Steam'e N çağrı demek. Arama ucundaki 60/dk buraya çok
  // gevşek kalır.
  const rl = await rateLimit(`rl:steamfriends:${user.uid}`, 20, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) {
    return NextResponse.json({ error: 'STEAM_REQUIRED' }, { status: 409 });
  }

  // v1: BİRİNCİL hesap. Kullanıcı 5 Steam hesabı bağlayabiliyor ama çoğunda tek
  // hesap var; birleştirme "kimin kütüphanesi" sorusunu bulanıklaştırdığı için
  // şimdilik bilinçli olarak dışarıda.
  const mySteamId = accounts[0].steamId;

  const ids = await friendIds(mySteamId);
  if (!ids.length) {
    // Arkadaş yok VEYA "arkadaş listesi" gizliliği kapalı — ayırt edemiyoruz,
    // Steam ikisinde de boş dönüyor. Arayüz her iki durumu da açıklıyor.
    return NextResponse.json({
      self: { steamId: mySteamId, size: 0 },
      friends: [],
      stats: { total: 0, readable: 0, private: 0 },
    });
  }

  const slice = ids.slice(0, MAX_FRIENDS);

  // Steam çağrıları paralel: özetler (100'lük gruplar) ve kütüphaneler
  // (önbellek + eksikler) birbirini beklemek zorunda değil.
  const [info, libs] = await Promise.all([
    summaries(slice),
    libraries([mySteamId, ...slice]),
  ]);

  const mine = libs.get(mySteamId)?.games;
  if (!mine) {
    // Kullanıcının KENDİ profili gizli → kesişim hesaplanamaz. Bu düzeltilebilir
    // bir durum, o yüzden ayrı bir kod: arayüz Steam gizlilik ayarına yönlendirir.
    return NextResponse.json({ error: 'SELF_PRIVATE' }, { status: 409 });
  }

  // Hangi Steam arkadaşı Gamerisen'de? Ters dizin zaten üç uçta besleniyor.
  const uids = await redisPipeline(slice.map((id) => ['GET', `steam_to_uid:${id}`])) || [];
  const uidBySteam = new Map();
  slice.forEach((id, i) => { if (uids[i]) uidBySteam.set(id, uids[i]); });

  // Engellenen/engelleyen kullanıcılar eşleşmeden düşer — Steam'de arkadaş
  // olmaları Gamerisen'deki engeli geçersiz kılmaz.
  const hidden = await getHiddenUids(user.uid);
  for (const [sid, uid] of uidBySteam) {
    if (hidden.has(uid) || uid === user.uid) uidBySteam.delete(sid);
  }

  const profiles = await getProfiles([...uidBySteam.values()]);

  // Kesişimleri önce hesapla; kategoriler için appid'leri TEKİLLEŞTİRİP tek
  // seferde soruyoruz. Aynı oyun her arkadaşta tekrar geçiyor (ölçümde 12
  // arkadaşın 157 ortak oyunu yalnızca 34 benzersiz appid'ye düşüyordu) —
  // tekilleştirilmezse Steam mağaza API'sine beş kat fazla istek gider.
  const per = slice.map((sid) => {
    const lib = libs.get(sid)?.games;
    return { sid, lib, ...(lib ? intersect(mine, lib) : { games: [], fresh: 0 }) };
  });

  const cats = await togetherFlags(
    [...new Set(per.flatMap((p) => p.games.map((g) => g.appid)))]
  );

  let readable = 0;
  const friends = per.map(({ sid, lib, games, fresh }) => {
    const meta = info.get(sid) || {};
    const uid = uidBySteam.get(sid);
    const prof = uid ? profiles[uid] : null;

    const base = {
      steamId: sid,
      name: meta.name || 'Steam oyuncusu',
      avatar: meta.avatar || null,
      gamerisen: prof ? {
        uid,
        username: prof.username || null,
        displayName: prof.displayName || prof.username || null,
        avatar: prof.avatar ?? null,
      } : null,
    };

    if (!lib) return { ...base, private: true, shared: 0, coop: 0, fresh: 0, top: [] };

    readable++;
    const enriched = games.map((g) => {
      const c = cats.get(g.appid) || {};
      return { ...g, coop: !!c.coop, together: !!c.together };
    });

    // SIRALAMA ÖLÇÜMLE BELİRLENDİ. Saat sırası tek başına her arkadaşta aynı
    // oyunu tepeye koyuyordu (Counter-Strike 2) — doğru ama işe yaramaz bir
    // cevap. Birlikte oynanabilirlik öne alınınca liste çeşitleniyor.
    enriched.sort((a, b) =>
      (Number(b.coop) - Number(a.coop)) ||
      (Number(b.together) - Number(a.together)) ||
      (b.totalHours - a.totalHours) ||
      String(a.name).localeCompare(String(b.name))
    );

    return {
      ...base,
      private: false,
      shared: enriched.length,
      coop: enriched.filter((g) => g.coop).length,
      fresh,
      top: enriched.slice(0, TOP_GAMES),
    };
  });

  // Birlikte oynanabilir ortak oyunu çok olan önce — "en dolu arkadaş" değil,
  // "bu akşam en kolay buluşulacak arkadaş" listenin başında olsun.
  friends.sort((a, b) => (b.coop - a.coop) || (b.shared - a.shared) || a.name.localeCompare(b.name));

  return NextResponse.json({
    self: { steamId: mySteamId, size: mine.length },
    friends,
    stats: {
      total: ids.length,
      readable,
      private: slice.length - readable,
      truncated: ids.length > MAX_FRIENDS,
    },
  });
}
