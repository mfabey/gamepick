import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function deleteUserConnections(uid) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['DEL', `user_connections:${uid}`]),
      cache: 'no-store',
    });
  } catch (err) {
    console.warn('Redis delete user connections error:', err.message);
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('gp_user_session');

    if (!session || !session.value) {
      return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 });
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Şifrenizi girmeniz zorunludur.' }, { status: 400 });
    }

    const user = JSON.parse(session.value);
    const { email, uid } = user;

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Simulating mock account deletion.');
      
      // Clean Redis connections
      await deleteUserConnections(uid);

      const response = NextResponse.json({ ok: true, mock: true });
      
      const cookieOptions = {
        httpOnly: true,
        maxAge: 0,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      };

      // Clear cookies reliably
      response.cookies.set('gp_user_session', '', cookieOptions);
      response.cookies.set('gp_steam_session', '', { ...cookieOptions, sameSite: 'lax' });
      response.cookies.set('gp_xbox_session', '', { ...cookieOptions, sameSite: 'lax' });
      
      return response;
    }

    // 1. Authenticate the user again using password to get ID token
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
      if (errMsg === 'INVALID_LOGIN_CREDENTIALS' || errMsg === 'INVALID_PASSWORD') {
        return NextResponse.json({ error: 'Girdiğiniz şifre hatalı.' }, { status: 400 });
      }
      return NextResponse.json({ error: signInData?.error?.message || 'Kimlik doğrulama başarısız.' }, { status: signInRes.status });
    }

    const { idToken } = signInData;

    // 2. Delete the user account from Firebase Auth
    const deleteRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    const deleteData = await deleteRes.json();

    if (!deleteRes.ok) {
      return NextResponse.json(
        { error: deleteData?.error?.message || 'Firebase hesap silme işlemi başarısız.' },
        { status: deleteRes.status }
      );
    }

    // 3. Delete user connections from Upstash Redis
    await deleteUserConnections(uid);

    // 4. Clear all cookies and return success
    const response = NextResponse.json({ ok: true, mock: false });
    const cookieOptions = {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    response.cookies.set('gp_user_session', '', cookieOptions);
    response.cookies.set('gp_steam_session', '', { ...cookieOptions, sameSite: 'lax' });
    response.cookies.set('gp_xbox_session', '', { ...cookieOptions, sameSite: 'lax' });

    return response;

  } catch (err) {
    console.error('Delete Account API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
