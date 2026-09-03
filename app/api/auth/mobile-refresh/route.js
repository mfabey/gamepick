import { NextResponse } from 'next/server';
import { guard } from '../../../lib/rate-guard';
import { isOurToken, rotateFamily, mintFamily, dropFamily } from '../../../lib/refresh-token';

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

  // Meşru istemci oturum boyunca düzenli çağırıyor — sınır bol tutuldu,
  // amaç yalnızca jeton deneme yoluyla taramayı engellemek.
  const kapi = await guard(request, 'tokenRefresh');
  if (kapi) return kapi;
  if (!FIREBASE_API_KEY) {
    return NextResponse.json({ error: 'Kimlik doğrulama yapılandırılmamış.' }, { status: 503 });
  }

  // Firebase securetoken'a git: verilen (Firebase) yenileme jetonuyla taze
  // idToken al. Firebase yeni bir yenileme jetonu döndürebilir.
  async function firebaseYenile(fbRefresh) {
    const res = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: fbRefresh }),
      }
    );
    const data = await res.json();
    return { ok: res.ok, data };
  }

  try {
    // ── YOL 1: BİZİM DÖNDÜRMELİ JETONUMUZ ──────────────────────────────────
    if (isOurToken(refreshToken)) {
      const rot = await rotateFamily(refreshToken);

      if (rot.reason === 'REUSE') {
        // Döndürülmüş eski jeton geri geldi → aile iptal edildi (Firebase
        // jetonları da). İstemci oturumu kapatmalı.
        return NextResponse.json({ error: 'TOKEN_REUSE' }, { status: 401 });
      }
      if (!rot.ok) {
        return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 401 });
      }

      // Saklanan Firebase jetonuyla taze idToken al.
      const fb = await firebaseYenile(rot.firebaseRefresh);
      if (!fb.ok) {
        // Firebase jetonu artık geçersiz (ör. hesap silinmiş / iptal) →
        // aileyi de düşür, oturumu kapat.
        await dropFamily(rot.newToken);
        return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 401 });
      }

      // Firebase yeni bir yenileme jetonu döndürdüyse aileye yaz (bir sonraki
      // rotasyonda güncel Firebase jetonu kullanılsın). rotateFamily zaten
      // döndürdü; burada yalnız fb güncellemesi gerekiyorsa ikinci tur atmak
      // yerine, Firebase'in genelde AYNI jetonu döndürdüğünü kabul ediyoruz —
      // farklıysa bir sonraki turda securetoken eskisini de kabul ediyor.
      return NextResponse.json({
        ok: true,
        idToken: fb.data.id_token,
        refreshToken: rot.newToken,          // DÖNDÜRÜLMÜŞ bizim jetonumuz
        expiresIn: Number(fb.data.expires_in) || 3600,
        uid: fb.data.user_id,
      });
    }

    // ── YOL 2: ESKİ FIREBASE JETONU (geçiş) ────────────────────────────────
    // Bu deploy'dan ÖNCE giriş yapmış istemciler hâlâ Firebase yenileme
    // jetonu saklıyor. Kabul ediyoruz ve SESSİZCE bizim biçimimize göç
    // ettiriyoruz: yanıtta artık bizim döndürmeli jetonumuz gidiyor.
    const fb = await firebaseYenile(refreshToken);
    if (!fb.ok) {
      return NextResponse.json({ error: 'TOKEN_INVALID' }, { status: 401 });
    }

    // Yeni Firebase jetonunu bir aileye sar. mintFamily null dönerse (Redis
    // yok) eski davranışa düşüyoruz: Firebase jetonunu doğrudan geri ver.
    const yeniToken = await mintFamily(fb.data.user_id, fb.data.refresh_token);

    return NextResponse.json({
      ok: true,
      idToken: fb.data.id_token,
      refreshToken: yeniToken || fb.data.refresh_token,
      expiresIn: Number(fb.data.expires_in) || 3600,
      uid: fb.data.user_id,
    });
  } catch (err) {
    console.error('mobile-refresh hatası:', err.message);
    return NextResponse.json({ error: 'Token yenilenemedi.' }, { status: 500 });
  }
}
