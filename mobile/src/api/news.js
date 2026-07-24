import { apiGet } from './client';

// Haberler — /api/news (RSS derlemesi, dile göre)
export function fetchNews(lang = 'tr') {
  return apiGet('/api/news', { lang });
}
