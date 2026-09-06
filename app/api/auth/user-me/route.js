import { NextResponse } from 'next/server';
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
      try {
        user = JSON.parse(session.value);
      } catch {}
    }

    let userWasRestored = false;

    // Auto-login fallback if user session cookie has expired but they are still logged into Steam
    if (!user) {
      const steamSession = cookieStore.get('gp_steam_session');
      if (steamSession?.value) {
        try {
          const steamUser = JSON.parse(steamSession.value);
          const steamId = steamUser.steamId;
          
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
      if (xboxUser && xboxUser.gamertag) {
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
      response.cookies.set('gp_user_session', JSON.stringify(user), {
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
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    // Synchronize cookies to this device according to Redis authoritative state
    if (steamAccounts.length > 0) {
      response.cookies.set('gp_steam_accounts', JSON.stringify(steamAccounts), cookieOpts);
      response.cookies.set('gp_steam_session', JSON.stringify(steamAccounts[0]), cookieOpts);
    } else {
      // Clear stale Steam cookies if disconnected in Redis
      if (cookieStore.get('gp_steam_session')) {
        response.cookies.set('gp_steam_session', '', { ...cookieOpts, maxAge: 0 });
      }
      if (cookieStore.get('gp_steam_accounts')) {
        response.cookies.set('gp_steam_accounts', '', { ...cookieOpts, maxAge: 0 });
      }
    }

    if (xboxUser) {
      response.cookies.set('gp_xbox_session', JSON.stringify(xboxUser), cookieOpts);
    } else {
      // Clear stale Xbox cookie if disconnected in Redis
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
