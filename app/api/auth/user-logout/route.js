import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ ok: true });
    
    // Clear gp_user_session cookie
    response.cookies.set('gp_user_session', '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return response;
  } catch (err) {
    console.error('user-logout API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
