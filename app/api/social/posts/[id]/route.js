import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../../lib/social-store';
import { getPostWithCounts, listReplies } from '../../../../lib/post-store';

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
  const root = await getPostWithCounts(String(id || ''), viewerUid);
  if (!root) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const hidden = await getHiddenUids(viewerUid);
  if (hidden.has(root.uid)) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const replies = await listReplies(root.id, { viewerUid });
  const visible = replies.filter((r) => !hidden.has(r.uid));
  const profiles = await getProfiles([root.uid, ...visible.map((r) => r.uid)]);

  return NextResponse.json({
    post: shape(root, profiles),
    replies: visible.map((r) => shape(r, profiles)),
  });
}
