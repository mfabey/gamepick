import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/auth/me  →  Aktif Steam oturumunu döndür
export async function GET() {
  const cookieStore = await cookies();
  const session     = cookieStore.get('gp_steam_session');

  if (!session?.value) {
    return NextResponse.json({ user: null });
  }

  try {
    return NextResponse.json({ user: JSON.parse(session.value) });
  } catch {
    return NextResponse.json({ user: null });
  }
}
