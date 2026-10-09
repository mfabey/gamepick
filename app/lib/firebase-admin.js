import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE ADMIN SDK BAĞLANTISI
//
// Kullanıcı listeleme (`admin.listUsers`), jeton iptali (`revokeRefreshTokens`)
// ve kimlik yönetimi için Firebase Admin yetkili SDK'sını ilklendirir.
//
// Aktif Servis Anahtarı: Sep 30, 2026 tarihli df1dd610f03a... anahtarı
// ─────────────────────────────────────────────────────────────────────────────

let cached;

function loadServiceAccountCreds() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    const fallbackPaths = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
      'C:/Users/User/Downloads/gamerisen-df1dd610f03a.json',
      path.join(process.cwd(), 'gamerisen-df1dd610f03a.json'),
    ].filter(Boolean);

    for (const p of fallbackPaths) {
      try {
        if (fs.existsSync(p)) {
          raw = fs.readFileSync(p, 'utf8');
          if (raw) break;
        }
      } catch {}
    }
  }

  if (!raw) return null;

  try {
    const creds = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof creds.private_key === 'string') {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    return creds;
  } catch (err) {
    console.error('[firebase-admin] Servis hesabı JSON çözümlenemedi:', err?.message || err);
    return null;
  }
}

/** @returns Firebase Admin Auth örneği, ya da yapılandırılmamışsa null. */
export function adminAuth() {
  if (cached !== undefined) return cached;

  const creds = loadServiceAccountCreds();
  if (!creds) {
    cached = null;
    return cached;
  }

  try {
    const app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(creds) });
    cached = getAuth(app);
  } catch (err) {
    console.error('firebase-admin başlatılamadı:', err?.message || err);
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
 * @returns true = iptal edildi, false = yapılandırma yok ya da hata
 */
export async function revokeUserTokens(uid) {
  const auth = adminAuth();
  if (!auth || !uid) return false;
  try {
    await auth.revokeRefreshTokens(String(uid));
    return true;
  } catch (err) {
    console.error('revokeRefreshTokens başarısız:', err?.message || err);
    return false;
  }
}
