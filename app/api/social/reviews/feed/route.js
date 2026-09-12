import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../../lib/social-store';
import { listRecentReviews, listUserReviews } from '../../../../lib/review-store';
import { countReplies, reviewRef } from '../../../../lib/post-store';
import { clientIp } from '../../../../lib/client-ip';

// ─────────────────────────────────────────────────────────────────────────────
// İnceleme akışı — tüm oyunlardan, en yeni önce.
//
// OYUN SAYFASINDA DEĞİL AYRI BİR SAYFADA. İki sebep:
//
//  1. Oyun sayfaları uygulamanın KENDİ VERDİĞİ bilgiyi göstermeye devam
//     ediyor — Steam'in toplu analizi orada kalıyor.
//
//  2. TERK EDİLMİŞLİK RİSKİ. Kullanıcı sayısı azken her oyun sayfasının
//     altında "0 inceleme" görmek, uygulamanın ölü olduğunu söyler. Seyrek
//     kullanıcı içeriği, hiç içerik olmamasından kötüdür.
//
// GÖRSEL ADRESİ TÜRETİLİYOR, saklanmıyor: Steam başlık görselinin yolu
// appid'den hesaplanabiliyor.
// ─────────────────────────────────────────────────────────────────────────────

const headerImage = (appid) =>
  `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;

// Genel akış HESAPSIZ okunabilir: inceleme okumak kayıt gerektirmeyen bir iş
// ve kayıt arkasına almak App Store Guideline 5.1.1(v) itirazına açık kapı.
// Yazma uçları (POST/DELETE, ayrı dosyada) jetonlu kalıyor.
//
// Jeton GÖNDERİLİRSE yine okunuyor — engel süzgeci ancak o zaman çalışabilir.
export async function GET(request) {
  const user = await verifyMobileToken(request);

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === '1';
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  // "Benimkiler" oturumsuz anlamsız.
  if (mine && !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Anonimde uid yok; sayaç IP'ye bağlanıyor. Vercel gerçek istemciyi
  // x-forwarded-for ile veriyor (üzerine kendisi yazıyor); yoksa tek bir
  // ortak kovaya düşüyor. Adres `client-ip.js` ile normalize ediliyor —
  // IPv6 /64'e kırpılmazsa bu sayaç IPv6 istemcide hiçbir şey tutmuyor.
  const rlKey = user
    ? `rl:revfeed:${user.uid}`
    : `rl:revfeed:ip:${clientIp(request)}`;
  const rl = await rateLimit(rlKey, 120, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let list;
  if (mine) {
    // Kendi incelemelerimde engel süzgeci gereksiz — hepsi benim.
    // offset AKTARILIYOR: aksi hâlde "Benimkiler" sonsuz kaydırmada aynı
    // ilk 20 kaydı tekrar tekrar döndürürdü.
    list = await listUserReviews(user.uid, { limit: 20, offset });
  } else {
    // getHiddenUids(null) boş küme dönüyor (social-store.js:389) — anonim
    // okuyucuda engel süzgeci doğal olarak devre dışı.
    const [rows, hidden] = await Promise.all([
      listRecentReviews({ limit: 20, offset }),
      getHiddenUids(user?.uid || null),
    ]);
    list = rows.filter((r) => !hidden.has(r.uid));
  }

  const [profiles, yanit] = await Promise.all([
    getProfiles(list.map((r) => r.uid)),
    countReplies(list.map((r) => reviewRef(r.appid, r.uid))),
  ]);

  return NextResponse.json({
    reviews: list.map((r) => {
      const p = profiles[r.uid];
      return {
        ...r,
        image: headerImage(r.appid),
        // Yanıtlar oyun sayfasında değil topluluk konusunda okunuyor; kart
        // yalnız SAYIYI taşıyor ve konuyu açan kapı oluyor.
        replyCount: yanit[reviewRef(r.appid, r.uid)] || 0,
        author: {
          uid: r.uid,
          username: p?.username || null,
          displayName: p?.displayName || p?.username || null,
          avatar: p?.avatar ?? null,
        },
      };
    }),
  });
}
