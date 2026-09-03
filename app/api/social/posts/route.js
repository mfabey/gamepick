import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { validateFreeText } from '../../../lib/content-filter';
import { getProfiles, getHiddenUids, getFriends } from '../../../lib/social-store';
import { createPost, deletePost, listFeed, listFriendFeed, toggleLike } from '../../../lib/post-store';
import { clientIp as clientKey } from '../../../lib/client-ip';

// ─────────────────────────────────────────────────────────────────────────────
// Tartışma akışı.
//
// GET  → genel akış (HESAPSIZ okunabilir, incelemelerle aynı kural)
// POST → { action: 'create' | 'delete' | 'like' }  — hepsi oturum ister
//
// OKUMA AÇIK, YAZMA KAPALI: okumak kayıt gerektirmiyor ve kayıt arkasına almak
// App Store Guideline 5.1.1(v) itirazına açık kapı (bkz. reviews/feed).
// ─────────────────────────────────────────────────────────────────────────────

const MAX_POST_LEN = 500;

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

export async function GET(request) {
  const user = await verifyMobileToken(request);
  const viewerUid = user?.uid || null;

  const rl = await rateLimit(
    viewerUid ? `rl:postfeed:${viewerUid}` : `rl:postfeed:ip:${clientKey(request)}`,
    120, 3600
  );
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
  // İKİ AKIŞ SEKMESİ: "Keşfet" (herkes) ve "Arkadaşlar". Üçüncü sekme
  // ("benimkiler") KALKTI — kullanıcının kendi gönderileri artık profilinin
  // dördüncü sekmesinde ve aynı listeyi iki yerde tutmak, hangisinin güncel
  // olduğunu belirsizleştiriyordu.
  const arkadaslar = searchParams.get('scope') === 'friends';

  // Arkadaş akışı oturumsuz ANLAMSIZ; 401 yerine BOŞ dönüyor: hesapsız
  // kullanıcı sekmeyi görüp dokunabilmeli ve karşısına hata değil, davet
  // çıkmalı (istemci boş durumda kayıt ekranına götürüyor).
  if (arkadaslar && !viewerUid) return NextResponse.json({ posts: [] });

  const [rows, hidden] = await Promise.all([
    arkadaslar
      ? getFriends(viewerUid).then((uids) => listFriendFeed(uids, { offset, viewerUid }))
      : listFeed({ offset, viewerUid }),
    // getHiddenUids(null) boş küme döner — anonim okuyucuda engel süzgeci yok.
    getHiddenUids(viewerUid),
  ]);
  const posts = rows.filter((p) => !hidden.has(p.uid));
  const profiles = await getProfiles(posts.map((p) => p.uid));

  return NextResponse.json({ posts: posts.map((p) => shape(p, profiles)) });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const action = String(body.action || 'create');

  if (action === 'like') {
    const rl = await rateLimit(`rl:postlike:${user.uid}`, 300, 3600);
    if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

    const r = await toggleLike(String(body.id || ''), user.uid);
    if (!r) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json(r);
  }

  if (action === 'delete') {
    const okDel = await deletePost(String(body.id || ''), user.uid);
    if (!okDel) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // ── Oluştur ───────────────────────────────────────────────────────────────
  // Yazma sınırı okumadan çok daha dar: akışı kirletmek okumaktan ucuz.
  const rl = await rateLimit(`rl:postnew:${user.uid}`, 30, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  // validateFreeText yalnız { ok, error } dönüyor, temizlenmiş metin
  // döndürmüyor — kırpmayı burada yapıyoruz.
  const text = String(body.text || '').trim();
  const check = validateFreeText(text, { maxLength: MAX_POST_LEN });
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const post = await createPost({
    uid: user.uid,
    text,
    game: body.game || null,
    replyTo: body.replyTo ? String(body.replyTo) : null,
  });
  // createPost yalnızca hedef gönderi yoksa null döner (silinmiş bir şeye yanıt).
  if (!post) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const profiles = await getProfiles([user.uid]);
  return NextResponse.json({ post: shape({ ...post, likeCount: 0, replyCount: 0, likedByMe: false, isMine: true }, profiles) });
}
