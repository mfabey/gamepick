import { NextResponse } from 'next/server';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { actionType, oobCode, newPassword } = await request.json();

    if (!oobCode) {
      return NextResponse.json({ error: 'İşlem kodu (oobCode) gereklidir.' }, { status: 400 });
    }

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Simulating mock action.');
      return NextResponse.json({ ok: true, mock: true });
    }

    if (actionType === 'verifyEmail') {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: 'VERIFY_FAILED', message: 'E-posta doğrulama tamamlanamadı. Bağlantının süresi dolmuş olabilir.' },
          { status: res.status }
        );
      }

      return NextResponse.json({ ok: true });
    } 
    
    if (actionType === 'resetPassword') {
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' }, { status: 400 });
      }

      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oobCode, newPassword }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errMsg = data?.error?.message;
        if (errMsg === 'EXPIRED_OOB_CODE') {
          return NextResponse.json({ error: 'Şifre sıfırlama bağlantısının süresi dolmuş.' }, { status: 400 });
        }
        if (errMsg === 'INVALID_OOB_CODE') {
          return NextResponse.json({ error: 'Geçersiz şifre sıfırlama bağlantısı.' }, { status: 400 });
        }
        return NextResponse.json(
          { error: errMsg || 'Şifre sıfırlama başarısız oldu.' },
          { status: res.status }
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem tipi.' }, { status: 400 });

  } catch (err) {
    console.error('Auth Action API Error:', err.message);
    return sunucuHatasi(err, 'auth/action');
  }
}
