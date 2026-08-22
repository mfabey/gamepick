import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisCmd, redisGetJSON, redisPipeline, parseJSON } from '../../../lib/redis';
import { friendIds, summaries, libraries } from '../../../lib/steam-graph';
import { getHiddenUids } from '../../../lib/social-store';
import { getSteamDetailsCached } from '../../../lib/steam-cache';

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

// ─────────────────────────────────────────────────────────────────────────────
// KAPAK ADRESİ ARTIK KURULMUYOR, ÇÖZÜLÜYOR.
//
// Eskiden `/apps/<appid>/header.jpg` diye elle birleştiriliyordu. Steam varlık
// yollarını HASH'Lİ biçime taşıdı ve yeni oyunlarda düz yol 404 veriyor:
//
//   ✗ /apps/3065940/header.jpg                            → 404
//   ✓ /apps/3065940/a50a3d05…/header_alt_assets_0.jpg      → 200
//
// Ölçüldü: dört başarısız appid'in hiçbiri cdn.cloudflare, cdn.akamai ya da
// shared.akamai üzerinden DÜZ yoldan gelmiyor. Hash kurulamıyor — yalnızca
// Steam API'sinden okunuyor; bazılarında dosya adı da farklı.
//
// Eski oyunlarda düz yol hâlâ çalıştığı için bu kırılma bugüne kadar
// görünmedi: yalnızca YENİ çıkanlarda ortaya çıkıyor, yani en çok bakılan
// şeritte.
//
// YEDEK OLARAK DURUYOR: detay çekilemezse (Steam yavaş/kapalı) eski oyunlar
// yine de kapak alsın. Çözülemeyen oyun `gorselYok` ile işaretleniyor.
const duzHeader = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

/** appid listesi → { appid: header_image }. Steam detayları zaten önbellekli. */
async function kapakCoz(appids) {
  const cikti = new Map();
  const sonuc = await Promise.allSettled(
    appids.map((a) => getSteamDetailsCached(Number(a)).then((d) => [a, d?.header_image || null]))
  );
  for (const r of sonuc) {
    if (r.status === 'fulfilled' && r.value[1]) cikti.set(r.value[0], r.value[1]);
  }
  return cikti;
}

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

  const secilen = [...byGame.values()]
    // Önce KAÇ arkadaş, sonra toplam saat. Sıralama "kaç kişi" ile başlıyor
    // çünkü şeridin anlattığı şey popülerlik değil, ÇEVREN.
    .sort((a, b) =>
      (b.friends.length - a.friends.length) ||
      (b.hours - a.hours) ||
      String(a.name).localeCompare(String(b.name)))
    .slice(0, MAX_GAMES);

  const kapaklar = await kapakCoz(secilen.map((g) => g.appid));

  const games = secilen
    .map((g) => {
      const gercek = kapaklar.get(g.appid);
      return {
        appid: g.appid,
        name: g.name,
        image: gercek || duzHeader(g.appid),
        // Steam detayı kapak vermediyse düz yol da büyük olasılıkla 404 —
        // istemci bunu bilsin ki kartı sona atabilsin.
        gorselYok: !gercek,
        hours: g.hours,
        count: g.friends.length,
        friends: g.friends
          .sort((a, b) => b.hours - a.hours)
          .slice(0, MAX_NAMES),
      };
    })
    // KAPAĞI ÇÖZÜLEMEYEN OYUN SONA. Sıralama ölçütü değişmiyor, yalnızca
    // görselsizler en arkaya alınıyor: ilk ekranda boş kutu görünmesin.
    .sort((a, b) => (a.gorselYok === b.gorselYok ? 0 : a.gorselYok ? 1 : -1));

  const payload = { games };
  // Önbellek yazımı gönderimi BAĞLAMIYOR: düşerse bir sonraki istek yeniden
  // hesaplar, kullanıcı bir şey kaybetmez.
  await redisCmd(['SET', cacheKey(user.uid), JSON.stringify(payload), 'EX', String(CACHE_TTL)])
    .catch(() => {});

  return NextResponse.json(payload);
}
