import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../../lib/social-store';
import { listRecentReviews, listUserReviews } from '../../../../lib/review-store';

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

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:revfeed:${user.uid}`, 120, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine') === '1';
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  let list;
  if (mine) {
    // Kendi incelemelerimde engel süzgeci gereksiz — hepsi benim.
    list = await listUserReviews(user.uid, { limit: 20 });
  } else {
    const [rows, hidden] = await Promise.all([
      listRecentReviews({ limit: 20, offset }),
      getHiddenUids(user.uid),
    ]);
    list = rows.filter((r) => !hidden.has(r.uid));
  }

  const profiles = await getProfiles(list.map((r) => r.uid));

  return NextResponse.json({
    reviews: list.map((r) => {
      const p = profiles[r.uid];
      return {
        ...r,
        image: headerImage(r.appid),
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
