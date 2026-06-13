import { NextResponse } from 'next/server';

// GET /api/auth/logout  →  Steam oturumunu sil
export async function GET(request) {
  const baseUrl = request.nextUrl.origin;
  const response = NextResponse.redirect(baseUrl + '/library');
  response.cookies.set('gp_steam_session', '', {
    httpOnly: true,
    maxAge:   0,
    path:     '/',
    sameSite: 'lax',
  });
  return response;
}
