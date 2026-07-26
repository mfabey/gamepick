import { API_BASE, apiGet } from './client';

// Steam kütüphanesi — steamId query param'ı ile (cookie gerektirmez)
export function fetchSteamLibrary(steamId) {
  return apiGet('/api/oyun', { steamId });
}

// Steam fiyatları — appid listesi ile (kütüphane değeri için)
export function fetchSteamPrices(appids) {
  if (!appids || appids.length === 0) return Promise.resolve({});
  return apiGet('/api/steam-prices', { appids: appids.join(',') });
}

// Steam türleri — appid → tür listesi (zevk zenginleştirme için, A4b)
export function fetchSteamGenres(appids) {
  if (!appids || appids.length === 0) return Promise.resolve({});
  return apiGet('/api/steam-genres', { appids: appids.join(',') });
}

// base64 (UTF-8) encode — Xbox session'ı header'da göndermek için
function b64EncodeUtf8(str) {
  try {
    // eslint-disable-next-line no-undef
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    // eslint-disable-next-line no-undef
    return btoa(str);
  }
}

// Xbox kütüphanesi — session'ı X-Xbox-Session header'ı ile gönder (mobilde cookie yok)
export async function fetchXboxLibrary(session) {
  const res = await fetch(`${API_BASE}/api/xbox-library`, {
    headers: {
      Accept: 'application/json',
      'X-Xbox-Session': b64EncodeUtf8(JSON.stringify(session)),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.expired = data?.expired;
    throw err;
  }
  return data;
}
