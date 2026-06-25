import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const session = cookies().get('psn_session')?.value;
  if (session) {
    try {
      const user = JSON.parse(session);
      return NextResponse.json({ user });
    } catch (e) {
      return NextResponse.json({ user: null });
    }
  }
  return NextResponse.json({ user: null });
}
