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

  // ── SIFIRLAMA İMZASI SIRASIZ ─────────────────────────────────────────────
  // ÖLÇÜLDÜ (26 Ağustos 2026). Detay ekranı her açılışta
  // `recordSignal({type:'view'})` çağırıyor; tür ağırlıkları oynuyor ve
  // topGenres'in ilk dördünün SIRASI değişiyor. Küme aynı kalsa bile SIRALI
  // anahtar farklı çıkıyor ve bu efekt akışı siliyordu: setItems([]), sayfa
  // 0'dan yeniden çekim, kaydırma konumu sıfır.
  //
  // Aynı kartla art arda dört gidiş-dönüş, dört farklı anasayfa ölçüldü:
  // Balatro → Factorio → Total War: WARHAMMER II → Slay the Spire.
  // Kullanıcının "sayfa yenileniyor, karışıyor" dediği şey buydu; geri çıkış
  // animasyonu eklenene kadar tek karelik geçiş bunu gizliyordu.
  //
  // SIRANIN İÇERİK AÇISINDAN ANLAMI YOK: aşağıda slug'lar `i % slugs.length`
  // ile SIRAYLA dolaşılıyor, yani küme aynıysa gelen oyunlar da aynı. Sırayı
  // imzadan çıkarınca akış yalnız GERÇEKTEN yeni bir tür girip çıktığında
  // sıfırlanıyor.
  const slugsKey = [...slugs].sort().join(',');

  // Tur sırası YİNE ZEVK SIRALI. Slug dizisi ref'te tutuluyor: imza sırasız
  // ama gezinme sırası değil, yani ilk sayfa hâlâ en sevilen türden başlıyor.
  // Ref olmasaydı `loadMore` kapanışı eski sırayla kalırdı.
  const slugsRef = useRef(slugs);
  slugsRef.current = slugs;

  // Tür KÜMESİ değişince akışı sıfırla (zevk profili gerçekten kaydıysa)
  useEffect(() => {
    ref.current = { page: 0, canMore: true, fetching: false, ids: new Set() };
    setItems([]);
  }, [slugsKey]);

  const loadMore = useCallback(async () => {
    const r = ref.current;
    const sl = slugsRef.current;
    if (!enabled || r.fetching || !r.canMore || sl.length === 0) return;
    r.fetching = true;
    setLoadingMore(true);
    try {
      const i = r.page;
      const slug = sl[i % sl.length];                 // türler arasında dön
      const rawgPage = Math.floor(i / sl.length) + 1;  // her tur bir sonraki sayfa
      const data = await fetchGames({ genres: slug, page: rawgPage, num: PAGE_SIZE });
      const raw = data.results || [];

      // Tekrarları, şeritte zaten gösterilenleri ve görseli olmayanları ele
      const fresh = raw.filter((g) => {
        if (!g || g.id == null) return false;
        // Görseli olmayan (monogram'a düşen) oyunları anasayfa akışına hiç alma.
        // Arama kısmında çıkabilirler ama keşif akışını bozmamalılar.
        const hasImage = !!(g.image && typeof g.image === 'string' && g.image.trim() !== '');
        if (!hasImage) return false;
        
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
