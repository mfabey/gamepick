import { apiPost, API_BASE } from './client';

// Hesap uçları — web ile aynı Firebase kullanıcılarını kullanır.
// Kayıt için web'in mevcut ucu yeniden kullanılıyor (cookie kurmuyor).

export function registerAccount({ name, email, password }) {
  return apiPost('/api/auth/register', { name, email, password });
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

export async function pushUserData(idToken, { taste, wishlist }) {
  const res = await fetch(`${API_BASE}/api/user/data`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ taste, wishlist }),
  });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json();
}
