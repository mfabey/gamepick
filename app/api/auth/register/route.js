import { NextResponse } from 'next/server';
import { sunucuHatasi, yukariAkisHatasi } from '../../../lib/api-error';
import { canUseAuthMock, authNotConfigured } from '../../../lib/auth-config';
import { guard } from '../../../lib/rate-guard';
import { validateUsername } from '../../../lib/content-filter';
import { claimUsername, uidForUsername } from '../../../lib/social-store';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  try {
    const { name, email, password, username } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'E-posta, şifre ve isim zorunludur.' }, { status: 400 });
    }

    // Toplu sahte hesap üretimi + her kayıt bir doğrulama postası tetikliyor.
    // Hesap ekseni YOK: e-posta saldırganın her seferinde değiştirdiği alan,
    // orada sayaç tutmak hiçbir şeyi durdurmaz — IP tek anlamlı eksen.
    const kapi = await guard(request, 'register');
    if (kapi) return kapi;

    // ── Kullanıcı adı: sosyal özelliklerin kimlik temeli ────────────────────
    // Kullanıcıyı YARATMADAN ÖNCE doğrula; aksi hâlde geçersiz addan dolayı
    // hesap oluşup yarım kalırdı.
    const wantsUsername = typeof username === 'string' && username.trim().length > 0;
    if (wantsUsername) {
      const v = validateUsername(username.trim());
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

      const owner = await uidForUsername(username.trim());
      if (owner) return NextResponse.json({ error: 'TAKEN' }, { status: 409 });
    }

    // Local development fallback if Firebase Key is not set
    if (!FIREBASE_API_KEY && !canUseAuthMock()) return authNotConfigured();
    if (!FIREBASE_API_KEY) {
      console.warn('FIREBASE_API_KEY is not defined. Falling back to mock registration.');
      return NextResponse.json({
        ok: true,
        mock: true,
        user: { uid: 'mock_' + Date.now(), name, email }
      });
    }

    // 1. Sign Up User in Firebase Auth
    const signUpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        }),
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
      return yukariAkisHatasi(signUpData?.error?.message, 'auth/register',
        'Kayıt tamamlanamadı. Lütfen tekrar deneyin.', 400);
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

    // 3. Send Verification Email
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

    if (!sendMailRes.ok) {
      const sendMailData = await sendMailRes.json();
      console.error('Firebase sendOobCode Error:', sendMailData?.error?.message);
      // We still registered the user successfully, so we can proceed but warn
    }

    const userObj = { uid: localId, name, email };

    // ── Sosyal profili kur ──────────────────────────────────────────────────
    // DİKKAT: Burada eskiden doğrudan `user_profile:{uid}` anahtarına
    // { uid, name, email } yazılıyordu. O anahtar sosyal katmanın profil
    // anahtarıyla AYNI; sonuç olarak her kullanıcıda `username` alanı olmayan
    // bir profil oluşuyor, Arkadaşlar ekranındaki kurulum kapısı "profil var"
    // sanıp atlanıyor ve kullanıcı kalıcı olarak adsız kalıyordu.
    // Artık profil yalnızca claimUsername üzerinden, doğru şemayla yazılıyor.
    let usernameClaimed = false;
    if (wantsUsername) {
      const res = await claimUsername(localId, username.trim(), { displayName: name });
      usernameClaimed = !!res.ok;
      if (!res.ok) {
        // Kontrol ile talep arasında biri adı kapmış olabilir. Hesap zaten
        // oluştu; kullanıcıyı hata ile geri çevirmek yerine adsız bırakıyoruz,
        // uygulamadaki kurulum kapısı devreye girer.
        console.warn('register: username claim failed', res.error);
      }
    }

    // 4. Return success response WITHOUT issuing session cookies
    return NextResponse.json({ ok: true, user: userObj, usernameClaimed, mock: false });

  } catch (err) {
    console.error('Register API Error:', err.message);
    return sunucuHatasi(err, 'auth/register');
  }
}
