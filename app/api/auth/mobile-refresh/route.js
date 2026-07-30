import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Token yenileme. idToken ~1 saatte dolar; mobil, refreshToken ile sessizce
// yeniler ve kullanıcı tekrar giriş yapmak zorunda kalmaz.
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

export async function POST(request) {
  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const refreshToken = (body.refreshToken || '').toString();

  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken zorunludur.' }, { status: 400 });
  }
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
      }
    );
    const data = await res.json();

    if (!res.ok) {
      // Refresh token iptal edilmiş/geçersiz → mobil tarafta oturumu kapat
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in) || 3600,
      uid: data.user_id,
    });
  } catch (err) {
    console.error('mobile-refresh hatası:', err.message);
    return NextResponse.json({ error: 'Token yenilenemedi.' }, { status: 500 });
  }
}
