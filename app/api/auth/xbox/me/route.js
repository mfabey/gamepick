import { NextResponse } from 'next/server';
import { readValue } from '../../../../lib/session-cookie';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('gp_xbox_session');
  if (!session?.value) return NextResponse.json({ user: null });

  try {
    const { xuid, gamertag, avatar, isMock, gamepassType } = (await readValue(session.value)) || {};
    return NextResponse.json({ user: { xuid, gamertag, avatar, isMock, gamepassType } });
  } catch {
    return NextResponse.json({ user: null });
  }
}
