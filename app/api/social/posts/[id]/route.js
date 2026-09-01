import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../../lib/social-store';
import { getPostWithCounts, listReplies, parseReviewRef, countReplies } from '../../../../lib/post-store';
import { getReview } from '../../../../lib/review-store';
import { getSteamDetailsCached } from '../../../../lib/steam-cache.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tek gönderi + yanıtları (konuşma görünümü).
//
// Akıştaki liste ucuyla AYNI kural: okuma hesapsız, yazma değil. Yanıt yazmak
// aynı POST /api/social/posts ucundan geçiyor (`replyTo` dolu) — yanıt da bir
// gönderi olduğu için ayrı yazma yolu yok.
// ─────────────────────────────────────────────────────────────────────────────

function shape(post, profiles) {
  const p = profiles[post.uid];
  return {
    ...post,
    author: {
      uid: post.uid,
      username: p?.username || null,
      displayName: p?.displayName || p?.username || null,
      avatar: p?.avatar || null,
    },
  };
}

export async function GET(request, { params }) {
  const user = await verifyMobileToken(request);
  const viewerUid = user?.uid || null;

  const key = viewerUid
    ? `rl:postview:${viewerUid}`
    : `rl:postview:ip:${(request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()}`;
  const rl = await rateLimit(key, 240, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { id } = await params;
  const kimlik = String(id || '');

  // ── İNCELEME KÖKÜ ──
  // `r:{appid}:{uid}` bir gönderi değil, bir inceleme. Konu görünümü onu da
  // kök olarak çizebiliyor çünkü incelemeye yazılan yanıtlar OYUN SAYFASINDA
  // GÖRÜNMÜYOR — okundukları tek yer burası.
  //
  // AYRI BİR UÇ AÇILMADI: istemcinin elinde tek bir "konuyu aç" eylemi var ve
  // kökün türüne göre farklı uca gitmek zorunda kalsaydı, o karar iki yerde
  // (oyun sayfası ve akış) tekrar edilirdi.
  const rev = parseReviewRef(kimlik);
  const hidden = await getHiddenUids(viewerUid);

  let root;
  if (rev) {
    const review = await getReview(rev.appid, rev.uid);
    if (!review) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (hidden.has(review.uid)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    // Kapak: gerçek adres önbellekten okunuyor, elle kurulan yol yalnız yedek
    // (Steam varlık yolları hash'li — bkz. scripts/check-image-urls.mjs).
    const [sayim, detay] = await Promise.all([
      countReplies([kimlik]),
      getSteamDetailsCached(review.appid).catch(() => null),
    ]);
    root = {
      image: detay?.header_image || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${review.appid}/header.jpg`,
      // `type` İSTEMCİ İÇİN: kök inceleme ise farklı bir kart çiziliyor
      // (kapak + doğrulanmış saat + öneri durumu). Gönderi kökünde bu alan
      // hiç gelmiyor, yani eski istemciler etkilenmiyor.
      type: 'review',
      id: kimlik,
      uid: review.uid,
      appid: review.appid,
      gameName: review.gameName,
      text: review.text,
      hours: review.hours,
      recommended: review.recommended,
      at: review.at,
      replyCount: sayim[kimlik] || 0,
      isMine: !!viewerUid && review.uid === viewerUid,
    };
  } else {
    root = await getPostWithCounts(kimlik, viewerUid);
    if (!root) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (hidden.has(root.uid)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const replies = await listReplies(root.id, { viewerUid });
  const visible = replies.filter((r) => !hidden.has(r.uid));
  const profiles = await getProfiles([root.uid, ...visible.map((r) => r.uid)]);

  return NextResponse.json({
    post: shape(root, profiles),
    replies: visible.map((r) => shape(r, profiles)),
  });
}
