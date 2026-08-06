// ─────────────────────────────────────────────────────────────────────────────
// Bağlı mağazalar — Gamerisen HESABINA yazılır, cihaza değil.
//
// Eskiden Steam/Xbox bağlantısı yalnızca AsyncStorage'daydı: kullanıcı başka
// cihazdan girince yeniden bağlamak zorundaydı, uygulamayı silip kurunca da
// kayboluyordu. Steam kütüphanesi zevk profilinin en güçlü sinyali olduğu için
// öneriler de her seferinde sıfırlanıyordu.
//
// Sunucu tarafı web ile AYNI anahtarı kullanıyor (`user_connections:{uid}`),
// yani sitede bağlanan hesap mobilde de görünüyor.
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

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `HTTP ${res.status}`), {
      code: data?.error, status: res.status,
    });
  }
  return data;
}

/** Hesaba bağlı mağazalar: { steamAccounts: [...], xbox: {...}|null } */
export const fetchConnections = () => authed('/api/auth/connections');

/** Steam hesabını hesaba bağla. Sınır aşılırsa code: 'STEAM_LIMIT'. */
export const putSteamConnection = (account) =>
  authed('/api/auth/connections', { method: 'PUT', body: { steam: account } });

/** Xbox oturumunu hesaba bağla. refreshToken GÖNDERİLMEZ — cihazda kalır. */
export const putXboxConnection = (xbox) =>
  authed('/api/auth/connections', {
    method: 'PUT',
    body: { xbox: { xuid: xbox.xuid, gamertag: xbox.gamertag, avatar: xbox.avatar } },
  });

export const removeSteamConnection = (steamId) =>
  authed(`/api/auth/connections?platform=steam&steamId=${encodeURIComponent(steamId)}`, { method: 'DELETE' });

export const removeXboxConnection = () =>
  authed('/api/auth/connections?platform=xbox', { method: 'DELETE' });
