import { apiGet } from './client';

/**
 * Tek haber — ESKİ BAĞLANTILAR İÇİN.
 *
 * `?id=` DESTEĞİ HER SUNUCUDA YOK: uç, id'yi tanımayan bir sürümde parametreyi
 * yok sayıp listeyi döndürüyor ve yanıtta `item` bulunmuyor. O durumda
 * `undefined` dönmek ekranı SONSUZA DEK "yükleniyor"da bırakıyordu —
 * `useQuery` veriyi `undefined` olduğu sürece yüklenmiş saymıyor (cihazda
 * görüldü: haber detayı hiç açılmıyordu).
 *
 * Bu yüzden karşılık `null`: "istek bitti, kayıt yok". Ekran boş durumunu
 * çiziyor ve kullanıcı sıkışmıyor.
 */
export function fetchNewsArticle(id, lang = 'tr') {
  return apiGet('/api/news', { id, lang }).then(data => data?.item ?? null);
}

// Haberler — /api/news (RSS derlemesi, dile göre)
export function fetchNews(lang = 'tr') {
  return apiGet('/api/news', { lang });
}
