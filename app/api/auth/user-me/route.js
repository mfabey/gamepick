import { NextResponse } from 'next/server';
import { signValue, readValue, SESSION_TTL_SEC, LINK_TTL_SEC } from '../../../lib/session-cookie';
import { cookies } from 'next/headers';
import { redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis';
import { mergeProfile, getProfile } from '../../../lib/social-store';

export const dynamic = 'force-dynamic';

async function getUserConnections(uid) {
  try {
    const data = await redisGetJSON(`user_connections:${uid}`);
    return data || {};
  } catch (err) {
    console.warn('Redis read user connections error:', err.message);
    return {};
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gp_user_session');
    let user = null;

    if (session?.value) {
      user = await readValue(session.value);
    }

    let userWasRestored = false;

    // OTOMATİK GİRİŞ YEDEĞİ — 7 günlük oturum çerezi düşse bile, imzalı
    // gp_steam_session (30 gün) varsa kullanıcıyı geri yüklüyor. Bu, etkin web
    // oturumunu 30 güne çıkarıyor ve BİLİNÇLİ (bkz. session-cookie.js ömür
    // notu; 7 güne hizalama değerlendirilip reddedildi). gp_steam_session
    // imzalı, yani sahte çerezle bu yol tetiklenemiyor.
    if (!user) {
      const steamSession = cookieStore.get('gp_steam_session');
      if (steamSession?.value) {
        try {
          const steamUser = await readValue(steamSession.value);
          const steamId = steamUser?.steamId;
          if (!steamId) throw new Error('gecersiz steam oturumu');
          
          let uid = await redisCmd(['GET', `steam_to_uid:${steamId}`]);
          if (!uid) {
            // Fallback scan for existing users
            const keys = await redisCmd(['KEYS', 'user_connections:*']);
            if (keys && keys.length > 0) {
              for (const key of keys) {
                const conn = await redisGetJSON(key);
                const accounts = conn?.steamAccounts || (conn?.steam ? [conn.steam] : []);
                if (accounts.some(a => a.steamId === steamId)) {
                  uid = key.replace('user_connections:', '');
                  await redisCmd(['SET', `steam_to_uid:${steamId}`, uid]);
                  break;
                }
              }
            }
          }

          if (uid) {
            const cachedUser = await redisGetJSON(`user_profile:${uid}`);
            if (cachedUser) {
              user = cachedUser;
              userWasRestored = true;
            }
          }
        } catch {}
      }
    }

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Mobil veya sitedeki en güncel profil bilgilerini Redis'ten çekip birleştir
    let profile = null;
    try {
      profile = await getProfile(user.uid);
    } catch {}

    const enrichedUser = {
      ...user,
      ...(profile || {}),
      username: profile?.username || user.username || null,
      displayName: profile?.displayName || user.displayName || user.name || null,
      avatar: profile?.avatar || user.avatar || user.photoURL || null,
      bio: profile?.bio || user.bio || null,
    };

    const connections = await getUserConnections(user.uid);
    const steamAccounts = Array.isArray(connections.steamAccounts)
      ? connections.steamAccounts
      : (connections.steam?.steamId ? [connections.steam] : []);
    const steamUser = steamAccounts[0] || null;
    const xboxUser = connections.xbox || null;

    // Auto-cache profile and links to Redis
    try {
      await mergeProfile(user.uid, enrichedUser);
      if (steamAccounts.length > 0) {
        for (const acc of steamAccounts) {
          if (acc.steamId) {
            await redisCmd(['SET', `steam_to_uid:${acc.steamId}`, user.uid]);
          }
        }
      }
      // Simülasyon oturumu indekslenmez — gerekçe login/route.js'te.
      if (xboxUser && xboxUser.gamertag && !xboxUser.isMock) {
        await redisCmd(['SET', `xbox_to_uid:${xboxUser.gamertag}`, user.uid]);
      }
    } catch {}

    const response = NextResponse.json({
      user: enrichedUser,
      steamUser,
      steamAccounts,
      xboxUser,
    });

    if (userWasRestored) {
      response.cookies.set('gp_user_session', await signValue(user, SESSION_TTL_SEC), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });
    }

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: LINK_TTL_SEC,
    };

    // ÇEREZLER REDIS'E GÖRE YAZILIYOR VE SİLİNİYOR (main'in yapısı).
    // Öncesi "yoksa yaz" idi; hesap ayrıldığında eski çerez cihazda kalıyor
    // ve bağlantı kopmuş görünmüyordu. Artık tek doğruluk kaynağı Redis.
    //
    // DEĞERLER İMZALI (bu dalın kuralı). Main düz JSON yazıyordu; bu ağaçta
    // aynı çerezleri okuyan her yer `readValue` kullanıyor (steam-owner.js,
    // auth/me, oyun-merged, xbox-library) ve imzasız değeri REDDEDER. Düz
    // JSON birleştirilseydi Steam ve Xbox bağlantısı web'de sessizce ölürdü.
    if (steamAccounts.length > 0) {
      response.cookies.set('gp_steam_accounts', await signValue(steamAccounts, LINK_TTL_SEC), cookieOpts);
      response.cookies.set('gp_steam_session', await signValue(steamAccounts[0], LINK_TTL_SEC), cookieOpts);
    } else {
      if (cookieStore.get('gp_steam_session')) {
        response.cookies.set('gp_steam_session', '', { ...cookieOpts, maxAge: 0 });
      }
      if (cookieStore.get('gp_steam_accounts')) {
        response.cookies.set('gp_steam_accounts', '', { ...cookieOpts, maxAge: 0 });
      }
    }

    if (xboxUser) {
      response.cookies.set('gp_xbox_session', await signValue(xboxUser, LINK_TTL_SEC), cookieOpts);
    } else {
      if (cookieStore.get('gp_xbox_session')) {
        response.cookies.set('gp_xbox_session', '', { ...cookieOpts, maxAge: 0 });
      }
    }

    return response;

  } catch (err) {
    console.error('user-me API Error:', err.message);
    return NextResponse.json({ user: null });
  }
}
