import { NextResponse } from 'next/server';
import { verifyMobileToken, invalidateMobileToken } from '../../../lib/mobile-auth';
import { redisCmd } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Mobil hesap silme. Apple, hesap açtıran uygulamalarda UYGULAMA İÇİNDEN
// hesap silmeyi zorunlu tutuyor (web'e yönlendirmek kabul edilmiyor).
//
// Web'deki delete-account cookie okuduğu için mobil onu kullanamıyor.
// Güvenlik: token'a ek olarak KİMLİK tekrar doğrulanır (silme, taze bir kimlik
// doğrulaması ister) — çalınmış bir cihazla hesap silinemesin.
//
// İki yeniden doğrulama yolu desteklenir çünkü Apple ile kaydolan kullanıcıların
// şifresi yoktur:
//   { password }             → e-posta/şifre hesapları
//   { appleIdentityToken }   → Apple ile kaydolan hesaplar (taze Apple onayı)
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const REQUEST_URI = 'https://www.gamerisen.com';

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const password = (body.password || '').toString();
  const appleIdentityToken = (body.appleIdentityToken || '').toString();

  if (!password && !appleIdentityToken) {
    return NextResponse.json({ error: 'Kimlik doğrulaması zorunludur.' }, { status: 400 });
  }
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  try {
    // 1) Taze bir idToken al (silme işlemi taze kimlik doğrulaması ister)
    let reauth;
    if (appleIdentityToken) {
      const reauthRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postBody: `id_token=${appleIdentityToken}&providerId=apple.com`,
            requestUri: REQUEST_URI,
            returnSecureToken: true,
          }),
        }
      );
      reauth = await reauthRes.json();
      if (!reauthRes.ok || reauth.localId !== user.uid) {
        return NextResponse.json({ error: 'Apple doğrulaması başarısız.' }, { status: 400 });
      }
    } else {
      const reauthRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password, returnSecureToken: true }),
        }
      );
      reauth = await reauthRes.json();
      if (!reauthRes.ok) {
        return NextResponse.json({ error: 'Şifre hatalı.' }, { status: 400 });
      }
    }

    // 2) Sunucudaki kullanıcı verilerini sil
    const keys = [
      `user_connections:${user.uid}`,
      `user_profile:${user.uid}`,
      `user_taste:${user.uid}`,
      `user_wishlist:${user.uid}`,
    ];
    await Promise.all(keys.map(k => redisCmd(['DEL', k]).catch(() => {})));

    // 3) Firebase hesabını sil
    const delRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: reauth.idToken }),
      }
    );
    if (!delRes.ok) {
      const d = await delRes.json().catch(() => ({}));
      console.error('Firebase hesap silme hatası:', d?.error?.message);
      return NextResponse.json({ error: 'Hesap silinemedi.' }, { status: 500 });
    }

    // Hesap gitti — doğrulama önbelleğindeki kaydı da anında düşür ki silinen
    // hesabın token'ı önbellek ömrü boyunca geçerli görünmesin.
    invalidateMobileToken(request);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('mobile-delete hatası:', err.message);
    return NextResponse.json({ error: 'Hesap silinirken hata oluştu.' }, { status: 500 });
  }
}
