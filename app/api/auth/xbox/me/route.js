import { NextResponse } from 'next/server';
import { readValue } from '../../../../lib/session-cookie';
import { cookies } from 'next/headers';
import { redisGetJSON } from '../../../../lib/redis';

export async function GET() {
  const cookieStore = await cookies();

  // Giriş yapılmış Gamerisen hesabı varsa tek gerçek kaynak Redis'tir
  const userSession = cookieStore.get('gp_user_session');
  if (userSession?.value) {
    try {
      // İMZALI ÇEREZ: `readValue` doğruluyor. Main bunu `JSON.parse` ile
      // okuyordu; bu ağaçta kimlik çerezleri imzalı olduğu icin parse her
      // zaman hata verir ve blok sessizce hiç çalışmazdı.
      const user = await readValue(userSession.value);
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          if (!conn.xbox) {
            return NextResponse.json({ user: null });
          }
          const { xuid, gamertag, avatar, isMock, gamepassType } = conn.xbox;
          return NextResponse.json({ user: { xuid, gamertag, avatar, isMock, gamepassType } });
        }
      }
    } catch {}
  }

  const session = cookieStore.get('gp_xbox_session');
  if (!session?.value) return NextResponse.json({ user: null });

  try {
    const { xuid, gamertag, avatar, isMock, gamepassType } = (await readValue(session.value)) || {};
    return NextResponse.json({ user: { xuid, gamertag, avatar, isMock, gamepassType } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
