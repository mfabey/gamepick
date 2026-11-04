import { NextResponse } from 'next/server';
import { readValue } from '../../../../lib/session-cookie';
import { cookies } from 'next/headers';
import { redisGetJSON } from '../../../../lib/redis';
import { isDeveloperAccount } from '../../../../lib/social-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();

  // 1. Giriş yapılmış Gamerisen hesabı varsa Redis
  const userSession = cookieStore.get('gp_user_session');
  if (userSession?.value) {
    try {
      const user = await readValue(userSession.value);
      if (!isDeveloperAccount(user)) {
        return NextResponse.json({ riot: null });
      }
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          return NextResponse.json({ riot: conn.riot || null });
        }
      }
    } catch {}
  }

  // 2. Misafir oturumu için gp_riot_session çerezinden oku
  const riotSession = cookieStore.get('gp_riot_session');
  if (!riotSession?.value) return NextResponse.json({ riot: null });

  try {
    const riot = await readValue(riotSession.value);
    return NextResponse.json({ riot: riot || null });
  } catch {
    return NextResponse.json({ riot: null });
  }
}
