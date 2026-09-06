import { apiPost, API_BASE } from './client';

// Hesap uçları — web ile aynı Firebase kullanıcılarını kullanır.
// Kayıt için web'in mevcut ucu yeniden kullanılıyor (cookie kurmuyor).

export function registerAccount({ name, username, email, password }) {
  return apiPost('/api/auth/register', { name, username, email, password });
}

/**
 * Kullanıcı adı uygunluğu — KAYIT SIRASINDA, token olmadan.
 * /api/social/username?check= ucu oturum istiyor, kayıt formunda henüz yok.
 */
export async function checkUsernameAvailable(username) {
  const res = await fetch(
    `${API_BASE}/api/auth/username-available?u=${encodeURIComponent(username)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

export function loginAccount({ email, password }) {
  return apiPost('/api/auth/mobile-login', { email, password });
}

// Sign in with Apple (Guideline 4.8 — e-posta girişi sunduğumuz için zorunlu eş değer)
export function appleSignIn({ identityToken, fullName }) {
  return apiPost('/api/auth/apple-signin', { identityToken, fullName });
}

export function refreshSession(refreshToken) {
  return apiPost('/api/auth/mobile-refresh', { refreshToken });
}

export function requestPasswordReset(email) {
  return apiPost('/api/auth/reset-password', { email });
}

// ── Token gerektiren uçlar ───────────────────────────────────────────────────

export async function fetchUserData(idToken) {
  const res = await fetch(`${API_BASE}/api/user/data`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

// reauth: { password } veya { appleIdentityToken } — hesabın oturum açma
// yöntemine göre biri gönderilir (Apple kullanıcılarının şifresi yoktur).
export async function deleteAccount(idToken, reauth) {
  const res = await fetch(`${API_BASE}/api/auth/mobile-delete`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(reauth),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

/**
 * Cihazdaki veriyi sunucuya gönderir, BİRLEŞMİŞ hâlini geri alır.
 *
 * `collections` ve `deleted` alanları burada MUTLAKA iletilmeli. İletilmezse
 * sunucu istemci tarafını hiç görmez, birleştirmeden boş liste döner ve
 * applyMergedCollections yereldeki koleksiyonları siler — kullanıcı
 * oluşturduğu koleksiyonların kaybolduğunu görür.
 */
export async function pushUserData(idToken, { taste, wishlist, collections, deleted, gameCount, overwriteWishlist }) {
  const res = await fetch(`${API_BASE}/api/user/data`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    // `gameCount` İSTEĞE BAĞLI: verilmezse sunucu mevcut değeri koruyor.
    // Bu sayının tek okuyucusu BAŞKASININ profilindeki "oyun" sayacı —
    // kütüphane sunucuda önbelleklenmiyor, yani ziyaretçi onu başka türlü
    // hesaplayamıyor.
    body: JSON.stringify({ taste, wishlist, collections, deleted, gameCount, overwriteWishlist }),
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}

/**
 * Yalnız oyun sayısını yazar.
 *
 * NEDEN AYRI BİR YOL: bağlı kütüphane React'in `useQuery` önbelleğinde
 * yaşıyor ve `syncAccountData` (bileşen dışı bir servis) ona erişemiyor.
 * Sayıyı bilen tek yer profil ekranı; oradan tek alanla gönderiliyor.
 *
 * PUT'un birleştirmesi YIKICI DEĞİL: takip listesi ve koleksiyonlar gövdede
 * gelmezse sunucudaki kayıt olduğu gibi kalıyor (bkz. app/api/user/data),
 * yani bu çağrı veri silmiyor.
 */
export async function pushGameCount(idToken, gameCount) {
  return pushUserData(idToken, { gameCount });
}
