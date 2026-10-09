import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { readValue } from '../../../lib/session-cookie';
import { isPrivilegedViewer, isBatutaAccount, isTestAccount, isDeveloperAccount, PRIVILEGED_UIDS, PRIVILEGED_EMAILS } from '../../../lib/social-store';
import { adminAuthGuvenli } from '../../../lib/admin-tembel';
import { redisCmd, redisGetJSON, redisPipeline, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// GELİŞTİRİCİ / YÖNETİCİ PANELİ: TÜM KULLANICILARI & VERİLERİ LİSTELEME
//
// Firebase Auth + Redis user_profile + user_connections + username_index
// ve sosyal / kütüphane istatistiklerini (koleksiyon, istek listesi, incelemeler,
// gönderiler, arkadaşlar) tek noktada birleştirerek eksiksiz döndürür.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. Kimlik ve yetki doğrulaması
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

  if (!caller?.uid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

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

  if (!isDev) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const usersMap = new Map();

  const firebaseDiagnostic = {
    status: 'idle',
    fetchedCount: 0,
    projectId: null,
    clientEmail: null,
    error: null,
  };

  // 2. Firebase Admin SDK üzerinden tüm Firebase kullanıcılarını çek (varsa)
  try {
    const admin = await adminAuthGuvenli();
    let credsMeta = null;
    try {
      const fbAdminMod = await import('../../../lib/firebase-admin');
      credsMeta = fbAdminMod.getServiceAccountInfo?.();
      if (credsMeta?.creds) {
        firebaseDiagnostic.projectId = credsMeta.creds.projectId;
        firebaseDiagnostic.clientEmail = credsMeta.creds.clientEmail;
      }
    } catch {}

    if (admin) {
      let pageToken = undefined;
      do {
        const list = await admin.listUsers(1000, pageToken);
        const usersBatch = list.users || [];
        firebaseDiagnostic.status = 'connected';
        firebaseDiagnostic.fetchedCount += usersBatch.length;

        for (const fbUser of usersBatch) {
          usersMap.set(fbUser.uid, {
            uid: fbUser.uid,
            email: fbUser.email || '',
            emailVerified: !!fbUser.emailVerified,
            displayName: fbUser.displayName || '',
            photoURL: fbUser.photoURL || '',
            disabled: !!fbUser.disabled,
            createdAt: fbUser.metadata?.creationTime || null,
            lastSignInTime: fbUser.metadata?.lastSignInTime || null,
            providers: (fbUser.providerData || []).map(p => p.providerId),
            username: null,
            usernameLower: null,
            bio: '',
            steamAccounts: [],
            xbox: null,
            stats: {
              collections: 0,
              collectionGames: 0,
              wishlist: 0,
              reviews: 0,
              posts: 0,
              friends: 0,
            },
          });
        }
        pageToken = list.pageToken;
      } while (pageToken && usersMap.size < 10000);
    } else {
      firebaseDiagnostic.status = 'no_credentials';
      firebaseDiagnostic.error = credsMeta?.error || 'Firebase Admin yapılandırılmamış veya credentials bulunamadı.';
    }
  } catch (err) {
    firebaseDiagnostic.status = 'error';
    firebaseDiagnostic.error = err?.message || String(err);
    console.error('[Admin users] Firebase listUsers hatası:', err?.message || err);
  }

  // 3. Redis'teki user_profile:* kayıtlarını tara ve birleştir
  try {
    let cursor = '0';
    const profileKeys = [];
    do {
      const scanRes = await redisCmd(['SCAN', cursor, 'MATCH', 'user_profile:*', 'COUNT', 250]);
      if (!scanRes || !Array.isArray(scanRes)) break;
      cursor = scanRes[0];
      const keys = scanRes[1] || [];
      profileKeys.push(...keys);
    } while (cursor !== '0' && profileKeys.length < 10000);

    if (profileKeys.length > 0) {
      const rawProfiles = await redisPipeline(profileKeys.map(k => ['GET', k]));
      profileKeys.forEach((key, idx) => {
        const uid = key.replace(/^user_profile:/, '');
        const profile = parseJSON(rawProfiles?.[idx]);
        if (!profile) return;

        const existing = usersMap.get(uid) || {
          uid,
          email: profile.email || '',
          emailVerified: !!profile.emailVerified,
          displayName: profile.displayName || profile.name || '',
          photoURL: profile.avatar || profile.photoURL || '',
          disabled: false,
          createdAt: profile.createdAt || null,
          lastSignInTime: profile.lastActive || profile.updatedAt || null,
          providers: [],
          username: null,
          usernameLower: null,
          bio: '',
          steamAccounts: [],
          xbox: null,
          stats: {
            collections: 0,
            collectionGames: 0,
            wishlist: 0,
            reviews: 0,
            posts: 0,
            friends: 0,
          },
        };

        if (profile.username) {
          existing.username = String(profile.username).replace(/^@/, '').trim();
          existing.usernameLower = existing.username.toLowerCase();
        }
        if (profile.displayName && !existing.displayName) {
          existing.displayName = profile.displayName;
        }
        if (profile.email && !existing.email) {
          existing.email = profile.email;
        }
        if (profile.bio) {
          existing.bio = profile.bio;
        }
        if (profile.avatar && !existing.photoURL) {
          existing.photoURL = profile.avatar;
        }
        if (profile.createdAt && !existing.createdAt) {
          existing.createdAt = profile.createdAt;
        }
        if (profile.updatedAt && !existing.lastSignInTime) {
          existing.lastSignInTime = profile.updatedAt;
        }

        usersMap.set(uid, existing);
      });
    }
  } catch (err) {
    console.error('[Admin users] Redis profil tarama hatası:', err?.message || err);
  }

  // 4. Redis'teki user_connections:* kayıtlarını tara (profil oluşturmamış kullanıcılar da yakalansın)
  try {
    let connCursor = '0';
    const connScanKeys = [];
    do {
      const scanRes = await redisCmd(['SCAN', connCursor, 'MATCH', 'user_connections:*', 'COUNT', 250]);
      if (!scanRes || !Array.isArray(scanRes)) break;
      connCursor = scanRes[0];
      const keys = scanRes[1] || [];
      connScanKeys.push(...keys);
    } while (connCursor !== '0' && connScanKeys.length < 10000);

    for (const cKey of connScanKeys) {
      const uid = cKey.replace(/^user_connections:/, '');
      if (uid && !usersMap.has(uid)) {
        usersMap.set(uid, {
          uid,
          email: '',
          emailVerified: false,
          displayName: '',
          photoURL: '',
          disabled: false,
          createdAt: null,
          lastSignInTime: null,
          providers: [],
          username: null,
          usernameLower: null,
          bio: '',
          steamAccounts: [],
          xbox: null,
          stats: {
            collections: 0,
            collectionGames: 0,
            wishlist: 0,
            reviews: 0,
            posts: 0,
            friends: 0,
          },
        });
      }
    }
  } catch (err) {
    console.error('[Admin users] Redis connections scan hatası:', err?.message || err);
  }

  // 5. username_index ZSET üzerinden eşleme tamamla
  try {
    const allIndexedNames = await redisCmd(['ZRANGE', 'username_index', '0', '-1']);
    if (Array.isArray(allIndexedNames) && allIndexedNames.length > 0) {
      const namePipes = await redisPipeline(allIndexedNames.map(n => ['GET', `username:${n}`]));
      allIndexedNames.forEach((name, idx) => {
        const uid = namePipes?.[idx];
        if (uid && typeof uid === 'string') {
          if (!usersMap.has(uid)) {
            usersMap.set(uid, {
              uid,
              email: '',
              emailVerified: false,
              displayName: '',
              photoURL: '',
              disabled: false,
              createdAt: null,
              lastSignInTime: null,
              providers: [],
              username: name,
              usernameLower: name.toLowerCase(),
              bio: '',
              steamAccounts: [],
              xbox: null,
              stats: {
                collections: 0,
                collectionGames: 0,
                wishlist: 0,
                reviews: 0,
                posts: 0,
                friends: 0,
              },
            });
          } else {
            const u = usersMap.get(uid);
            if (!u.username) {
              u.username = name;
              u.usernameLower = name.toLowerCase();
            }
          }
        }
      });
    }
  } catch (err) {
    console.error('[Admin users] username_index tarama hatası:', err?.message || err);
  }

  // 6. Geliştirici hesapları — SADECE @batuta ve @test (yalnızca 2 geliştirici)
  const BATUTA_UID = 'M05J6kGPeqPAkPG55Blg7dJlVsY2';
  const TEST_UID = '5FimwbEHFQZ75FgL2PkgIY9OQV92';

  for (const [uid, u] of usersMap.entries()) {
    const isBatuta = uid === BATUTA_UID || isBatutaAccount(uid) || isBatutaAccount(u.email);
    const isTest = uid === TEST_UID || String(u.email || '').toLowerCase().trim() === 'gamerisen@hotmail.com';

    if (isBatuta) {
      u.isDeveloper = true;
      u.username = 'batuta';
      u.usernameLower = 'batuta';
      u.displayName = u.displayName || 'batuhan';
    } else if (isTest) {
      u.isDeveloper = true;
      u.username = 'test';
      u.usernameLower = 'test';
      u.displayName = u.displayName || 'Firstaccount';
    } else {
      u.isDeveloper = false;
      const uName = String(u.username || '').toLowerCase().trim();
      if (uName === 'batuta' || uName === 'test') {
        u.username = null;
        u.usernameLower = null;
      }
    }
  }

  // 7. Bağlı platformlar (Steam & Xbox) ve Sosyal / Kütüphane İstatistiklerini Zenginleştir
  const allUids = Array.from(usersMap.keys());
  if (allUids.length > 0) {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allUids.length; i += CHUNK_SIZE) {
      const chunk = allUids.slice(i, i + CHUNK_SIZE);
      const pipelineCmds = [];

      // Her kullanıcı için 6 anahtar komutu:
      // 0: user_connections
      // 1: SCARD friends
      // 2: ZCARD user_posts
      // 3: ZCARD user_reviews
      // 4: GET user_collections
      // 5: GET user_wishlist
      for (const uid of chunk) {
        pipelineCmds.push(
          ['GET', `user_connections:${uid}`],
          ['SCARD', `friends:${uid}`],
          ['ZCARD', `user_posts:${uid}`],
          ['ZCARD', `user_reviews:${uid}`],
          ['GET', `user_collections:${uid}`],
          ['GET', `user_wishlist:${uid}`]
        );
      }

      try {
        const pipeRes = await redisPipeline(pipelineCmds);
        chunk.forEach((uid, idx) => {
          const baseIndex = idx * 6;
          const connRaw = pipeRes?.[baseIndex];
          const friendsCount = Number(pipeRes?.[baseIndex + 1]) || 0;
          const postsCount = Number(pipeRes?.[baseIndex + 2]) || 0;
          const reviewsCount = Number(pipeRes?.[baseIndex + 3]) || 0;
          const collectionsRaw = pipeRes?.[baseIndex + 4];
          const wishlistRaw = pipeRes?.[baseIndex + 5];

          const userItem = usersMap.get(uid);
          if (!userItem) return;

          // Bağlantılar
          const conn = parseJSON(connRaw);
          if (conn) {
            if (Array.isArray(conn.steamAccounts) && conn.steamAccounts.length > 0) {
              userItem.steamAccounts = conn.steamAccounts.map(s => ({
                steamId: s.steamId,
                name: s.name,
                avatar: s.avatar,
              }));
            } else if (conn.steam?.steamId) {
              userItem.steamAccounts = [{
                steamId: conn.steam.steamId,
                name: conn.steam.name,
                avatar: conn.steam.avatar,
              }];
            }
            if (conn.xbox?.gamertag) {
              userItem.xbox = {
                gamertag: conn.xbox.gamertag,
                avatar: conn.xbox.avatar,
              };
            }
          }

          // Kütüphane & İstek Listesi
          const parsedCols = parseJSON(collectionsRaw);
          const colsArray = Array.isArray(parsedCols) ? parsedCols : [];
          const totalCollectionGames = colsArray.reduce((sum, c) => sum + (Array.isArray(c?.games) ? c.games.length : 0), 0);

          const parsedWish = parseJSON(wishlistRaw);
          const wishArray = Array.isArray(parsedWish) ? parsedWish : [];

          userItem.stats = {
            collections: colsArray.length,
            collectionGames: totalCollectionGames,
            wishlist: wishArray.length,
            reviews: reviewsCount,
            posts: postsCount,
            friends: friendsCount,
          };
        });
      } catch (pipeErr) {
        console.error('[Admin users] Pipeline zenginleştirme hatası:', pipeErr?.message || pipeErr);
      }
    }
  }

  // 8. Sıralama ve geliştirici etiketleme (SADECE @batuta ve @test geliştiricidir)
  const userList = Array.from(usersMap.values()).map(u => ({
    ...u,
    isDeveloper: Boolean(u.isDeveloper),
  }));

  userList.sort((a, b) => {
    // Developers at very top, then newest created
    if (a.isDeveloper && !b.isDeveloper) return -1;
    if (!a.isDeveloper && b.isDeveloper) return 1;

    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  // 9. Sistem Geneli Özet Metrikler
  const aggregateStats = {
    total: userList.length,
    withUsername: userList.filter(u => !!u.username).length,
    verifiedEmails: userList.filter(u => !!u.emailVerified).length,
    withConnectedStores: userList.filter(u => (u.steamAccounts && u.steamAccounts.length > 0) || !!u.xbox).length,
    totalSteamAccounts: userList.reduce((acc, u) => acc + (u.steamAccounts?.length || 0), 0),
    totalXboxAccounts: userList.filter(u => !!u.xbox).length,
    totalReviews: userList.reduce((acc, u) => acc + (u.stats?.reviews || 0), 0),
    totalPosts: userList.reduce((acc, u) => acc + (u.stats?.posts || 0), 0),
    totalFriends: userList.reduce((acc, u) => acc + (u.stats?.friends || 0), 0),
    totalCollectionGames: userList.reduce((acc, u) => acc + (u.stats?.collectionGames || 0), 0),
    totalWishlistGames: userList.reduce((acc, u) => acc + (u.stats?.wishlist || 0), 0),
    googleCount: userList.filter(u => u.providers?.includes('google.com')).length,
    appleCount: userList.filter(u => u.providers?.includes('apple.com')).length,
    passwordCount: userList.filter(u => u.providers?.includes('password')).length,
  };

  return NextResponse.json({
    ok: true,
    total: userList.length,
    stats: aggregateStats,
    firebase: firebaseDiagnostic,
    users: userList,
  });
}

export async function DELETE(request) {
  // 1. Kimlik ve yetki doğrulaması
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

  if (!caller?.uid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

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

  if (!isDev) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  let targetUid = null;
  try {
    const body = await request.json().catch(() => ({}));
    targetUid = body?.targetUid || body?.uid;
  } catch {}

  if (!targetUid) {
    const { searchParams } = new URL(request.url);
    targetUid = searchParams.get('uid') || searchParams.get('targetUid');
  }

  if (!targetUid) {
    return NextResponse.json({ error: 'Silinecek kullanıcı UID parametresi eksik.' }, { status: 400 });
  }

  // Geliştirici hesap koruması (SADECE @batuta ve @test geliştiricidir, silinemezler!)
  if (
    isDeveloperAccount(targetUid) ||
    isBatutaAccount(targetUid) ||
    isTestAccount(targetUid) ||
    PRIVILEGED_UIDS.has(targetUid)
  ) {
    return NextResponse.json({ error: 'Geliştirici hesapları (@batuta ve @test) silinemez!' }, { status: 403 });
  }

  let targetProfile = null;
  try {
    targetProfile = await redisGetJSON(`user_profile:${targetUid}`);
  } catch {}

  if (targetProfile) {
    const tEmail = String(targetProfile.email || '').toLowerCase().trim();
    const tUsername = String(targetProfile.username || targetProfile.usernameLower || '').replace(/^@/, '').toLowerCase().trim();
    if (
      isDeveloperAccount(targetProfile) ||
      isBatutaAccount(targetProfile) ||
      isTestAccount(targetProfile) ||
      ['batuta', 'test', 'test8'].includes(tUsername) ||
      PRIVILEGED_EMAILS.has(tEmail)
    ) {
      return NextResponse.json({ error: 'Geliştirici hesapları (@batuta ve @test) silinemez!' }, { status: 403 });
    }
  }

  // 1. Firebase Auth'tan sil (Varsa)
  let fbDeleted = false;
  try {
    const admin = await adminAuthGuvenli();
    if (admin) {
      await admin.deleteUser(targetUid);
      fbDeleted = true;
    }
  } catch (fbErr) {
    console.warn('[Admin users DELETE] Firebase deleteUser:', fbErr?.message || fbErr);
  }

  // 2. Redis sosyal & kullanıcı adı dizinlerini temizle
  try {
    if (targetProfile?.username) {
      const clean = targetProfile.username.replace(/^@/, '').toLowerCase().trim();
      if (!['batuta', 'test', 'test8'].includes(clean)) {
        await redisCmd(['DEL', `username:${clean}`]);
        await redisCmd(['ZREM', 'username_index', clean]);
      }
    }
    if (targetProfile?.usernameLower) {
      const clean = targetProfile.usernameLower.replace(/^@/, '').toLowerCase().trim();
      if (!['batuta', 'test', 'test8'].includes(clean)) {
        await redisCmd(['DEL', `username:${clean}`]);
        await redisCmd(['ZREM', 'username_index', clean]);
      }
    }

    // Bağlantıları temizle (Steam, Xbox vb.)
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

    // Kullanıcıya ait tüm anahtarları sil
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

    // Olası username:* ters indeks taraması
    const userKeys = await redisCmd(['KEYS', `username:*`]);
    if (userKeys && userKeys.length > 0) {
      for (const uk of userKeys) {
        const val = await redisCmd(['GET', uk]);
        if (val === targetUid) {
          const uName = uk.replace('username:', '');
          if (!['batuta', 'test', 'test8'].includes(uName)) {
            await redisCmd(['DEL', uk]);
            await redisCmd(['ZREM', 'username_index', uName]);
          }
        }
      }
    }
  } catch (redisErr) {
    console.error('[Admin users DELETE] Redis clean error:', redisErr?.message || redisErr);
  }

  return NextResponse.json({
    ok: true,
    deletedUid: targetUid,
    fbDeleted,
    message: 'Kullanıcı başarıyla silindi.',
  });
}
