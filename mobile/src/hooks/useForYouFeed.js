import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchGames } from '../api/games';
import { rankCandidates } from '../services/recommend';

const PAGE_SIZE = 24;

/**
 * Ana sayfa sonsuz keşif akışı.
 *
 * Kullanıcının en sevdiği türler arasında SIRAYLA gezer (her sayfa bir sonraki
 * türden) → hem derinlik hem çeşitlilik. Her sayfa çekildiği anda zevk profiline
 * göre sıralanır ve bir daha yeniden sıralanmaz; böylece kullanıcı kaydırırken
 * liste ayağının altından kaymaz.
 *
 * @param slugs      RAWG tür slug'ları (kararlı referans olmalı)
 * @param excludeIds "Senin İçin" şeridinde zaten gösterilenler (String id seti)
 */
export function useForYouFeed({
  enabled = false,
  slugs = [],
  genreWeights = {},
  ownedNames,
  seenIds,
  excludeIds,
} = {}) {
  const [items, setItems] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const ref = useRef({ page: 0, canMore: true, fetching: false, ids: new Set() });

  const slugsKey = slugs.join(',');

  // Tür imzası değişince akışı sıfırla (zevk profili kaydıysa baştan kur)
  useEffect(() => {
    ref.current = { page: 0, canMore: true, fetching: false, ids: new Set() };
    setItems([]);
  }, [slugsKey]);

  const loadMore = useCallback(async () => {
    const r = ref.current;
    if (!enabled || r.fetching || !r.canMore || slugs.length === 0) return;
    r.fetching = true;
    setLoadingMore(true);
    try {
      const i = r.page;
      const slug = slugs[i % slugs.length];                 // türler arasında dön
      const rawgPage = Math.floor(i / slugs.length) + 1;    // her tur bir sonraki sayfa
      const data = await fetchGames({ genres: slug, page: rawgPage, num: PAGE_SIZE });
      const raw = data.results || [];

      // Tekrarları ve şeritte zaten gösterilenleri ele
      const fresh = raw.filter((g) => {
        if (!g || g.id == null) return false;
        const id = String(g.id);
        if (r.ids.has(id) || excludeIds?.has?.(id)) return false;
        r.ids.add(id);
        return true;
      });

      const ranked = rankCandidates(fresh, {
        genreWeights, ownedNames, seenIds,
        limit: fresh.length,
        diversity: 0.15,
      });

      r.page = i + 1;
      if (raw.length === 0) r.canMore = false;
      if (ranked.length) setItems((prev) => [...prev, ...ranked]);
    } catch {
      r.canMore = false;
    } finally {
      r.fetching = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, slugsKey, genreWeights, ownedNames, seenIds, excludeIds]);

  // İlk sayfayı otomatik getir
  useEffect(() => {
    if (enabled && ref.current.page === 0 && !ref.current.fetching) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, slugsKey]);

  return { items, loadMore, loadingMore };
}
