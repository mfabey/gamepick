import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getUserConnections(uid) {
  if (!REDIS_URL || !REDIS_TOKEN) return {};
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `user_connections:${uid}`]),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : {};
  } catch (err) {
    console.warn('Redis read user connections error:', err.message);
    return {};
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gp_user_session');

    if (!session || !session.value) {
      return NextResponse.json({ user: null });
    }

    const user = JSON.parse(session.value);
    const connections = await getUserConnections(user.uid);

    const response = NextResponse.json({
      user,
      steamUser: connections.steam || null,
      xboxUser: connections.xbox || null,
    });

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
