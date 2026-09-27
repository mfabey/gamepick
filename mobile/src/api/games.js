import { apiGet, apiPost } from './client';

// Doğal dil ile oyun arama — /api/smart-search
// Dönen oyunlar /api/games ile aynı şekilde, yani GameCard doğrudan kullanılabilir.
// Sunucu şeması `lang` için yalnız 'tr' | 'en' kabul ediyor (yalnız özet
// cümlesinin dili). de/es/pt olduğu gibi gönderilince 400 dönüyordu ve
// Keşfet o dillerde HİÇ çalışmıyordu (ölçüldü 27 Eyl). Sorgunun kendisi
// her dilde anlaşılıyor; yalnız özet dili İngilizceye düşüyor.
export function smartSearch(query, lang = 'tr') {
  return apiPost('/api/smart-search', { query, lang: lang === 'tr' ? 'tr' : 'en' });
}

// Oyun listesi — /api/games (RAWG + Steam merge, mod filtresi dahil)
//
// store/metacritic/tags SUNUCUDA ZATEN VARDI, buradan geçilmiyordu:
// route.js bunları okuyup RAWG'a `stores`, `metacritic=mc,100` ve `tags`
// olarak veriyor. Mobil arayüzde karşılıkları olmadığı için hiç kullanılmadılar.
//
// `price` BİLEREK YOK: sunucu o parametrede yalnızca 'free' uyguluyor ve
// "Ücretsiz" zaten bir bölüm (section) çipi. Sayısal aralık eklemek, mobilde
// kart kart tembel gelen fiyat verisiyle çalışmaz (bkz. FilterSheet başı).
//
// apiGet boş değerleri kendisi eliyor, çağıranın temizlemesi gerekmiyor.
export function fetchGames({
  page = 1, num = 24, section = '', q = '', genres = '', mode = '',
  store = '', metacritic = '', tags = '',
} = {}) {
  return apiGet('/api/games', { page, num, section, q, genres, mode, store, metacritic, tags });
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

// Doğrudan Steam appid ile oyun çek (Share Extension'dan gelen linkler için).
// RAWG slug tahmini yapılmaz — appid Steam appdetails'e doğrudan gider, bu
// yüzden rastgele bir Steam linkinin doğru oyuna çözülmesini garanti eder.
export function fetchGameByAppid(appid, lang = 'en') {
  return apiGet('/api/rawg-game', { appid, lang }).then((d) => d?.game || d || null);
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

// ── Fiyat geçmişi (G-08, 27 Eyl) ────────────────────────────────────────────
// { available, shop: {id,name}, events: [{t, price, regular, cut}], low }.
// Sunucu yayında değilse ya da ITAD oyunu bulamazsa available:false — ekran
// ilgili bölümleri çizmiyor.
export function fetchPriceHistory({ appid, title }) {
  return apiGet('/api/price-history', { appid, title });
}

// ── Trend aramalar (G-05, 27 Eyl) ───────────────────────────────────────────
// Yalnız aramadan açılan oyunun Steam appid'i gidiyor; sorgu metni gitmiyor.
export function fetchSearchTrends() {
  return apiGet('/api/search-trends');
}
export function recordSearchPick(appid) {
  if (!appid) return Promise.resolve(null);
  return apiPost('/api/search-trends', { appid: String(appid) }, { timeout: 6000 }).catch(() => null);
}
