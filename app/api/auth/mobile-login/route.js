import { NextResponse } from 'next/server';
import { redisSetJSON } from '../../../lib/redis';

// ─────────────────────────────────────────────────────────────────────────────
// Mobil giriş — web'deki /api/auth/login ile aynı kimlik doğrulama, farklı çıktı.
// Web cookie kurar; mobil cookie kullanamadığı için token DÖNDÜRÜR.
// Web akışına dokunulmadı, ikisi bağımsız çalışır.
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const email = (body.email || '').toString().trim();
  const password = (body.password || '').toString();

  if (!email || !password) {
    return NextResponse.json({ error: 'E-posta ve şifre zorunludur.' }, { status: 400 });
  }
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  try {
    // 1) Firebase ile giriş
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const signIn = await signInRes.json();

    if (!signInRes.ok) {
      const code = signIn?.error?.message;
      if (['INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'EMAIL_NOT_FOUND'].includes(code)) {
        return NextResponse.json({ error: 'E-posta veya şifre hatalı.' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Giriş başarısız.' }, { status: signInRes.status });
    }

    const { localId, displayName, idToken, refreshToken, expiresIn } = signIn;

    // 2) E-posta doğrulaması şartı — web ile aynı kural
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    const lookup = await lookupRes.json();
    const fbUser = lookup?.users?.[0];

    if (!fbUser) {
      return NextResponse.json({ error: 'Kullanıcı doğrulanamadı.' }, { status: 500 });
    }
    if (!fbUser.emailVerified) {
      return NextResponse.json(
        { error: 'EMAIL_NOT_VERIFIED', message: 'E-posta adresiniz henüz doğrulanmamış.' },
        { status: 403 }
      );
    }

    const user = { uid: localId, name: displayName || email.split('@')[0], email };
    try { await redisSetJSON(`user_profile:${localId}`, user); } catch { /* önbellek şart değil */ }

    return NextResponse.json({
      ok: true,
      user,
      idToken,
      refreshToken,
      expiresIn: Number(expiresIn) || 3600,
    });
  } catch (err) {
    console.error('mobile-login hatası:', err.message);
    return NextResponse.json({ error: 'Giriş sırasında hata oluştu.' }, { status: 500 });
  }
}
