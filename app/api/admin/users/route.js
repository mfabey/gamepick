import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { isPrivilegedViewer } from '../../../lib/social-store';
import { adminAuthGuvenli } from '../../../lib/admin-tembel';
import { redisCmd, redisPipeline, parseJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// GELİŞTİRİCİ / YÖNETİCİ PANELİ: TÜM KULLANICILARI LİSTELEME
//
// Yalnızca @batuta veya @test (isPrivilegedViewer) yetkisine sahip geliştiriciler
// erişebilir.
//
// Firebase Auth (varsa) + Redis user_profile ve user_connections kayıtlarını
// birleştirerek kullanıcı adları (@username), e-posta adresleri, kayıt tarihleri,
// sağlayıcılar ve bağlı platformları döndürür.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // 1. Kimlik ve yetki doğrulaması
  const caller = await verifyMobileToken(request);
  if (!caller?.uid) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const isDev = await isPrivilegedViewer(caller.uid);
  if (!isDev) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const usersMap = new Map();

  // 2. Firebase Admin SDK üzerinden tüm Firebase kullanıcılarını çek (varsa)
  try {
    const admin = await adminAuthGuvenli();
    if (admin) {
      let pageToken = undefined;
      do {
        const list = await admin.listUsers(1000, pageToken);
        for (const fbUser of list.users || []) {
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
          });
        }
        pageToken = list.pageToken;
      } while (pageToken && usersMap.size < 10000);
    }
  } catch (err) {
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
        };

        if (profile.username) {
          existing.username = profile.username;
          existing.usernameLower = profile.usernameLower || profile.username.toLowerCase();
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

        usersMap.set(uid, existing);
      });
    }
  } catch (err) {
    console.error('[Admin users] Redis profil tarama hatası:', err?.message || err);
  }

  // 4. Bağlı platformları (user_connections:{uid}) zenginleştir
  const allUids = Array.from(usersMap.keys());
  if (allUids.length > 0) {
    try {
      const chunkSize = 200;
      for (let i = 0; i < allUids.length; i += chunkSize) {
        const slice = allUids.slice(i, i + chunkSize);
        const connRows = await redisPipeline(slice.map(u => ['GET', `user_connections:${u}`]));
        slice.forEach((uid, idx) => {
          const conn = parseJSON(connRows?.[idx]);
          if (conn) {
            const userItem = usersMap.get(uid);
            if (userItem) {
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
          }
        });
      }
    } catch (err) {
      console.error('[Admin users] Bağlantı zenginleştirme hatası:', err?.message || err);
    }
  }

  // 5. Sıralama ve geliştirici etiketleme (En yeni kayıt en üstte)
  const userList = Array.from(usersMap.values()).map(u => ({
    ...u,
    isDeveloper: ['batuta', 'test'].includes(String(u.username || u.usernameLower || '').toLowerCase()),
  }));

  userList.sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tB - tA;
  });

  return NextResponse.json({
    ok: true,
    total: userList.length,
    users: userList,
  });
}
