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

/**
 * Tek video — DERİN BAĞLANTI İÇİN.
 *
 * `?id=` DESTEĞİ HER SUNUCUDA YOK: uç, id'yi tanımayan bir sürümde
 * parametreyi yok sayıp akış sayfasını döndürüyor ve yanıtta `item`
 * bulunmuyor. O durumda `undefined` dönmek ekranı SONSUZA DEK
 * "yükleniyor"da bırakıyordu — `useQuery` veriyi `undefined` olduğu sürece
 * yüklenmiş saymıyor (cihazda görüldü; haber detayında da aynı hata vardı,
 * bkz. api/news.js).
 *
 * Karşılık `null`: "istek bitti, kayıt yok".
 */
export function fetchVideo(id, lang = 'tr') {
  return apiGet('/api/video-feed', { id, lang }).then(data => data?.item ?? null);
}
