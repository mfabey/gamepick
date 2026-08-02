import { API_BASE } from './client';

/**
 * Dikey video akışı — Steam HLS fragmanları.
 *
 * `seed` OTURUM BAŞINA üretilir ve sabit kalır:
 *  • aynı oturumda sayfalama tutarlı olur (sayfa 2, sayfa 1'in devamıdır)
 *  • farklı oturumlarda sıra değişir, kullanıcı her açtığında farklı akış görür
 * Sunucu bu seed'e göre ağırlıklı-rastgele sıralıyor; yeni çıkan oyunlar öne
 * çıkma eğiliminde ama sıra deterministik değil.
 */
export function fetchVideoFeed(page = 1, lang = 'tr', seed = '') {
  const q = `page=${page}&lang=${lang}${seed ? `&seed=${encodeURIComponent(seed)}` : ''}`;
  return fetch(`${API_BASE}/api/video-feed?${q}`).then((r) => r.json());
}
