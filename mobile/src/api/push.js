import { API_BASE } from './client';
import { getValidToken } from '../services/session';

// Push token + izleme listesini backend'e kaydet
// `lang`: sunucu bildirim metnini bu dilde yazıyor (27 Eyl; eskiden hep
// Türkçe). Oturum VARSA jeton da gidiyor: kayıt uid'e bağlanır ve fiyat
// bildirimi bildirim merkezine (G-20) de düşer. Oturumsuz kayıt eskisi gibi.
export async function registerPush(token, watch, platform, lang) {
  const idToken = await getValidToken().catch(() => null);
  const res = await fetch(`${API_BASE}/api/push/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : null) },
    body: JSON.stringify({ token, platform, watch, lang }),
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
