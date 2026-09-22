import { apiGet } from './client';

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
  return apiGet('/api/video-feed', { page, lang, seed });
}

export function fetchVideo(id, lang = 'tr') {
  return apiGet('/api/video-feed', { id, lang }).then(data => data.item);
}
