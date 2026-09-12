import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// KİMLİK DOĞRULAMA YAPILANDIRMA KAPISI.
//
// NEDEN VAR: kimlik uçlarının hepsinde `if (!FIREBASE_API_KEY) { ...mock... }`
// deseni vardı ve ÜRETİMDE DE ÇALIŞIYORDU. En ağırı `auth/login`:
//
//     if (!FIREBASE_API_KEY) {
//       const userObj = { uid: 'mock_user', ... };
//       response.cookies.set('gp_user_session', ...);   // ŞİFRE HİÇ KONTROL EDİLMEDEN
//       return response;
//     }
//
// Yani ortam değişkeni bir yapılandırma değişikliğinde düşerse, `/api/auth/login`
// HERHANGİ bir e-posta + HERHANGİ bir şifre için oturum açıyordu. Kimlik
// doğrulama, bir env değişkeninin VARLIĞINA bağlı olarak kendini kapatıyordu —
// `cron/price-alerts`'te kapatılan fail-open deseninin aynısı.
//
// `auth/mobile-login` aynı durumda zaten 503 dönüyordu; web yolunun açık,
// mobil yolun kapalı olması bunun bilinçli bir tercih değil gözden kaçma
// olduğunun kanıtı.
//
// ÇÖZÜM YERELİ KIRMIYOR: mock yolları GELİŞTİRMEDE duruyor (Firebase hesabı
// olmadan çalışmak için vardı), ÜRETİMDE kapalı.
// ─────────────────────────────────────────────────────────────────────────────

export const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

/** Firebase yapılandırılmış mı? */
export function isFirebaseConfigured() {
  return !!FIREBASE_API_KEY;
}

/**
 * Mock (Firebase'siz) yola girmeye izin var mı?
 * Yalnızca geliştirmede. Üretimde kimlik doğrulama SESSİZCE taklit edilemez.
 */
export function canUseAuthMock() {
  return !FIREBASE_API_KEY && process.env.NODE_ENV !== 'production';
}

/**
 * Üretimde Firebase yoksa döndürülecek yanıt.
 *
 * 503 seçildi, 500 değil: sorun istekte değil sunucu yapılandırmasında ve
 * geçici olarak düzeltilebilir. İstemciye şifrenin yanlış olduğu ya da
 * işlemin BAŞARILI olduğu söylenmiyor — ikisi de yanlış bilgi olurdu.
 * (Eski mock yolları `ok: true` dönüyordu: `change-password` hiçbir şey
 * yapmadan "şifreniz değişti" diyordu, kullanıcı ele geçirilmiş bir şifreyi
 * döndürdüğünü sanabilirdi.)
 */
export function authNotConfigured() {
  return NextResponse.json(
    { error: 'AUTH_NOT_CONFIGURED', message: 'Kimlik doğrulama şu an kullanılamıyor.' },
    { status: 503 },
  );
}
