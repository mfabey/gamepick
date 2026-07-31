import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { blockUser, unblockUser, getBlocked, getProfiles } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı engelleme — App Store Guideline 1.2'nin üçüncü şartı
// ("kötüye kullanan kullanıcıları engelleme yeteneği").
//
// GET                        → engellediklerim (profilleriyle)
// POST { targetUid, action } → 'block' | 'unblock'
//
// Engelleme ÇİFT YÖNLÜ görünürlük kesintisi yaratır (social-store).
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const uids = await getBlocked(user.uid);
  const profiles = await getProfiles(uids);

  return NextResponse.json({
    blocked: uids.map((uid) => ({
      uid,
      username: profiles[uid]?.username || null,
      displayName: profiles[uid]?.displayName || null,
    })),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const rl = await rateLimit(`rl:block:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const targetUid = String(body.targetUid || '').trim();
  const action = body.action === 'unblock' ? 'unblock' : 'block';

  if (!targetUid) return NextResponse.json({ error: 'TARGET_REQUIRED' }, { status: 400 });
  if (targetUid === user.uid) return NextResponse.json({ error: 'CANNOT_BLOCK_SELF' }, { status: 400 });

  const ok = action === 'block'
    ? await blockUser(user.uid, targetUid)
    : await unblockUser(user.uid, targetUid);

  if (!ok) return NextResponse.json({ error: 'FAILED' }, { status: 500 });

  return NextResponse.json({ ok: true, action, targetUid });
}
