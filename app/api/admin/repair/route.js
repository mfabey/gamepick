import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { isPrivilegedViewer, getProfile, mergeProfile, uidForUsername, claimUsername, isBatutaAccount } from '../../../lib/social-store';
import { redisCmd, redisGetJSON, redisPipeline, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Developer Hesap Onarım & Teşhis Ucu
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const caller = await verifyMobileToken(request);
  if (!caller?.uid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const isDev = (await isPrivilegedViewer(caller.uid)) || isBatutaAccount(caller);
  if (!isDev) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const results = {
    callerUid: caller.uid,
    callerEmail: caller.email,
    healed: [],
    profile: null,
  };

  // 1. @batuta profilini onar
  const batutaOwner = await redisCmd(['GET', 'username:batuta']);
  if (!batutaOwner || batutaOwner !== caller.uid) {
    await redisCmd(['SET', 'username:batuta', caller.uid]);
    await redisCmd(['ZADD', 'username_index', '0', 'batuta']);
    results.healed.push('username:batuta -> ' + caller.uid);
  }

  const existingProfile = await getProfile(caller.uid);
  if (!existingProfile?.username || existingProfile.username.toLowerCase() !== 'batuta') {
    const updated = await mergeProfile(caller.uid, {
      username: 'batuta',
      usernameLower: 'batuta',
      displayName: existingProfile?.displayName || 'Batuta',
    });
    results.healed.push('user_profile:' + caller.uid + ' updated to @batuta');
    results.profile = updated;
  } else {
    results.profile = existingProfile;
  }

  return NextResponse.json({ ok: true, results });
}
