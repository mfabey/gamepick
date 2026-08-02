import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis';
import { mergeProfile } from '../../../lib/social-store';

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

    const connections = await getUserConnections(user.uid);

    // Auto-cache profile and links to Redis
    try {
      await mergeProfile(user.uid, user);
      if (connections.steam && connections.steam.steamId) {
        await redisCmd(['SET', `steam_to_uid:${connections.steam.steamId}`, user.uid]);
      }
      if (connections.steamAccounts && Array.isArray(connections.steamAccounts)) {
        for (const acc of connections.steamAccounts) {
          if (acc.steamId) {
            await redisCmd(['SET', `steam_to_uid:${acc.steamId}`, user.uid]);
          }
        }
      }
      if (connections.xbox && connections.xbox.gamertag) {
        await redisCmd(['SET', `xbox_to_uid:${connections.xbox.gamertag}`, user.uid]);
      }
    } catch {}

    const response = NextResponse.json({
      user,
      steamUser: connections.steam || null,
      xboxUser: connections.xbox || null,
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

    // Synchronize cookies to this device if they are in Redis but missing locally
    if (connections.steam && !cookieStore.get('gp_steam_session')) {
      response.cookies.set('gp_steam_session', JSON.stringify(connections.steam), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax',
      });
    }

    if (connections.xbox && !cookieStore.get('gp_xbox_session')) {
      response.cookies.set('gp_xbox_session', JSON.stringify(connections.xbox), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
        sameSite: 'lax',
      });
    }

    return response;

  } catch (err) {
    console.error('user-me API Error:', err.message);
    return NextResponse.json({ user: null });
  }
}
