// ─────────────────────────────────────────────────────────────────────────────
// Oyuncu istatistikleri — "Spotify Wrapped" hissi veren haftalık rapor.
//
// Tamamen CİHAZDAKİ verilerden hesaplanır (görülenler, beğeniler, elenenler,
// koleksiyonlar, zevk profili). Sunucuya hiçbir şey gitmez.
//
// Saf fonksiyonlar — React'e bağlı değil, doğrudan test edilebilir.
// ─────────────────────────────────────────────────────────────────────────────
import { seenCountSince, seenTimesSince } from './seenStore';
import { dismissedCountSince, dismissedTimesSince } from './dismissStore';
import { likedSince, getLikedList } from './likeStore';
import { getCollections } from './collectionsStore';
import { topGenres } from './tasteProfile';

export const WEEK_MS = 7 * 86400000;

/** Haftanın başlangıcı (7 gün öncesi). */
export function weekStart(now = Date.now()) {
  return now - WEEK_MS;
}

/**
 * GÜNLÜK KIRILIM — haftalık rapor kartındaki çubuk grafiği için.
 *
 * Maket bu grafiği OYNAMA SÜRESİ olarak çiziyor ("Bu hafta 12 sa 40 dk").
 * Bizde günlük süre verisi YOK: Steam toplam saat veriyor, güne bölmüyor.
 * Uydurmak yerine sahip olduğumuz şey kullanılıyor — günlük ETKİNLİK
 * (görülen + beğenilen + elenen). Alt satırın metni de buna göre yazılıyor,
 * yani grafik neyi gösteriyorsa yazı onu söylüyor.
 *
 * Diziler HER ZAMAN 7 uzunlukta ve kronolojik: [0] en eski gün, [6] bugün.
 * Kısa dizi döndürseydik grafik gün sayısına göre daralır, haftalar arası
 * karşılaştırma bozulurdu.
 *
 * @returns { byDay: number[7], topDay: number|null }
 */
function dailyBreakdown(since, likes, now) {
  const GUN = 24 * 60 * 60 * 1000;
  const byDay = [0, 0, 0, 0, 0, 0, 0];

  const kova = (ts) => {
    const i = Math.floor((ts - since) / GUN);
    return i >= 0 && i < 7 ? i : -1;
  };
  const ekle = (ts) => { const i = kova(ts); if (i >= 0) byDay[i] += 1; };

  seenTimesSince(since).forEach(ekle);
  dismissedTimesSince(since).forEach(ekle);
  for (const l of likes) if (l?.ts) ekle(l.ts);

  const enYuksek = Math.max(...byDay);
  // Hiç etkinlik yoksa vurgulanacak gün de yok — sıfırların ilki
  // "en yoğun gün" diye işaretlenmemeli.
  const topDay = enYuksek > 0 ? byDay.indexOf(enYuksek) : null;
  return { byDay, topDay };
}

/**
 * Türe göre beğeni dağılımı — "en çok neyi inceledin" için.
 * @returns [{ name, count }] azalan sırada
 */
export function genreBreakdown(likes) {
  const counts = {};
  for (const l of likes) {
    for (const g of l.genres || []) {
      if (!g) continue;
      counts[g] = (counts[g] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Fiyat listesinden ortalama indirim.
 * İndirimi OLAN oyunlar üzerinden hesaplanır — indirimsizleri de katmak
 * ortalamayı anlamsız şekilde sıfıra çekerdi.
 * @param prices { appid: { discount, current, original } }
 * @returns { avgDiscount, onSaleCount, bestDiscount }
 */
export function discountStats(prices = {}) {
  const discounts = Object.values(prices)
    .map((p) => Number(p?.discount) || 0)
    .filter((d) => d > 0);

  if (discounts.length === 0) return { avgDiscount: 0, onSaleCount: 0, bestDiscount: 0 };

  const sum = discounts.reduce((a, b) => a + b, 0);
  return {
    avgDiscount: Math.round(sum / discounts.length),
    onSaleCount: discounts.length,
    bestDiscount: Math.max(...discounts),
  };
}

/**
 * Haftalık özet. Fiyat verisi opsiyonel — yoksa indirim bölümü gizlenir.
 * @param opts.prices  toplu Steam fiyatları (isteğe bağlı)
 * @param opts.wishlistCount  takip listesi büyüklüğü
 */
export function weeklyReport({ prices = null, wishlistCount = 0, now = Date.now() } = {}) {
  const since = weekStart(now);

  const discovered = seenCountSince(since);
  const likes = likedSince(since);
  const passed = dismissedCountSince(since);

  const collections = getCollections();
  const collectedGames = collections.reduce((n, c) => n + (c.games?.length || 0), 0);

  const byGenre = genreBreakdown(likes);
  // Hafta boşsa profilin genel eğilimine düş — ekran boş kalmasın
  const topGenre = byGenre[0]?.name || topGenres(1)[0]?.name || null;

  const discount = prices ? discountStats(prices) : null;
  const { byDay, topDay } = dailyBreakdown(since, likes, now);

  return {
    since,
    byDay,
    topDay,
    discovered,
    liked: likes.length,
    passed,
    decisions: likes.length + passed,
    wishlistCount,
    collectionsCount: collections.length,
    collectedGames,
    topGenre,
    genreBreakdown: byGenre.slice(0, 5),
    discount,
    totalLikedAllTime: getLikedList().length,
    // Rapor gösterilmeye değer mi? Tamamen boş bir "wrapped" kötü deneyim.
    hasActivity: discovered > 0 || likes.length > 0 || passed > 0 || collectedGames > 0,
  };
}
