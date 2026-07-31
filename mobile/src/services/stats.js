// ─────────────────────────────────────────────────────────────────────────────
// Oyuncu istatistikleri — "Spotify Wrapped" hissi veren haftalık rapor.
//
// Tamamen CİHAZDAKİ verilerden hesaplanır (görülenler, beğeniler, elenenler,
// koleksiyonlar, zevk profili). Sunucuya hiçbir şey gitmez.
//
// Saf fonksiyonlar — React'e bağlı değil, doğrudan test edilebilir.
// ─────────────────────────────────────────────────────────────────────────────
import { seenCountSince } from './seenStore';
import { dismissedCountSince } from './dismissStore';
import { likedSince, getLikedList } from './likeStore';
import { getCollections } from './collectionsStore';
import { topGenres } from './tasteProfile';

export const WEEK_MS = 7 * 86400000;

/** Haftanın başlangıcı (7 gün öncesi). */
export function weekStart(now = Date.now()) {
  return now - WEEK_MS;
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

  return {
    since,
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
