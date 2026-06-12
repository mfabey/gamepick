import { NextResponse } from 'next/server';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// GET /api/auth/logout  →  Steam oturumunu sil
export async function GET() {
  const response = NextResponse.redirect(BASE_URL + '/library');
  response.cookies.set('gp_steam_session', '', {
    httpOnly: true,
    maxAge:   0,
    path:     '/',
    sameSite: 'lax',
  });
  return response;
}
