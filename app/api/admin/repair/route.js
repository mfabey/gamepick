import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import {
  isPrivilegedViewer,
  getProfile,
  mergeProfile,
  isBatutaAccount,
  isTestAccount,
  isDeveloperAccount,
  PRIVILEGED_UIDS,
  PRIVILEGED_EMAILS,
} from '../../../lib/social-store';
import { redisCmd, redisPipeline, redisSetJSON, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Developer Hesap Onarım & Teşhis Ucu
// SADECE 2 GELİŞTİRİCİ: @batuta ve @test
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

const BATUTA_UID = 'M05J6kGPeqPAkPG55Blg7dJlVsY2';
const TEST_UID = '5FimwbEHFQZ75FgL2PkgIY9OQV92';

async function checkAuth(request) {
  const caller = await verifyMobileToken(request);
  if (!caller?.uid) return null;

  const callerEmail = String(caller.email || '').toLowerCase().trim();
  const isDev =
    caller.isDeveloper === true ||
    (await isPrivilegedViewer(caller.uid)) ||
    isDeveloperAccount(caller) ||
    isDeveloperAccount(callerEmail) ||
    isDeveloperAccount(caller.uid) ||
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

  // 1. @batuta tersine indeksini kesin olarak batuhan'ın gerçek UID'sine sabitle
  await redisCmd(['SET', 'username:batuta', BATUTA_UID]);
  await redisCmd(['ZADD', 'username_index', '0', 'batuta']);
  results.healed.push(`username:batuta -> ${BATUTA_UID}`);

  // 2. @test tersine indeksini test kullanıcısının UID'sine sabitle
  await redisCmd(['SET', 'username:test', TEST_UID]);
  await redisCmd(['ZADD', 'username_index', '0', 'test']);
  results.healed.push(`username:test -> ${TEST_UID}`);

  // 3. Batuta profilini onar
  const batutaProf = await mergeProfile(BATUTA_UID, {
    username: 'batuta',
    usernameLower: 'batuta',
    displayName: 'batuhan',
    isDeveloper: true,
  });
  results.healed.push('user_profile:' + BATUTA_UID + ' -> @batuta');

  // 4. Test profilini onar
  await mergeProfile(TEST_UID, {
    username: 'test',
    usernameLower: 'test',
    displayName: 'Firstaccount',
    isDeveloper: true,
  });
  results.healed.push('user_profile:' + TEST_UID + ' -> @test');

  results.profile = caller.uid === BATUTA_UID ? batutaProf : await getProfile(caller.uid);

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
    // 1. Sadece 2 geliştirici var: @batuta ve @test
    await redisCmd(['SET', 'username:batuta', BATUTA_UID]);
    await redisCmd(['ZADD', 'username_index', '0', 'batuta']);
    await redisCmd(['SET', 'username:test', TEST_UID]);
    await redisCmd(['ZADD', 'username_index', '0', 'test']);

    await mergeProfile(BATUTA_UID, {
      username: 'batuta',
      usernameLower: 'batuta',
      displayName: 'batuhan',
      isDeveloper: true,
    });

    await mergeProfile(TEST_UID, {
      username: 'test',
      usernameLower: 'test',
      displayName: 'Firstaccount',
      isDeveloper: true,
    });

    results.details.push('Geliştirici indeksleri (@batuta ve @test) doğrulandı.');

    // 2. Tüm user_profile:* kayıtlarını tara, başka hesaplardaki hatalı developer/batuta etiketlerini temizle
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

      for (let idx = 0; idx < profileKeys.length; idx++) {
        const key = profileKeys[idx];
        const uid = key.replace(/^user_profile:/, '');
        const prof = parseJSON(rawProfiles?.[idx]);
        if (!prof) continue;

        // Geliştirici UID'si olmayan hesaplarda düzeltme yap
        if (!isDeveloperAccount(uid)) {
          let dirty = false;
          if (prof.isDeveloper) {
            prof.isDeveloper = false;
            dirty = true;
          }
          const un = String(prof.username || '').replace(/^@/, '').toLowerCase().trim();
          if (un === 'batuta' || un === 'test') {
            prof.username = null;
            prof.usernameLower = null;
            dirty = true;
          }
          if (dirty) {
            await redisSetJSON(key, prof);
            results.details.push(`${uid} profili düzeltildi (Geliştirici yetkisi / batuta nicki kaldırıldı).`);
          }
        }

        if (prof.username && !isDeveloperAccount(uid)) {
          const cleanName = String(prof.username).replace(/^@/, '').trim().toLowerCase();
          if (cleanName && cleanName !== 'batuta' && cleanName !== 'test') {
            syncCommands.push(['SET', `username:${cleanName}`, uid]);
            syncCommands.push(['ZADD', 'username_index', '0', cleanName]);
            results.repairedCount++;
          }
        }
      }

      if (syncCommands.length > 0) {
        await redisPipeline(syncCommands);
        results.details.push(`${results.repairedCount} kullanıcının tersine dizin kaydı güncellendi.`);
      }
    }
  } else if (action === 'repair_user' && targetUid) {
    const prof = await getProfile(targetUid);
    if (!prof) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    if (targetUid === BATUTA_UID) {
      await redisCmd(['SET', 'username:batuta', BATUTA_UID]);
      await redisCmd(['ZADD', 'username_index', '0', 'batuta']);
      results.repairedCount = 1;
      results.details.push('@batuta -> ' + BATUTA_UID + ' eşlemesi başarıyla onarıldı.');
    } else if (targetUid === TEST_UID) {
      await redisCmd(['SET', 'username:test', TEST_UID]);
      await redisCmd(['ZADD', 'username_index', '0', 'test']);
      results.repairedCount = 1;
      results.details.push('@test -> ' + TEST_UID + ' eşlemesi başarıyla onarıldı.');
    } else if (prof.username) {
      const cleanName = String(prof.username).replace(/^@/, '').trim().toLowerCase();
      if (cleanName !== 'batuta' && cleanName !== 'test') {
        await redisCmd(['SET', `username:${cleanName}`, targetUid]);
        await redisCmd(['ZADD', 'username_index', '0', cleanName]);
        results.repairedCount = 1;
        results.details.push(`@${cleanName} -> ${targetUid} eşlemesi başarıyla onarıldı.`);
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
