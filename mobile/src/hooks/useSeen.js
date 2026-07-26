import { useState, useEffect, useMemo } from 'react';
import { loadSeen, subscribeSeen, getSeenSet } from '../services/seenStore';

/**
 * Süresi dolmamış görülen oyun id'lerinin Set'i (skorlama seenIds için).
 * Set referansı yalnızca depo değişince değişir → gereksiz re-rank olmaz.
 */
export function useSeen() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadSeen();
    return subscribeSeen(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getSeenSet(), [version]);
}
