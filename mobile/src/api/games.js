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
