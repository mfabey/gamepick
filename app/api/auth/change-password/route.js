import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Mevcut şifre ve yeni şifre zorunludur.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Yeni şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    // 1. Get current logged-in user email from the session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('gp_user_session');

    if (!session || !session.value) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' },
        { status: 401 }
      );
    }

    const user = JSON.parse(session.value);
    const email = user.email;

    if (!email) {
      return NextResponse.json(
        { error: 'Geçersiz oturum.' },
        { status: 400 }
      );
    }

    // Local development mock fallback
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Simulating password change.');
      return NextResponse.json({ ok: true, mock: true });
    }

    // 2. Authenticate with Firebase using email and currentPassword
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: currentPassword, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();

    if (!signInRes.ok) {
      const errMsg = signInData?.error?.message;
      if (errMsg === 'INVALID_LOGIN_CREDENTIALS' || errMsg === 'INVALID_PASSWORD' || errMsg === 'EMAIL_NOT_FOUND') {
        return NextResponse.json({ error: 'Mevcut şifreniz hatalı.' }, { status: 400 });
      }
      return NextResponse.json(
        { error: signInData?.error?.message || 'Kimlik doğrulama başarısız.' },
        { status: signInRes.status }
      );
    }

    const { idToken } = signInData;

    // 3. Update the password using accounts:update with idToken and newPassword
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, password: newPassword, returnSecureToken: true }),
      }
    );

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      const errMsg = updateData?.error?.message;
      if (errMsg === 'WEAK_PASSWORD : Password should be at least 6 characters') {
        return NextResponse.json(
          { error: 'Yeni şifre en az 6 karakter olmalıdır.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: updateData?.error?.message || 'Şifre değiştirilemedi.' },
        { status: updateRes.status }
      );
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('Change Password API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
