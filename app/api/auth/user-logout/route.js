import { NextResponse } from 'next/server';
import { sunucuHatasi } from '../../../lib/api-error';

export async function POST() {
  try {

    const response = NextResponse.json({ ok: true });

    const cookieOptions = {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };

    // Clear all session cookies
    response.cookies.set('gp_user_session', '', { ...cookieOptions, sameSite: 'lax' });
    response.cookies.set('gp_steam_session', '', cookieOptions);
    response.cookies.set('gp_steam_accounts', '', cookieOptions);
    response.cookies.set('gp_xbox_session', '', cookieOptions);

    return response;
  } catch (err) {
    console.error('user-logout API Error:', err.message);
    return sunucuHatasi(err, 'auth/user-logout');
  }
}
