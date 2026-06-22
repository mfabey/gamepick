import { NextResponse } from 'next/server';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    // Local development mock fallback
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Simulating resending verification email.');
      return NextResponse.json({ ok: true, mock: true });
    }

    // 1. Authenticate with Firebase to retrieve the ID Token securely
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

    const { idToken } = signInData;

    // 2. Trigger Firebase Auth Email Verification Link
    const sendMailRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken,
        }),
      }
    );

    const sendMailData = await sendMailRes.json();

    if (!sendMailRes.ok) {
      return NextResponse.json({ error: sendMailData?.error?.message || 'E-posta gönderimi başarısız.' }, { status: sendMailRes.status });
    }

    return NextResponse.json({ ok: true, mock: false });

  } catch (err) {
    console.error('Resend Verification API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
