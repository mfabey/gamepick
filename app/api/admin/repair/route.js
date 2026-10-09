import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { readValue } from '../../../lib/session-cookie';
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
import { adminAuthGuvenli } from '../../../lib/admin-tembel';
import { redisCmd, redisGetJSON, redisPipeline, redisSetJSON, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Developer Hesap Onarım & Teşhis Ucu
// SADECE 2 GELİŞTİRİCİ: @batuta ve @test
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

const BATUTA_UID = 'M05J6kGPeqPAkPG55Blg7dJlVsY2';
const TEST_UID = '5FimwbEHFQZ75FgL2PkgIY9OQV92';

async function checkAuth(request) {
  let caller = await verifyMobileToken(request);

  if (!caller?.uid) {
    try {
      const cookieStore = await cookies();
      const session = cookieStore.get('gp_user_session');
      if (session?.value) {
        const u = await readValue(session.value);
        if (u?.uid) caller = u;
      }
      if (!caller?.uid) {
        const steamSession = cookieStore.get('gp_steam_session') || cookieStore.get('gp_steam_accounts');
        if (steamSession?.value) {
          const su = await readValue(steamSession.value);
          const steamAccount = Array.isArray(su) ? su[0] : su;
          const sid = steamAccount?.steamId;
          if (sid) {
            let uid = await redisCmd(['GET', `steam_to_uid:${sid}`]);
            if (!uid) {
              const keys = await redisCmd(['KEYS', 'user_connections:*']);
              if (keys && keys.length > 0) {
                for (const key of keys) {
                  const conn = await redisGetJSON(key);
                  const accounts = conn?.steamAccounts || (conn?.steam ? [conn.steam] : []);
                  if (accounts.some(a => a?.steamId === sid)) {
                    uid = key.replace('user_connections:', '');
                    await redisCmd(['SET', `steam_to_uid:${sid}`, uid]);
                    break;
                  }
                }
              }
            }
            if (uid) {
              const cached = await redisGetJSON(`user_profile:${uid}`);
              if (cached) caller = cached;
              else caller = { uid, username: isDeveloperAccount(uid) ? (isBatutaAccount(uid) ? 'batuta' : 'test') : null };
            }
          }
        }
      }
    } catch {}
  }

  if (!caller?.uid) return null;

  const callerEmail = String(caller.email || '').toLowerCase().trim();
  const callerUsername = String(caller.username || caller.usernameLower || '').replace(/^@/, '').toLowerCase().trim();
  const isDev = Boolean(
    caller.isDeveloper === true ||
    ['batuta', 'test', 'test8'].includes(callerUsername) ||
    (await isPrivilegedViewer(caller.uid)) ||
    (await isPrivilegedViewer(caller)) ||
    isDeveloperAccount(caller) ||
    isDeveloperAccount(callerEmail) ||
    isDeveloperAccount(caller.uid) ||
    isDeveloperAccount(callerUsername) ||
    PRIVILEGED_UIDS.has(caller.uid) ||
    PRIVILEGED_EMAILS.has(callerEmail)
  );

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

  // 4. Test profillerini onar
  await mergeProfile(TEST_UID, {
    username: 'test',
    usernameLower: 'test',
    displayName: 'Firstaccount',
    isDeveloper: true,
  });
  results.healed.push('user_profile:' + TEST_UID + ' -> @test');

  const OTHER_TEST_UIDS = [
    'sBttZ4vTrvT78Md719Gm7pP0Z8z2',
    'sF0LvMh3cdMhEgd4EIvPuTp6Hd72',
    'gWvyliuy2BTyW8Op8bDjr0srSJE3',
    'baiGoZo4qBe7WYZzIHBAnyaI3FB2',
  ];
  for (const tuid of OTHER_TEST_UIDS) {
    try {
      const tp = await redisGetJSON(`user_profile:${tuid}`);
      if (tp) {
        let dirty = false;
        if (tp.isDeveloper) {
          tp.isDeveloper = false;
          dirty = true;
        }
        const tun = String(tp.username || '').replace(/^@/, '').toLowerCase().trim();
        if (tun === 'test' || tun === 'batuta') {
          tp.username = null;
          tp.usernameLower = null;
          dirty = true;
        }
        if (dirty) {
          await redisSetJSON(`user_profile:${tuid}`, tp);
          results.healed.push('user_profile:' + tuid + ' -> temizlendi (isDeveloper: false)');
        }
      }
    } catch {}
  }

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
  } else if (action === 'delete_user' && targetUid) {
    if (
      isDeveloperAccount(targetUid) ||
      isBatutaAccount(targetUid) ||
      isTestAccount(targetUid) ||
      PRIVILEGED_UIDS.has(targetUid)
    ) {
      return NextResponse.json({ error: 'Geliştirici hesapları (@batuta ve @test) silinemez!' }, { status: 403 });
    }

    const prof = await getProfile(targetUid);
    if (prof) {
      const tEmail = String(prof.email || '').toLowerCase().trim();
      const tUsername = String(prof.username || prof.usernameLower || '').replace(/^@/, '').toLowerCase().trim();
      if (
        isDeveloperAccount(prof) ||
        isBatutaAccount(prof) ||
        isTestAccount(prof) ||
        ['batuta', 'test', 'test8'].includes(tUsername) ||
        PRIVILEGED_EMAILS.has(tEmail)
      ) {
        return NextResponse.json({ error: 'Geliştirici hesapları (@batuta ve @test) silinemez!' }, { status: 403 });
      }
    }

    let fbDeleted = false;
    try {
      const admin = await adminAuthGuvenli();
      if (admin) {
        await admin.deleteUser(targetUid);
        fbDeleted = true;
      }
    } catch (fbErr) {
      console.warn('[Admin repair delete_user] Firebase deleteUser:', fbErr?.message || fbErr);
    }

    if (prof?.username) {
      const clean = prof.username.replace(/^@/, '').toLowerCase().trim();
      if (!['batuta', 'test', 'test8'].includes(clean)) {
        await redisCmd(['DEL', `username:${clean}`]);
        await redisCmd(['ZREM', 'username_index', clean]);
      }
    }

    const connections = await redisGetJSON(`user_connections:${targetUid}`);
    if (connections) {
      const steamAccounts = connections.steamAccounts || (connections.steam ? [connections.steam] : []);
      for (const acc of steamAccounts) {
        if (acc?.steamId) {
          await redisCmd(['DEL', `steam_to_uid:${acc.steamId}`]);
        }
      }
      if (connections.xbox?.gamertag) {
        await redisCmd(['DEL', `xbox_to_uid:${connections.xbox.gamertag}`]);
      }
    }

    await redisCmd(['DEL', `user_profile:${targetUid}`]);
    await redisCmd(['DEL', `user_connections:${targetUid}`]);
    await redisCmd(['DEL', `user_blocks:${targetUid}`]);
    await redisCmd(['DEL', `user_blocked_by:${targetUid}`]);
    await redisCmd(['DEL', `friends:${targetUid}`]);
    await redisCmd(['DEL', `friend_req_in:${targetUid}`]);
    await redisCmd(['DEL', `friend_req_out:${targetUid}`]);
    await redisCmd(['DEL', `user_activity:${targetUid}`]);
    await redisCmd(['DEL', `user_privacy:${targetUid}`]);
    await redisCmd(['DEL', `web_tastes:${targetUid}`]);

    results.repairedCount = 1;
    results.details.push(`Kullanıcı (${targetUid}) silindi.`);
  }

  return NextResponse.json({ ok: true, results });
}
