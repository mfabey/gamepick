import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import {
  getFriendState, getProfiles,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  cancelFriendRequest, removeFriend,
} from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Arkadaşlık.
//
// GET                        → arkadaşlarım + gelen/giden istekler (profilleriyle)
// POST { targetUid, action } → request | accept | reject | cancel | remove
// ─────────────────────────────────────────────────────────────────────────────

const ACTIONS = {
  request: sendFriendRequest,
  accept: acceptFriendRequest,
  reject: rejectFriendRequest,
  cancel: cancelFriendRequest,
  remove: removeFriend,
};

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

function shape(uids, profiles) {
  return uids.map((uid) => ({
    uid,
    username: profiles[uid]?.username || null,
    displayName: profiles[uid]?.displayName || profiles[uid]?.username || null,
  }));
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const { friends, incoming, outgoing } = await getFriendState(user.uid);
  const profiles = await getProfiles([...friends, ...incoming, ...outgoing]);

  return NextResponse.json({
    friends: shape(friends, profiles),
    incoming: shape(incoming, profiles),
    outgoing: shape(outgoing, profiles),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // İstek spam'ini engelle
  const rl = await rateLimit(`rl:friend:${user.uid}`, 100, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const targetUid = String(body.targetUid || '').trim();
  const action = String(body.action || '').trim();

  if (!targetUid) return NextResponse.json({ error: 'TARGET_REQUIRED' }, { status: 400 });
  if (!ACTIONS[action]) return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  if (targetUid === user.uid) return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });

  const res = await ACTIONS[action](user.uid, targetUid);
  if (!res?.ok) {
    return NextResponse.json({ error: res?.error || 'FAILED' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, status: res.status, targetUid });
}
