import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { origin } = request.nextUrl;
  const cookieStore = await cookies();
  cookieStore.set('gp_xbox_session', '', { maxAge: 0, path: '/' });
  return NextResponse.redirect(`${origin}/library`);
}
