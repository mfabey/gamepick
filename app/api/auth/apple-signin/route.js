import { NextResponse } from 'next/server';
import { signValue, SESSION_TTL_SEC } from '../../../lib/session-cookie';
import { mintFamily } from '../../../lib/refresh-token';
import { guard } from '../../../lib/rate-guard';
import { redisSetJSON } from '../../../lib/redis';
import { mergeProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Sign in with Apple — Guideline 4.8 uyumu (e-posta/şifre girişi sunduğumuz için
// zorunlu bir eş değer seçenek). Native Apple oturum açma sonucundaki
// identityToken'ı Firebase'e federe kimlik olarak veriyoruz.
//
// Diğer sağlayıcılarla (mobile-login) BİREBİR AYNI yanıt şeklini döndürür,
// böylece mobil tarafta session.js hiç değişmeden çalışır.
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// requestUri bu (native, yönlendirmesiz) akışta fiilen kullanılmıyor ama
// Firebase'in REST şeması zorunlu tutuyor; geçerli bir URL yeterli.
const REQUEST_URI = 'https://www.gamerisen.com';

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const identityToken = (body.identityToken || '').toString();
  const fullName = (body.fullName || '').toString().trim();

  if (!identityToken) {
    return NextResponse.json({ error: 'identityToken zorunludur.' }, { status: 400 });
  }

  // google-signin ile aynı gerekçe ve aynı kova.
  const kapi = await guard(request, 'oauthSignin');
  if (kapi) return kapi;
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  try {
    // 1) Apple identityToken'ı Firebase'e federe kimlik olarak doğrula
    const idpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: `id_token=${identityToken}&providerId=apple.com`,
          requestUri: REQUEST_URI,
          returnSecureToken: true,
        }),
      }
    );
    const idp = await idpRes.json();

    if (!idpRes.ok) {
      // Firebase'in hata KODU istemciye de taşınıyor. Hassas bir bilgi değil ama
      // teşhis için şart: tek başına "doğrulanamadı" mesajı, Firebase'de Apple
      // sağlayıcısının kapalı olmasıyla (OPERATION_NOT_ALLOWED) token/audience
      // uyuşmazlığını (INVALID_IDP_RESPONSE) ayırt edilemez hâle getiriyordu.
      const raw = String(idp?.error?.message || '');
      const code = raw.split(/[\s:]/)[0] || 'UNKNOWN';
      console.error('Firebase signInWithIdp hatası:', raw);
      return NextResponse.json(
        { error: 'Apple ile giriş doğrulanamadı.', code },
        { status: 401 }
      );
    }

    const { localId, idToken, refreshToken, expiresIn, email, isNewUser } = idp;
    let { displayName } = idp;

    // 2) Apple, tam adı YALNIZCA kullanıcının İLK onayında verir. İlk kayıtta
    // geldiyse Firebase profiline yaz — sonraki girişlerde bir daha gelmez.
    if (isNewUser && fullName && !displayName) {
      try {
        await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, displayName: fullName, returnSecureToken: false }),
          }
        );
        displayName = fullName;
      } catch { /* profil adı güncellenemedi, girişi engellemez */ }
    }

    const user = {
      uid: localId,
      name: displayName || (email ? email.split('@')[0] : 'Apple Kullanıcısı'),
      email: email || '',
      provider: 'apple',
    };
    try { await mergeProfile(localId, user); } catch { /* önbellek şart değil */ }

    const response = NextResponse.json({
      ok: true,
      user,
      idToken,
      // Döndürmeli jeton — bkz. mobile-login. Firebase jetonu sunucuda kalıyor.
      refreshToken: (await mintFamily(localId, refreshToken)) || refreshToken,
      expiresIn: Number(expiresIn) || 3600,
    });

    // Web ve mobil AYNI ucu kullanıyor ama oturumları farklı taşıyor:
    // mobil yanıttaki token'ları saklıyor, web httpOnly çerez bekliyor.
    // `web: true` geldiğinde çerez de kuruluyor — mobil bu başlığı yok sayar,
    // bu yüzden mevcut mobil akış etkilenmiyor.
    if (body.web === true) {
      response.cookies.set('gp_user_session', await signValue({
        uid: user.uid, name: user.name, email: user.email,
      }, SESSION_TTL_SEC), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SEC,
      });
    }

    return response;
  } catch (err) {
    console.error('apple-signin hatası:', err.message);
    return NextResponse.json({ error: 'Giriş sırasında hata oluştu.' }, { status: 500 });
  }
}
