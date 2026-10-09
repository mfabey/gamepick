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
let lastCredsInfo = null;
let lastInitError = null;

export function getServiceAccountInfo() {
  return {
    creds: lastCredsInfo,
    error: lastInitError,
  };
}

function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null) return raw;

  let str = String(raw).trim();

  // Çevreleyen tırnak işaretlerini (tek veya çift) temizle
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Eğer Base64 ile kodlanmışsa çöz
  if (!str.startsWith('{') && !str.includes('service_account') && !str.includes('private_key')) {
    try {
      const dec = Buffer.from(str, 'base64').toString('utf8');
      if (dec.trim().startsWith('{') || dec.includes('service_account')) {
        str = dec.trim();
      }
    } catch {}
  }

  // Kırpılma / Eksik karakter otomatik onarımı:
  // Vercel'e yapıştırılırken baştaki '{' veya '{"' atlandıysa (örn: type": "service_account"...)
  if (str.startsWith('type":')) {
    str = '{"' + str;
  } else if (str.startsWith('"type"')) {
    str = '{' + str;
  } else if (!str.startsWith('{')) {
    const typeIdx = str.indexOf('"type"');
    const typeBareIdx = str.indexOf('type":');
    if (typeIdx !== -1) {
      str = '{' + str.slice(typeIdx);
    } else if (typeBareIdx !== -1) {
      str = '{"' + str.slice(typeBareIdx);
    }
  }

  // Sonda eksik '}' varsa ekle veya sondaki fazlalığı temizle
  if (!str.endsWith('}')) {
    const lastBrace = str.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > str.lastIndexOf('"')) {
      str = str.slice(0, lastBrace + 1);
    } else {
      str = str + '}';
    }
  }

  let creds = null;
  try {
    creds = JSON.parse(str);
  } catch (err1) {
    // Kaçışlı JSON (JSON stringi içinde JSON) durumunu dene
    try {
      creds = JSON.parse(str.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    } catch (err2) {
      lastInitError = `JSON ayrıştırma hatası: ${err1?.message || err1}`;
      console.error('[firebase-admin] JSON parse hatası:', err1?.message || err1);
      return null;
    }
  }

  if (!creds || typeof creds !== 'object') {
    lastInitError = 'Çözümlenen kimlik bir nesne değil.';
    return null;
  }

  // Private key'deki satır sonlarını normalize et
  if (typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }

  return creds;
}

function loadServiceAccountCreds() {
  const possibleEnvNames = [
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'FIREBASE_ADMIN_CREDENTIALS',
    'FIREBASE_ADMIN_KEY',
    'FIREBASE_CREDENTIALS',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON',
  ];

  let raw = null;
  for (const name of possibleEnvNames) {
    if (process.env[name]) {
      raw = process.env[name];
      break;
    }
  }

  // Ortam değişkeni yoksa yerel dosya yollarını dene (Geliştirme ortamı için)
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

  if (!raw) {
    lastInitError = 'FIREBASE_SERVICE_ACCOUNT ortam değişkeni veya anahtar dosyası bulunamadı.';
    return null;
  }

  const creds = parseServiceAccount(raw);
  if (creds) {
    lastCredsInfo = {
      projectId: creds.project_id || null,
      clientEmail: creds.client_email || null,
      privateKeyId: creds.private_key_id ? String(creds.private_key_id).slice(0, 12) + '...' : null,
    };
  }
  return creds;
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
    lastInitError = `initializeApp hatası: ${err?.message || err}`;
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
