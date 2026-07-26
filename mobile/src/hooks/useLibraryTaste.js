import { useEffect } from 'react';
import { useConnectedLibrary } from './useConnectedLibrary';
import { fetchSteamGenres } from '../api/library';
import { setLibraryTaste, libraryTasteSig } from '../services/tasteProfile';

const TOP_N = 25;       // en çok oynanan N oyun (bounded maliyet)
const HOURS_CAP = 40;   // bu saatte ağırlık +5'e doygunlaşır → 1..6 kat

/**
 * En güçlü zevk sinyali: oynanan Steam kütüphanesini türle eşleyip
 * SAAT-AĞIRLIKLI olarak zevk profiline (kütüphane snapshot'ı) işler.
 * En çok oynanan set değişmedikçe tekrar etmez (appid imzası).
 */
export function useLibraryTaste() {
  const { steamGames } = useConnectedLibrary(true);

  useEffect(() => {
    if (!steamGames || steamGames.length === 0) return;
    let alive = true;

    (async () => {
      const top = [...steamGames]
        .filter((g) => g.appid)
        .sort((a, b) => (b.hours || 0) - (a.hours || 0))
        .slice(0, TOP_N);
      if (top.length === 0) return;

      const appids = top.map((g) => g.appid);
      const sig = appids.slice().sort((a, b) => a - b).join(',');
      if (sig === libraryTasteSig()) return; // değişmedi → tekrar zenginleştirme

      const genresByAppid = await fetchSteamGenres(appids).catch(() => ({}));
      if (!alive) return;

      const weights = {};
      top.forEach((g) => {
        const genres = genresByAppid[g.appid] || genresByAppid[String(g.appid)] || [];
        const w = 1 + Math.min(5, (g.hours || 0) / HOURS_CAP);
        genres.forEach((name) => { weights[name] = (weights[name] || 0) + w; });
      });

      if (Object.keys(weights).length > 0) setLibraryTaste(weights, sig);
    })();

    return () => { alive = false; };
  }, [steamGames]);
}
