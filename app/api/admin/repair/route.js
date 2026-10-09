import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import {
  isPrivilegedViewer,
  getProfile,
  mergeProfile,
  isBatutaAccount,
  PRIVILEGED_UIDS,
  PRIVILEGED_EMAILS,
} from '../../../lib/social-store';
import { redisCmd, redisPipeline, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Developer Hesap Onarım & Teşhis Ucu
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

async function checkAuth(request) {
  const caller = await verifyMobileToken(request);
  if (!caller?.uid) return null;

  const callerEmail = String(caller.email || '').toLowerCase().trim();
  const isDev =
    (await isPrivilegedViewer(caller.uid)) ||
    isBatutaAccount(caller) ||
    isBatutaAccount(callerEmail) ||
    isBatutaAccount(caller.uid) ||
    PRIVILEGED_UIDS.has(caller.uid) ||
    PRIVILEGED_EMAILS.has(callerEmail);

  if (!isDev) return null;
  return caller;
}

export async function GET(request) {
  const caller = await checkAuth(request);
  if (!caller) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const results = {
    callerUid: caller.uid,
    callerEmail: caller.email,
    healed: [],
    profile: null,
  };

  // 1. @batuta profilini ve tersine indeksini onar
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
      isDeveloper: true,
    });
    results.healed.push('user_profile:' + caller.uid + ' updated to @batuta');
    results.profile = updated;
  } else {
    results.profile = existingProfile;
  }

  return NextResponse.json({ ok: true, results });
}

export async function POST(request) {
  const caller = await checkAuth(request);
  if (!caller) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    /* empty body */
  }

  const { action = 'global_sync', targetUid } = body;
  const results = {
    action,
    repairedCount: 0,
    details: [],
  };

  if (action === 'global_sync') {
    // 1. @batuta tersine indeksini sabitle
    await redisCmd(['SET', 'username:batuta', caller.uid]);
    await redisCmd(['ZADD', 'username_index', '0', 'batuta']);
    results.details.push('Geliştirici (@batuta) indeksi doğrulandı.');

    // 2. Tüm user_profile:* kayıtlarını tara ve username_index ile senkronize et
    let cursor = '0';
    const profileKeys = [];
    do {
      const scanRes = await redisCmd(['SCAN', cursor, 'MATCH', 'user_profile:*', 'COUNT', 250]);
      if (!scanRes || !Array.isArray(scanRes)) break;
      cursor = scanRes[0];
      const keys = scanRes[1] || [];
      profileKeys.push(...keys);
    } while (cursor !== '0' && profileKeys.length < 5000);

    if (profileKeys.length > 0) {
      const rawProfiles = await redisPipeline(profileKeys.map(k => ['GET', k]));
      const syncCommands = [];

      profileKeys.forEach((key, idx) => {
        const uid = key.replace(/^user_profile:/, '');
        const prof = parseJSON(rawProfiles?.[idx]);
        if (!prof || !prof.username) return;

        const cleanName = String(prof.username).replace(/^@/, '').trim().toLowerCase();
        if (cleanName) {
          syncCommands.push(['SET', `username:${cleanName}`, uid]);
          syncCommands.push(['ZADD', 'username_index', '0', cleanName]);
          results.repairedCount++;
        }
      });

      if (syncCommands.length > 0) {
        await redisPipeline(syncCommands);
        results.details.push(`${results.repairedCount} kullanıcının tersine dizin kaydı güncellendi.`);
      }
    }
  } else if (action === 'repair_user' && targetUid) {
    // Belirli bir kullanıcının profil ve indeksini onar
    const prof = await getProfile(targetUid);
    if (!prof) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    if (prof.username) {
      const cleanName = String(prof.username).replace(/^@/, '').trim().toLowerCase();
      await redisCmd(['SET', `username:${cleanName}`, targetUid]);
      await redisCmd(['ZADD', 'username_index', '0', cleanName]);
      results.repairedCount = 1;
      results.details.push(`@${cleanName} -> ${targetUid} eşlemesi başarıyla onarıldı.`);
    } else {
      results.details.push('Kullanıcının henüz belirlenmiş bir kullanıcı adı bulunmuyor.');
    }
  }

  return NextResponse.json({ ok: true, results });
}
