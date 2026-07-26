import { useMemo } from 'react';
import { useConnectedLibrary } from './useConnectedLibrary';
import { normalizeName } from '../services/recommend';

const EMPTY = new Set();

/**
 * Sahip olunan oyun isimleri Set'i (öneri owned filtresi için).
 * Paylaşımlı kütüphane fetch'inden türetilir (skorlama ile aynı normalizasyon).
 * Bağlı hesap yoksa boş Set döner.
 */
export function useOwnedGames(enabled = true) {
  const { steamGames, xboxGames } = useConnectedLibrary(enabled);
  return useMemo(() => {
    if (steamGames.length === 0 && xboxGames.length === 0) return EMPTY;
    const names = new Set();
    [...steamGames, ...xboxGames].forEach((g) => {
      const n = normalizeName(g.name);
      if (n) names.add(n);
    });
    return names;
  }, [steamGames, xboxGames]);
}
