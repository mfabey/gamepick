import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { recordActivity, getFriendActivity } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Aktivite akışı — "Ahmet bugün X'i favorilerine ekledi" türü.
//
// GET        → arkadaşlarımın akışı (okuma anında toplama)
// POST {..}  → kendi aktivitemi kaydet (ateşle-unut)
//
// Gizlilik: shareActivity kapalıysa POST hiçbir şey yazmaz (social-store).
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TYPES = ['wishlist', 'collection', 'like', 'finished'];

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(80, Math.max(1, parseInt(searchParams.get('limit') || '40', 10)));

  const items = await getFriendActivity(user.uid, limit);
  return NextResponse.json({ items });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // Ateşle-unut çağrıldığı için sınır bol ama sonsuz değil
  const rl = await rateLimit(`rl:activity:${user.uid}`, 200, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  if (!VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'INVALID_TYPE' }, { status: 400 });
  }
  if (!body.gameId) {
    return NextResponse.json({ error: 'GAME_REQUIRED' }, { status: 400 });
  }

  const res = await recordActivity(user.uid, body);
  return NextResponse.json({ ok: true, skipped: !!res.skipped });
}
