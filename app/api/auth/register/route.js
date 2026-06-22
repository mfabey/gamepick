import { NextResponse } from 'next/server';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'E-posta, şifre ve isim zorunludur.' }, { status: 400 });
    }

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock registration.');
      const response = NextResponse.json({
        ok: true,
        user: { uid: 'mock_' + Date.now(), name, email }
      });
      // Set mock session cookie
      response.cookies.set('gp_user_session', JSON.stringify({ uid: 'mock_' + Date.now(), name, email }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    // 1. Sign Up User in Firebase Auth
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      const errMsg = signUpData?.error?.message;
      if (errMsg === 'EMAIL_EXISTS') {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı.' }, { status: 400 });
      }
      if (errMsg === 'WEAK_PASSWORD : Password should be at least 6 characters') {
        return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır.' }, { status: 400 });
      }
      return NextResponse.json({ error: signUpData?.error?.message || 'Kayıt başarısız.' }, { status: signUpRes.status });
    }

    const { localId, idToken } = signUpData;

    // 2. Set Display Name in Firebase Profile
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, displayName: name, returnSecureToken: true }),
      }
    );

    const userObj = { uid: localId, name, email };

    // 3. Set HttpOnly Cookie
    const response = NextResponse.json({ ok: true, user: userObj });
    response.cookies.set('gp_user_session', JSON.stringify(userObj), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;

  } catch (err) {
    console.error('Register API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
