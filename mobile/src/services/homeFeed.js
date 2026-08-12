// ─────────────────────────────────────────────────────────────────────────────
// Anasayfa akışının harmanlanması — oyun gönderileri + topluluk incelemeleri.
//
// NEDEN SERPİŞTİRME, ayrı bir bölüm değil: incelemeler kendi şeridine
// konsaydı akışın geri kalanı yine %100 katalog olurdu. Aradaki fark,
// kaydırırken insanlara rastlamakla insanları ayrı bir rafta görmek
// arasındaki fark.
//
// TEKRAR YOK. Elde üç inceleme varsa üç kez çıkıyorlar ve serpiştirme
// duruyor; döngüye alınıp tekrar gösterilseydi akış bozuk görünürdü —
// "az içerik" ile "aynı içeriği tekrar tekrar gösteren uygulama" arasında
// ikincisi çok daha kötü.
//
// SIRA KORUNUYOR: oyunların sırası öneri motorunun sıralaması, incelemelerin
// sırası en yeniden eskiye. İkisi de bozulmuyor, yalnızca iç içe geçiyorlar.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Oyun gönderilerinin arasına inceleme kartları yerleştirir.
 *
 * @param {Array}  games    öneri motorunun sıraladığı oyunlar
 * @param {Array}  reviews  topluluk incelemeleri (en yeni önce)
 * @param {object} [opts]
 * @param {number} [opts.first=2]  ilk inceleme kaçıncı oyundan SONRA
 * @param {number} [opts.every=3]  sonrakiler kaç oyunda bir
 * @returns {Array} `{ kind, key, game|review }` — FlashList'in beklediği düz liste
 */
export function interleaveReviews(games, reviews, { first = 2, every = 3 } = {}) {
  const g = Array.isArray(games) ? games : [];
  const r = Array.isArray(reviews) ? reviews : [];
  if (!g.length) return [];

  const out = [];
  let ri = 0;

  for (let i = 0; i < g.length; i++) {
    const game = g[i];
    if (!game || game.id == null) continue;
    out.push({ kind: 'game', key: 'g:' + game.id, game });

    // Kaçıncı oyunu yeni yazdık? (1 tabanlı)
    const n = i + 1;
    if (ri < r.length && n >= first && (n - first) % every === 0) {
      const rev = r[ri++];
      out.push({ kind: 'review', key: 'r:' + rev.appid + ':' + rev.uid, review: rev });
    }
  }

  return out;
}
