import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisCmd, redisGetJSON, redisPipeline, parseJSON } from '../../../lib/redis';
import { friendIds, summaries, libraries } from '../../../lib/steam-graph';
import { getHiddenUids } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// "Arkadaşların bu hafta ne oynadı"
//
// EK STEAM ÇAĞRISI YOK — bu uçun bütün numarası burada. Steam'in
// `playtime_2weeks` alanı kütüphane kaydının İÇİNDE geliyor ve `steam-graph`
// zaten her kütüphaneyi `hours2w` ile birlikte önbelleğe yazıyor. Yani "son
// iki hafta" verisi elimizde hazır duruyor; arkadaş başına ayrı bir
// GetRecentlyPlayedGames çağrısı atmak gereksiz olurdu.
//
// Önbellek `steamId` anahtarlı ve grafik boyunca PAYLAŞILIYOR: Ahmet'in
// kütüphanesi bir kez çekilir, Ahmet'i arkadaş bilen herkes aynı kaydı okur.
//
// TAZELİK SINIRI DÜRÜSTÇE SÖYLENSİN: kütüphane önbelleği 24 saatlik, dolayısıyla
// buradaki "bu hafta" en fazla 24 saat bayat olabilir. Haftalık bir pencere
// için kabul edilebilir; anlık bir "şu an oynuyor" göstergesi DEĞİL ve öyle
// sunulmamalı.
//
// SONUÇ AYRICA ÖNBELLEKLENİYOR (30 dk). Bu uç anasayfada, yani uygulamanın
// her açılışında çağrılıyor; `friendIds` + `summaries` iki gerçek Steam
// çağrısı ve onları her açılışta tekrarlamanın karşılığı yok.
//
// NEDEN BU ÖZELLİK: bir web sitesinin gösteremeyeceği veri. Kullanıcının
// KENDİ Steam arkadaş grafiği üzerinden hesaplanıyor ve ilk günden dolu —
// arkadaşların Gamerisen'i hiç kurmamış olsa bile.
// ─────────────────────────────────────────────────────────────────────────────

const connKey  = (uid) => `user_connections:${uid}`;
const cacheKey = (uid) => `friend_recent:${uid}`;

const CACHE_TTL = 30 * 60;
// steam-friends ile AYNI tavan: 500 arkadaşlı bir hesap sınırsız bırakılsa
// tek kullanıcı günlük kotanın gözle görülür bir kısmını bir seferde yerdi.
const MAX_FRIENDS = 100;
// Şeritte kaç oyun görünüyor. Şerit yatay ve kimse 12'den fazlasını kaydırmıyor.
const MAX_GAMES = 12;
// Kart başına kaç arkadaş adı taşınıyor. Geri kalanı `count` ile anlatılıyor;
// 40 kişilik bir ad listesini istemciye göndermenin faydası yok.
const MAX_NAMES = 3;

const headerImage = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

function steamListOf(conn) {
  if (Array.isArray(conn?.steamAccounts) && conn.steamAccounts.length) return conn.steamAccounts;
  if (conn?.steam?.steamId) return [conn.steam];
  return [];
}

/**
 * BOŞ SONUÇ HATA DEĞİL.
 *
 * Bu uç anasayfadaki bir şerit için çalışıyor. Steam bağlı değilse veya
 * arkadaş listesi gizliyse bu, kullanıcının düzeltmesi gereken bir hata
 * değil — sadece o şerit çizilmiyor. 409 dönseydi istemci her açılışta bir
 * hatayı yutmak zorunda kalırdı; `reason` alanı ise gerektiğinde
 * açıklanabilir bir bilgi olarak duruyor.
 */
function empty(reason) {
  return NextResponse.json({ games: [], reason });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:friendact:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const cached = parseJSON(await redisCmd(['GET', cacheKey(user.uid)]).catch(() => null));
  if (cached) return NextResponse.json({ ...cached, cached: true });

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) return empty('STEAM_REQUIRED');

  // v1: birincil hesap — steam-friends ile aynı gerekçe (çoklu hesap
  // birleştirmek "kimin arkadaşı" sorusunu bulanıklaştırıyor).
  const ids = await friendIds(accounts[0].steamId);
  // Arkadaş yok VEYA arkadaş listesi gizli: Steam ikisinde de boş dönüyor,
  // ayırt edemiyoruz.
  if (!ids.length) return empty('NO_FRIENDS');

  const slice = ids.slice(0, MAX_FRIENDS);

  const [info, libs] = await Promise.all([
    summaries(slice),
    libraries(slice),
  ]);

  // Engellenen Gamerisen kullanıcıları düşüyor: Steam'de arkadaş olmaları
  // buradaki engeli geçersiz kılmaz.
  const uids = await redisPipeline(slice.map((id) => ['GET', `steam_to_uid:${id}`])) || [];
  const hidden = await getHiddenUids(user.uid);
  const blocked = new Set();
  slice.forEach((id, i) => { if (uids[i] && hidden.has(uids[i])) blocked.add(id); });

  // ── Oyun bazında topla ──
  // Arkadaş bazında listelemek yerine oyun bazında toplamanın sebebi:
  // "3 arkadaşın Elden Ring oynuyor" tek başına bir sinyal; aynı bilgi üç
  // ayrı satıra bölündüğünde o sinyal kayboluyor. Az arkadaşlı bir hesapta
  // ise doğal olarak "Ahmet oynadı"ya düşüyor — bozulmuyor, sadeleşiyor.
  const byGame = new Map();
  for (const sid of slice) {
    if (blocked.has(sid)) continue;
    const lib = libs.get(sid)?.games;
    if (!Array.isArray(lib)) continue;           // gizli profil
    const meta = info.get(sid) || {};

    for (const g of lib) {
      if (!g.hours2w) continue;
      let row = byGame.get(g.appid);
      if (!row) {
        row = { appid: String(g.appid), name: g.name, hours: 0, friends: [] };
        byGame.set(g.appid, row);
      }
      row.hours = Math.round((row.hours + g.hours2w) * 10) / 10;
      row.friends.push({
        name: meta.name || 'Steam oyuncusu',
        avatar: meta.avatar || null,
        hours: g.hours2w,
      });
    }
  }

  const games = [...byGame.values()]
    // Önce KAÇ arkadaş, sonra toplam saat. Sıralama "kaç kişi" ile başlıyor
    // çünkü şeridin anlattığı şey popülerlik değil, ÇEVREN.
    .sort((a, b) =>
      (b.friends.length - a.friends.length) ||
      (b.hours - a.hours) ||
      String(a.name).localeCompare(String(b.name)))
    .slice(0, MAX_GAMES)
    .map((g) => ({
      appid: g.appid,
      name: g.name,
      image: headerImage(g.appid),
      hours: g.hours,
      count: g.friends.length,
      friends: g.friends
        .sort((a, b) => b.hours - a.hours)
        .slice(0, MAX_NAMES),
    }));

  const payload = { games };
  // Önbellek yazımı gönderimi BAĞLAMIYOR: düşerse bir sonraki istek yeniden
  // hesaplar, kullanıcı bir şey kaybetmez.
  await redisCmd(['SET', cacheKey(user.uid), JSON.stringify(payload), 'EX', String(CACHE_TTL)])
    .catch(() => {});

  return NextResponse.json(payload);
}
