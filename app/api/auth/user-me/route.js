import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gp_user_session');

    if (!session || !session.value) {
      return NextResponse.json({ user: null });
    }

    const user = JSON.parse(session.value);
    return NextResponse.json({ user });
  } catch (err) {
    console.error('user-me API Error:', err.message);
    return NextResponse.json({ user: null });
  }
}
