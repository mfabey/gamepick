import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE ADMIN — YALNIZCA jeton İPTALİ için.
//
// NEDEN GEREKLİ: bu uygulamada "çıkış yap" jetonu geçersiz KILMIYORDU.
// Mobil çıkış tamamen yereldi (session.js:118 `persist(null)` yalnızca
// cihazdaki kopyayı siliyor), web çıkışı da yalnızca çerezi temizliyordu.
// Firebase yenileme jetonu SÜRESİZ ve döndürülmüyor; dolayısıyla exfiltre
// edilmiş bir refresh token, kullanıcı çıkış yapsa bile çalışmaya devam
// ediyordu. İptal (`revokeRefreshTokens`) YALNIZCA Admin SDK ile mümkün.
//
// ── KATKI OLARAK KURULDU, ZORUNLULUK OLARAK DEĞİL ───────────────────────────
// Servis hesabı yapılandırılmamışsa bu modül `null` döndürüyor ve çağıranlar
// MEVCUT davranışa (accounts:lookup ile doğrulama) düşüyor.
//
// Bu bilinçli bir tercih ve `SESSION_SECRET`ten FARKLI: orada imzasız çerezi
// kabul etmek kapatılan açığı geri açardı, o yüzden fail-closed. Burada ise
// Admin SDK EK bir kontrol — yokluğunda jetonlar hâlâ doğrulanıyor, sadece
// iptal uygulanmıyor. Yani yapılandırılmamış hâl = bugünkü durum, gerileme
// değil. Fail-closed yapmak, anahtar konmadan deploy edildiğinde tüm girişleri
// kırardı ve kazandırdığından çok şey götürürdü.
//
// ── ANAHTAR NEREDE ──────────────────────────────────────────────────────────
// `FIREBASE_SERVICE_ACCOUNT` ortam değişkeni, servis hesabı JSON'unun
// TAMAMI (tek satır). Dosya olarak REPOYA KONULMAZ — .gitignore zaten
// `*-firebase-adminsdk-*.json` ve `*-service-account.json` kalıplarını
// eliyor, ama env değişkeni hiç dosya bırakmadığı için daha güvenli.
//
// Bu anahtar Firebase projesinin TAMAMINA yetki veriyor (sızan anahtarlar
// listesindeki diğerlerinden çok daha güçlü). Sızarsa rotasyonu Google Cloud
// Console → Service Accounts → Keys üzerinden.
// ─────────────────────────────────────────────────────────────────────────────

let cached;

/** @returns Firebase Admin Auth örneği, ya da yapılandırılmamışsa null. */
export function adminAuth() {
  if (cached !== undefined) return cached;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    cached = null;
    return cached;
  }

  try {
    const creds = JSON.parse(raw);
    // Env değişkenlerinde `\n` kaçışlı geliyor; PEM'in gerçek satır sonuna
    // ihtiyacı var, yoksa "invalid PEM formatted message" ile patlıyor.
    if (typeof creds.private_key === 'string') {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(creds) });
    cached = getAuth(app);
  } catch (err) {
    // Bozuk anahtar SESSIZ KALMAZ ama isteği de düşürmez: iptal devre dışı
    // kalır, doğrulama mevcut yoldan devam eder.
    console.error('firebase-admin başlatılamadı (iptal devre dışı):', err?.message || err);
    cached = null;
  }
  return cached;
}

/** İptal yeteneği açık mı? */
export function canRevokeTokens() {
  return adminAuth() !== null;
}

/**
 * Kullanıcının TÜM yenileme jetonlarını iptal eder.
 *
 * Etkisi anında değil: `mobile-auth.js` doğrulama önbelleği 60 sn, yani
 * iptal en geç bir dakikada uygulanıyor. Bu bilinen ve kabul edilen sınır.
 *
 * @returns true = iptal edildi, false = yapılandırma yok ya da hata
 */
export async function revokeUserTokens(uid) {
  const auth = adminAuth();
  if (!auth || !uid) return false;
  try {
    await auth.revokeRefreshTokens(String(uid));
    return true;
  } catch (err) {
    // İptal edilemezse ÇIKIŞ YİNE DE TAMAMLANMALI: kullanıcıyı oturumda
    // bırakmak, iptal edememekten daha kötü.
    console.error('revokeRefreshTokens başarısız:', err?.message || err);
    return false;
  }
}
