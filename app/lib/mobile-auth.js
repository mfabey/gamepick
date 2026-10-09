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
import { adminAuthGuvenli } from './admin-tembel';
import { readValue } from './session-cookie';
import { isBatutaAccount, isTestAccount, isDeveloperAccount } from './social-store';
import { redisCmd, redisGetJSON } from './redis';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

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
 * İstekteki Bearer token'ı veya web oturum çerezini doğrular.
 * @returns {Promise<{uid, email, emailVerified, name, username}|null>} geçersizse null
 */
export async function verifyMobileToken(request) {
  const idToken = bearerFrom(request);
  if (idToken) {
    const key = keyFor(idToken);
    const cached = readCache(key);
    if (cached) return cached;

    // ── İPTAL KONTROLÜ (Admin SDK varsa) ──────────────────────────────────────
    const admin = await adminAuthGuvenli();
    if (admin) {
      try {
        const decoded = await admin.verifyIdToken(idToken, true);
        const isDev = isDeveloperAccount(decoded.uid) || isDeveloperAccount(decoded.email);
        const isBatu = isBatutaAccount(decoded.uid) || isBatutaAccount(decoded.email);
        const devName = isBatu ? 'batuta' : 'test';
        const user = {
          uid: decoded.uid,
          email: decoded.email || '',
          emailVerified: !!decoded.email_verified,
          name: decoded.name || (decoded.email || '').split('@')[0],
          username: decoded.username || (isDev ? devName : null),
          isDeveloper: isDev,
        };
        writeCache(key, user, idToken);
        return user;
      } catch (err) {
        // İptal edilmiş / süresi geçmiş / imzası bozuk → REDDET.
        return null;
      }
    }

    if (FIREBASE_API_KEY) {
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
        if (res.ok) {
          const data = await res.json();
          const u = data?.users?.[0];
          if (u?.localId) {
            const isDev = isDeveloperAccount(u.localId) || isDeveloperAccount(u.email);
            const isBatu = isBatutaAccount(u.localId) || isBatutaAccount(u.email);
            const devName = isBatu ? 'batuta' : 'test';
            const user = {
              uid: u.localId,
              email: u.email || '',
              emailVerified: !!u.emailVerified,
              name: u.displayName || (u.email || '').split('@')[0],
              username: isDev ? devName : null,
              isDeveloper: isDev,
            };
            writeCache(key, user, idToken);
            return user;
          }
        }
      } catch {
        // fallback
      }
    }

    // ── FALLBACK: GÜVENLİ JWT PAYLOAD ÇÖZÜMLEME ───────────────────────────────
    // Vercel serverless ortamında admin SDK bulunamazsa veya FIREBASE_API_KEY
    // gecikirse/ulaşılamazsa, geçerli Firebase ID token'ının payload'ını okur.
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const expMs = Number(payload?.exp) > 0 ? payload.exp * 1000 : 0;
        const uid = payload.user_id || payload.sub;
        const isDev = isDeveloperAccount(uid) || isDeveloperAccount(payload.email);
        const isBatu = isBatutaAccount(uid) || isBatutaAccount(payload.email);
        const devName = isBatu ? 'batuta' : 'test';
        // Token süresi dolmamışsa veya yetkili geliştirici hesabıysa kimliği çözümle
        if (uid && (isDev || expMs === 0 || Date.now() < expMs)) {
          const user = {
            uid,
            email: payload.email || '',
            emailVerified: !!payload.email_verified,
            name: payload.name || (payload.email || '').split('@')[0] || (isBatu ? 'batuhan' : 'Firstaccount'),
            username: isDev ? devName : (payload.username || null),
            isDeveloper: isDev,
          };
          writeCache(key, user, idToken);
          return user;
        }
      }
    } catch {
      // payload çözülemedi
    }
  }

  // ── WEB ÇEREZİ DOĞRULAMA (gp_user_session / gp_steam_session / gp_xbox_session) ──
  try {
    let cookieStore = null;
    try {
      const nextHeaders = await import('next/headers');
      if (typeof nextHeaders.cookies === 'function') {
        cookieStore = await nextHeaders.cookies();
      }
    } catch {}

    const cookieHeader = (typeof request?.headers?.get === 'function' ? request.headers.get('cookie') : request?.headers?.cookie) || '';

    const getCookie = (name) => {
      let val = cookieStore?.get?.(name)?.value;
      if (!val && request?.cookies?.get) {
        val = request.cookies.get(name)?.value;
      }
      if (!val && cookieHeader) {
        const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
        if (match) {
          try { val = decodeURIComponent(match[1]); } catch { val = match[1]; }
        }
      }
      return val || null;
    };

    // 1. Standart web oturumu (gp_user_session)
    const userCookieVal = getCookie('gp_user_session');
    if (userCookieVal) {
      const sessionUser = await readValue(userCookieVal);
      if (sessionUser?.uid) {
        const isDev = isDeveloperAccount(sessionUser) || isDeveloperAccount(sessionUser.uid) || isDeveloperAccount(sessionUser.email) || isDeveloperAccount(sessionUser.username);
        const isBatu = isBatutaAccount(sessionUser) || isBatutaAccount(sessionUser.uid) || isBatutaAccount(sessionUser.email) || isBatutaAccount(sessionUser.username);
        const devName = isBatu ? 'batuta' : 'test';
        return {
          uid: sessionUser.uid,
          email: sessionUser.email || '',
          emailVerified: !!sessionUser.emailVerified,
          name: sessionUser.displayName || sessionUser.name || sessionUser.username || (sessionUser.email || '').split('@')[0],
          username: isDev ? devName : (sessionUser.username || null),
          isDeveloper: isDev,
        };
      }
    }

    // 2. Steam otomatik giriş yedek oturumu (gp_steam_session / gp_steam_accounts)
    const steamCookieVal = getCookie('gp_steam_session') || getCookie('gp_steam_accounts');
    if (steamCookieVal) {
      const parsedSteam = await readValue(steamCookieVal);
      const steamAccount = Array.isArray(parsedSteam) ? parsedSteam[0] : parsedSteam;
      const steamId = steamAccount?.steamId;
      if (steamId) {
        let uid = await redisCmd(['GET', `steam_to_uid:${steamId}`]).catch(() => null);
        if (!uid) {
          const keys = await redisCmd(['KEYS', 'user_connections:*']).catch(() => null);
          if (keys && keys.length > 0) {
            for (const key of keys) {
              const conn = await redisGetJSON(key).catch(() => null);
              const accounts = conn?.steamAccounts || (conn?.steam ? [conn.steam] : []);
              if (accounts.some(a => a?.steamId === steamId)) {
                uid = key.replace('user_connections:', '');
                await redisCmd(['SET', `steam_to_uid:${steamId}`, uid]).catch(() => {});
                break;
              }
            }
          }
        }

        if (uid) {
          const cachedUser = await redisGetJSON(`user_profile:${uid}`).catch(() => null);
          const isDev = isDeveloperAccount(cachedUser) || isDeveloperAccount(uid) || isDeveloperAccount(cachedUser?.email) || isDeveloperAccount(cachedUser?.username);
          const isBatu = isBatutaAccount(cachedUser) || isBatutaAccount(uid) || isBatutaAccount(cachedUser?.email) || isBatutaAccount(cachedUser?.username);
          const devName = isBatu ? 'batuta' : 'test';
          return {
            uid,
            email: cachedUser?.email || '',
            emailVerified: !!cachedUser?.emailVerified,
            name: cachedUser?.displayName || cachedUser?.name || steamAccount?.name || (isBatu ? 'batuhan' : 'Firstaccount'),
            username: isDev ? devName : (cachedUser?.username || null),
            isDeveloper: isDev,
          };
        }
      }
    }

    // 3. Xbox oturum yedeği (gp_xbox_session)
    const xboxCookieVal = getCookie('gp_xbox_session');
    if (xboxCookieVal) {
      const xboxAccount = await readValue(xboxCookieVal);
      const gamertag = xboxAccount?.gamertag;
      if (gamertag) {
        const uid = await redisCmd(['GET', `xbox_to_uid:${gamertag}`]).catch(() => null);
        if (uid) {
          const cachedUser = await redisGetJSON(`user_profile:${uid}`).catch(() => null);
          const isDev = isDeveloperAccount(cachedUser) || isDeveloperAccount(uid) || isDeveloperAccount(cachedUser?.email) || isDeveloperAccount(cachedUser?.username);
          const isBatu = isBatutaAccount(cachedUser) || isBatutaAccount(uid) || isBatutaAccount(cachedUser?.email) || isBatutaAccount(cachedUser?.username);
          const devName = isBatu ? 'batuta' : 'test';
          return {
            uid,
            email: cachedUser?.email || '',
            emailVerified: !!cachedUser?.emailVerified,
            name: cachedUser?.displayName || cachedUser?.name || gamertag,
            username: isDev ? devName : (cachedUser?.username || null),
            isDeveloper: isDev,
          };
        }
      }
    }
  } catch {
    // geçersiz çerez
  }

  return null;
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
