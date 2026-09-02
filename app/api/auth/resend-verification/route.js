import { NextResponse } from 'next/server';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';
import { canUseAuthMock, authNotConfigured } from '../../../lib/auth-config';
import { guard } from '../../../lib/rate-guard';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
    }

    // Doğrulama postası tetikliyor. Parola da istiyor, ama yanlış parolayla
    // gelen istek bile Firebase'e bir tur attırıyor; sınır yine gerekli.
    const kapi = await guard(request, 'verifyResend', { account: email });
    if (kapi) return kapi;

    // Local development mock fallback
    if (!FIREBASE_API_KEY && !canUseAuthMock()) return authNotConfigured();
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
      return yukariAkisHatasi(signInData?.error?.message, 'auth/resend-verification',
        'İşlem tamamlanamadı. Lütfen tekrar deneyin.', 400);
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
      return yukariAkisHatasi(sendMailData?.error?.message, 'auth/resend-verification',
        'Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.', 502);
    }

    return NextResponse.json({ ok: true, mock: false });

  } catch (err) {
    console.error('Resend Verification API Error:', err.message);
    return sunucuHatasi(err, 'auth/resend-verification');
  }
}
