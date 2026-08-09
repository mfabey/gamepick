// ─────────────────────────────────────────────────────────────────────────────
// Sosyal uçlar — hepsi oturum gerektirir (Bearer token).
// Token yönetimi çağıranda değil, burada: getValidToken tazeleme dahil hallediyor.
// ─────────────────────────────────────────────────────────────────────────────
import { API_BASE } from './client';
import { getValidToken } from '../services/session';

async function authed(path, { method = 'GET', body } = {}) {
  const token = await getValidToken();
  if (!token) throw Object.assign(new Error('NO_SESSION'), { code: 'NO_SESSION' });

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : null),
    },
    ...(body ? { body: JSON.stringify(body) } : null),
  });

  let data = null;
  try { data = await res.json(); } catch { /* gövdesiz yanıt */ }

  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
      status: res.status,
      code: data?.error || null,
    });
  }
  return data;
}

// ── Kimlik ──────────────────────────────────────────────────────────────────
export const getMyProfile      = ()      => authed('/api/social/username');
export const checkUsername     = (name)  => authed(`/api/social/username?check=${encodeURIComponent(name)}`);
export const setUsername       = (username, displayName) =>
  authed('/api/social/username', { method: 'POST', body: { username, displayName } });

// ── Arama ───────────────────────────────────────────────────────────────────
export const searchUsers       = (q)     => authed(`/api/social/search?q=${encodeURIComponent(q)}`);

// ── Arkadaşlık ──────────────────────────────────────────────────────────────
export const getFriends        = ()      => authed('/api/social/friend');
export const friendAction      = (targetUid, action) =>
  authed('/api/social/friend', { method: 'POST', body: { targetUid, action } });

// ── Aktivite ────────────────────────────────────────────────────────────────
export const getActivity       = (limit = 40) => authed(`/api/social/activity?limit=${limit}`);

/**
 * Aktivite bildirimi — ateşle-unut.
 * Sosyal profili olmayan / oturumsuz kullanıcıda sessizce düşer; çağıran
 * tarafın try/catch ile uğraşmasına gerek kalmasın diye burada yutuluyor.
 */
export function reportActivity(item) {
  return authed('/api/social/activity', { method: 'POST', body: item }).catch(() => null);
}

// ── Engelleme ───────────────────────────────────────────────────────────────
export const getBlocked        = ()      => authed('/api/social/block');
export const blockUser         = (targetUid) =>
  authed('/api/social/block', { method: 'POST', body: { targetUid, action: 'block' } });
export const unblockUser       = (targetUid) =>
  authed('/api/social/block', { method: 'POST', body: { targetUid, action: 'unblock' } });

// ── Raporlama ───────────────────────────────────────────────────────────────
export const reportContent     = ({ targetType, targetId, reason, note }) =>
  authed('/api/social/report', { method: 'POST', body: { targetType, targetId, reason, note } });

// ── Topluluk listeleri ──────────────────────────────────────────────────────
export const fetchListFeed   = (sort = 'popular', page = 1) =>
  authed(`/api/social/lists?sort=${sort}&page=${page}`);
export const fetchList       = (id) => authed(`/api/social/lists?id=${encodeURIComponent(id)}`);
export const fetchUserLists  = (owner) => authed(`/api/social/lists?owner=${encodeURIComponent(owner)}`);
export const publishList     = ({ id, title, description, emoji, games }) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'publish', id, title, description, emoji, games } });
export const deletePublicList = (id) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'delete', id } });
export const toggleListLike  = (id) =>
  authed('/api/social/lists', { method: 'POST', body: { action: 'like', id } });

// ── Avatar ───────────────────────────────────────────────────────────────────
export const setAvatar = (presetId) =>
  authed('/api/social/avatar', { method: 'POST', body: { avatar: presetId } });

// ── Gizlilik ────────────────────────────────────────────────────────────────
export const getPrivacy        = ()      => authed('/api/social/privacy');
export const setPrivacy        = (patch) => authed('/api/social/privacy', { method: 'POST', body: patch });

// ── Steam grafiği ───────────────────────────────────────────────────────────
// Steam arkadaşları + kütüphane kesişimi. Arkadaşın Gamerisen'i kurmuş olması
// GEREKMİYOR — grafiği Steam'den ödünç alıyoruz.
//
// Yavaş bir uç: soğuk önbellekte arkadaş başına bir Steam çağrısı var.
// authed() varsayılanında zaman aşımı yok, o yüzden çağıran tarafta bekleme
// durumu göstermek şart.
export const getSteamFriends   = ()      => authed('/api/social/steam-friends');
