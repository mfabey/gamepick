import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../lib/social-store';
import { listNotifs, markRead } from '../../../lib/notif-store';

// ─────────────────────────────────────────────────────────────────────────────
// Bildirim merkezi (mobil G-20).
//
// GET  → { items, unread }          ?count=1 → yalnız { unread } (rozet)
// POST → { action: 'read', ids? }   ids yoksa TÜMÜ okundu
//
// Kimlik ŞART: liste kişiye özel; uid jetondan, istekten değil.
// Engellenen kullanıcıların bildirimleri gösterilmiyor (kayıt silinmiyor:
// engel kalkınca geçmiş geri gelsin).
// ─────────────────────────────────────────────────────────────────────────────

function shapeActor(uid, profiles) {
  const p = profiles[uid];
  return {
    uid,
    username: p?.username || null,
    displayName: p?.displayName || p?.username || null,
    avatar: p?.avatar || null,
  };
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:notif:${user.uid}`, 600, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const [{ items, unread }, hidden] = await Promise.all([listNotifs(user.uid), getHiddenUids(user.uid)]);
  const gorunen = items
    .map((it) => ({ ...it, actors: (it.actors || []).filter((a) => !hidden.has(a)) }))
    // Aktörü olan türde tüm aktörler engelliyse satır düşer.
    .filter((it) => !['friend_request', 'friend_accept', 'post_reply', 'post_like'].includes(it.type) || it.actors.length > 0);
  const okunmamis = gorunen.filter((it) => !it.read).length;
  if (searchParams.get('count') === '1') return NextResponse.json({ unread: okunmamis });

  const profiles = await getProfiles([...new Set(gorunen.flatMap((it) => it.actors))]);
  return NextResponse.json({
    unread: okunmamis,
    items: gorunen.map((it) => ({ ...it, actors: it.actors.map((a) => shapeActor(a, profiles)) })),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:notifw:${user.uid}`, 300, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  if (String(body.action || 'read') !== 'read') return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });

  await markRead(user.uid, Array.isArray(body.ids) ? body.ids : null);
  return NextResponse.json({ ok: true });
}
