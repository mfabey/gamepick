import { apiPost, API_BASE } from './client';

// Hesap uçları — web ile aynı Firebase kullanıcılarını kullanır.
// Kayıt için web'in mevcut ucu yeniden kullanılıyor (cookie kurmuyor).

export function registerAccount({ name, email, password }) {
  return apiPost('/api/auth/register', { name, email, password });
}

export function loginAccount({ email, password }) {
  return apiPost('/api/auth/mobile-login', { email, password });
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

export async function deleteAccount(idToken, password) {
  const res = await fetch(`${API_BASE}/api/auth/mobile-delete`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ password }),
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
