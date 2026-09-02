import { NextResponse } from 'next/server';
import { guard } from '../../../lib/rate-guard';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi zorunludur.' }, { status: 400 });
    }

    // E-POSTA BOMBARDIMANI KAPISI. Adres saldırganın serbestçe seçtiği bir
    // alan: sınırsız bırakılırsa istenen kişiye Firebase üzerinden sürekli
    // sıfırlama postası gönderilebilir. Hesap ekseni burada HER istekte
    // artıyor — parola doğrulaması yok, dolayısıyla "başarısız deneme"
    // diye ayırt edilecek bir şey de yok.
    const kapi = await guard(request, 'passwordReset', { account: email });
    if (kapi) return kapi;

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock password reset.');
      return NextResponse.json({ ok: true, mock: true });
    }

    // Call Firebase Auth REST API to send password reset email
    const resetRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      }
    );

    const resetData = await resetRes.json();

    if (!resetRes.ok) {
      const errMsg = resetData?.error?.message;
      if (errMsg === 'EMAIL_NOT_FOUND') {
        return NextResponse.json({ error: 'Bu e-posta adresine kayıtlı bir hesap bulunamadı.' }, { status: 404 });
      }
      return NextResponse.json({ error: resetData?.error?.message || 'Şifre sıfırlama işlemi başarısız.' }, { status: resetRes.status });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('Reset Password API Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
