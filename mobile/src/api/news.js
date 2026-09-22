import { apiGet } from './client';

export function fetchNewsArticle(id, lang = 'tr') {
  return apiGet('/api/news', { id, lang }).then(data => data.item);
}

// Haberler — /api/news (RSS derlemesi, dile göre)
export function fetchNews(lang = 'tr') {
  return apiGet('/api/news', { lang });
}
