import { useState, useEffect } from 'react';
import { priceKey, getCachedPrice, requestPrice } from '../services/priceService';

/**
 * Bir oyunun fiyatını döner.
 *
 * - Fiyat HER render'da önbellekten okunur → FlashList geri-dönüşümünde (recycling)
 *   doğru oyunun fiyatı gösterilir, bayat veri kalmaz.
 * - Önbellekte yoksa arka planda (dedup + eşzamanlılık limitli) çekilir; geldiğinde
 *   yalnızca bu bileşen yeniden render edilir.
 * - Önbellek isabetinde HİÇBİR ağ isteği atılmaz.
 *
 * @returns fiyat objesi | null
 */
export function usePrice(game) {
  const key = priceKey(game);
  const isFree = !!game?.isFree;
  const [, force] = useState(0);

  useEffect(() => {
    if (isFree || !key) return;
    if (getCachedPrice(game) !== undefined) return; // zaten önbellekte → istek yok
    let alive = true;
    requestPrice(game).then(() => { if (alive) force((n) => n + 1); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, isFree]);

  if (isFree) return null;
  const cached = getCachedPrice(game);
  return cached === undefined ? null : cached;
}
