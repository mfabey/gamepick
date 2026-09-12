import { useEffect, useState } from 'react';
import { cevrimdisiMi, agAbone } from '../services/net';

/**
 * Cihaz çevrimdışı mı — abonelikli.
 *
 * Başlangıç değeri `useState`'in TEMBEL biçimiyle okunuyor: doğrudan
 * `useState(cevrimdisiMi())` yazılsaydı her çizimde çağrılır, her çizimde
 * NetInfo izleyicisini kurmaya çalışırdı.
 *
 * @returns {boolean}
 */
export function useCevrimdisi() {
  const [cevrimdisi, setCevrimdisi] = useState(() => cevrimdisiMi());
  useEffect(() => agAbone(setCevrimdisi), []);
  return cevrimdisi;
}
