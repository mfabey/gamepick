// ─────────────────────────────────────────────────────────────────────────────
// Mobil oturum doğrulama.
// Web httpOnly cookie kullanıyor; mobil uygulamalar cookie ile sağlıklı
// çalışmadığı için Authorization: Bearer <idToken> başlığı kullanır.
//
// Token'ı Firebase'in accounts:lookup ucuyla doğruluyoruz — geçersiz, süresi
// dolmuş veya iptal edilmiş token'lar burada elenir.
//
// Bu çağrı bir ağ turu maliyetindedir. Aynı token'ın kısa aralıklarla tekrar
// tekrar doğrulanmasını önlemek için süreç-içi kısa ömürlü bir önbellek var.
// Önbellek YALNIZCA Firebase'in doğruladığı sonucu saklar — kimlik kararı hâlâ
// Firebase'e aittir, burada token'a asla doğrudan güvenilmez.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash } from 'crypto';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const CACHE_TTL_MS = 60_000;   // 60 sn — iptal edilen token'ın yaşayabileceği en uzun süre
const CACHE_MAX = 500;         // bellek koruması (sunucusuz örnek başına)

/** @type {Map<string, {user: object, expiresAt: number}>} */
const cache = new Map();

function keyFor(idToken) {
  return createHash('sha256').update(idToken).digest('hex');
}

// JWT'nin exp alanını yalnızca ÖNBELLEK ÖMRÜNÜ SINIRLAMAK için okur.
// Kimlik doğrulaması için kullanılmaz — imza burada doğrulanmıyor.
function tokenExpiryMs(idToken) {
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return 0;
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number(json?.exp) > 0 ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    cache.delete(key);
    return null;
  }
  return hit.user;
}

function writeCache(key, user, idToken) {
  // En eski kaydı düşürerek sınırsız büyümeyi engelle
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  // Önbellek, token'ın kendi son kullanma anını asla aşmamalı
  const exp = tokenExpiryMs(idToken);
  const expiresAt = exp > 0
    ? Math.min(Date.now() + CACHE_TTL_MS, exp)
    : Date.now() + CACHE_TTL_MS;

  if (expiresAt > Date.now()) cache.set(key, { user, expiresAt });
}

function bearerFrom(request) {
  const auth = request.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
}

/**
 * İstekteki Bearer token'ı doğrular.
 * @returns {Promise<{uid, email, emailVerified, name}|null>} geçersizse null
 */
export async function verifyMobileToken(request) {
  const idToken = bearerFrom(request);
  if (!idToken) return null;

  // Firebase yapılandırılmamışsa (yerel geliştirme) doğrulama yapılamaz
  if (!FIREBASE_API_KEY) return null;

  const key = keyFor(idToken);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.users?.[0];
    if (!u?.localId) return null;

    const user = {
      uid: u.localId,
      email: u.email || '',
      emailVerified: !!u.emailVerified,
      name: u.displayName || (u.email || '').split('@')[0],
    };

    writeCache(key, user, idToken);
    return user;
  } catch {
    return null;
  }
}

/**
 * Bu isteğin token'ını önbellekten düşürür.
 * Hesap silme gibi, oturumun anında geçersizleşmesi gereken akışlarda çağrılır —
 * aksi hâlde silinen hesabın token'ı önbellek ömrü boyunca geçerli görünürdü.
 */
export function invalidateMobileToken(request) {
  const idToken = bearerFrom(request);
  if (idToken) cache.delete(keyFor(idToken));
}
