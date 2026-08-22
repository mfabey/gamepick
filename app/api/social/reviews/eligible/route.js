import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getSteamDetailsCached } from '../../../../lib/steam-cache';
import { redisGetJSON } from '../../../../lib/redis';
import { libraries } from '../../../../lib/steam-graph';
import { listUserReviews, MIN_HOURS } from '../../../../lib/review-store';

// ─────────────────────────────────────────────────────────────────────────────
// "Hangi oyunlara inceleme yazabilirim?"
//
// BU UÇ, SAYFANIN BOŞ GÖRÜNMEMESİNİ SAĞLIYOR. Topluluk akışı ilk günlerde boş
// olacak; ama Steam'i bağlı bir kullanıcının yazabileceği oyun listesi ilk
// günden dolu. Sayfa "kimse bir şey yazmamış" yerine "şunlar hakkında
// yazabilirsin" diye açılıyor.
//
// ZATEN YAZILMIŞ OLANLAR ELENİYOR: kullanıcı başına oyun başına tek inceleme
// var, yazılmış bir oyunu tekrar önermek yanıltıcı olurdu.
//
// EN ÇOK OYNANAN ÖNCE: hakkında en çok söyleyecek şeyi olduğu oyunlar üstte.
// ─────────────────────────────────────────────────────────────────────────────

const connKey = (uid) => `user_connections:${uid}`;
// Steam varlık yolları HASH'li biçime taşındı; `/apps/<id>/header.jpg` yeni
// oyunlarda 404 ve hash kurulamıyor — yalnız API'den okunuyor. Düz yol
// YEDEK olarak duruyor (detay çekilemezse eski oyunlar yine kapak alsın).
const duzHeader = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

/** appid → gerçek header_image. Detaylar zaten önbellekli. */
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

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:reveli:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) return NextResponse.json({ error: 'STEAM_REQUIRED' }, { status: 409 });

  const [libs, written] = await Promise.all([
    libraries([accounts[0].steamId]),
    listUserReviews(user.uid, { limit: 200 }),
  ]);

  const games = libs.get(accounts[0].steamId)?.games;
  if (!Array.isArray(games)) return NextResponse.json({ error: 'SELF_PRIVATE' }, { status: 409 });

  const yazilan = new Set(written.map((r) => String(r.appid)));

  const secilen = games
    .filter((g) => g.hours >= MIN_HOURS && !yazilan.has(String(g.appid)))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 40);

  const kapaklar = await kapakCoz(secilen.map((g) => String(g.appid)));

  const list = secilen
    .map((g) => {
      const gercek = kapaklar.get(String(g.appid));
      return {
        appid: String(g.appid),
        name: g.name,
        hours: g.hours,
        image: gercek || duzHeader(g.appid),
        gorselYok: !gercek,
      };
    })
    // Kapağı çözülemeyen oyun sona — şerit ilk kartında boş kutu açmasın.
    .sort((a, b) => (a.gorselYok === b.gorselYok ? 0 : a.gorselYok ? 1 : -1));

  return NextResponse.json({ games: list, written: written.length });
}
