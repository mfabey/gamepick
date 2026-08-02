import { NextResponse } from 'next/server';
import { mergeProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Google ile giriş. Google Identity Services'ten (web) veya expo-auth-session'dan
// (mobil) gelen id_token'ı Firebase'e federe kimlik olarak veriyoruz.
//
// apple-signin ile bilinçli olarak AYNI yanıt şeklini döndürür — mobil taraftaki
// session.js iki sağlayıcıyı da hiç değişmeden işleyebilsin diye.
//
// NOT: apple-signin ile gövde benzerliği var. Ortak bir yardımcıya çıkarmak
// mümkün ama Apple akışı henüz doğrulanmadığı için şimdilik ayrı tutuluyor;
// çalışan tarafı hata ayıklama sırasında refaktör etmek riskli.
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

// Yönlendirmesiz akışta fiilen kullanılmıyor ama Firebase'in REST şeması
// zorunlu tutuyor; geçerli bir URL yeterli.
const REQUEST_URI = 'https://www.gamerisen.com';

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const idTokenIn = (body.idToken || body.identityToken || '').toString();

  if (!idTokenIn) {
    return NextResponse.json({ error: 'idToken zorunludur.' }, { status: 400 });
  }
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  try {
    const idpRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: `id_token=${idTokenIn}&providerId=google.com`,
          requestUri: REQUEST_URI,
          returnSecureToken: true,
        }),
      }
    );
    const idp = await idpRes.json();

    if (!idpRes.ok) {
      // Hata kodunu istemciye taşı — apple-signin'deki gerekçenin aynısı:
      // sağlayıcı kapalı mı (OPERATION_NOT_ALLOWED), token mı geçersiz
      // (INVALID_IDP_RESPONSE) ayırt edilebilsin.
      const raw = String(idp?.error?.message || '');
      const code = raw.split(/[\s:]/)[0] || 'UNKNOWN';
      console.error('Firebase signInWithIdp (google) hatası:', raw);
      return NextResponse.json(
        { error: 'Google ile giriş doğrulanamadı.', code },
        { status: 401 }
      );
    }

    const { localId, idToken, refreshToken, expiresIn, email, displayName } = idp;

    const user = {
      uid: localId,
      name: displayName || (email ? email.split('@')[0] : 'Google Kullanıcısı'),
      email: email || '',
      provider: 'google',
    };
    try { await mergeProfile(localId, user); } catch { /* önbellek şart değil */ }

    const response = NextResponse.json({
      ok: true,
      user,
      idToken,
      refreshToken,
      expiresIn: Number(expiresIn) || 3600,
    });

    // Web httpOnly çerez bekliyor, mobil yanıttaki token'ları saklıyor.
    if (body.web === true) {
      response.cookies.set('gp_user_session', JSON.stringify({
        uid: user.uid, name: user.name, email: user.email,
      }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (err) {
    console.error('google-signin hatası:', err.message);
    return NextResponse.json({ error: 'Giriş sırasında hata oluştu.' }, { status: 500 });
  }
}
