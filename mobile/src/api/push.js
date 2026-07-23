import { API_BASE } from './client';

// Push token + izleme listesini backend'e kaydet
export async function registerPush(token, watch, platform) {
  const res = await fetch(`${API_BASE}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform, watch }),
  });
  return res.json().catch(() => ({}));
}

// Token'ı kaldır (bildirimleri kapat)
export async function unregisterPush(token) {
  try {
    await fetch(`${API_BASE}/api/push/register`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch {}
}
