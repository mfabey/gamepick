import { apiGet } from './client';

// Oyun listesi — /api/games (RAWG + Steam merge, mod filtresi dahil)
export function fetchGames({ page = 1, num = 24, section = '', q = '', genres = '', mode = '' } = {}) {
  return apiGet('/api/games', { page, num, section, q, genres, mode });
}

// Trend oyunlar — /api/trending
export function fetchTrending() {
  return apiGet('/api/trending');
}

// Kart başına fiyat — /api/card-price
export function fetchCardPrice({ slug = '', name = '', hasSteam = false }) {
  return apiGet('/api/card-price', { slug, name, hasSteam: hasSteam ? 'true' : '' });
}

// Oyun detayı (açıklama, ekran görüntüleri, türler, mağazalar) — /api/rawg-game
// Yanıt { game: {...} } ile sarılı → düz objeye aç (ekran düz alan okur).
export function fetchGameDetail(slugOrId, lang = 'en') {
  return apiGet('/api/rawg-game', { slug: slugOrId, lang }).then((d) => d?.game || d || null);
}

// Mağaza-başı fiyat karşılaştırması (ITAD, TRY) — /api/prices
export function fetchPrices({ appid = '', title = '' } = {}) {
  if (!appid && !title) return Promise.resolve({ stores: [] });
  return apiGet('/api/prices', { appid: appid || '', title: title || '' });
}

// Steam topluluk inceleme özeti (olumlu %, toplam) — /api/steam-reviews
export function fetchSteamReviews(appid) {
  if (!appid) return Promise.resolve(null);
  return apiGet('/api/steam-reviews', { appid });
}
