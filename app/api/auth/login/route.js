import { NextResponse } from 'next/server';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock login.');
      const userObj = { uid: 'mock_user', name: email.split('@')[0], email };
      const response = NextResponse.json({ ok: true, user: userObj });
      response.cookies.set('gp_user_session', JSON.stringify(userObj), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    // 1. Sign In User with Firebase Auth
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();

    if (!signInRes.ok) {
      const errMsg = signInData?.error?.message;
      if (errMsg === 'INVALID_LOGIN_CREDENTIALS' || errMsg === 'INVALID_PASSWORD' || errMsg === 'EMAIL_NOT_FOUND') {
        return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 400 });
      }
      return NextResponse.json({ error: signInData?.error?.message || 'Giriş başarısız.' }, { status: signInRes.status });
    }

    const { localId, displayName } = signInData;
    const userObj = {
      uid: localId,
      name: displayName || email.split('@')[0],
      email
    };

    // 2. Set HttpOnly Cookie
    const response = NextResponse.json({ ok: true, user: userObj });
    response.cookies.set('gp_user_session', JSON.stringify(userObj), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (err) {
    console.error('Login API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
