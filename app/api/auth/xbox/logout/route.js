import { NextResponse } from 'next/server';
import { readValue } from '../../../../lib/session-cookie';
import { cookies } from 'next/headers';

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

async function removeUserConnection(uid, platform) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const current = await getUserConnections(uid);
    delete current[platform];
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', `user_connections:${uid}`, JSON.stringify(current)]),
      cache: 'no-store',
    });
    return res.ok;
  } catch (err) {
    console.warn('Redis remove user connection error:', err.message);
    return false;
  }
}

export async function GET(request) {
  const { origin } = request.nextUrl;
  const cookieStore = await cookies();

  // Remove connection from Redis database if user is logged in
  const userSession = cookieStore.get('gp_user_session');
  if (userSession && userSession.value) {
    try {
      const user = await readValue(userSession.value); if (!user) throw new Error("gecersiz");
      await removeUserConnection(user.uid, 'xbox');
    } catch (err) {
      console.error('Failed to remove Xbox connection from Redis:', err.message);
    }
  }

  cookieStore.set('gp_xbox_session', '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return NextResponse.redirect(`${origin}/library`);
}
