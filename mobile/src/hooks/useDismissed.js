import { useState, useEffect, useMemo } from 'react';
import { loadDismissed, subscribeDismissed, getDismissedSet } from '../services/dismissStore';

/**
 * "İlgilenmiyorum" işaretli oyun id'lerinin Set'i (rankCandidates dismissedIds için).
 * Set referansı yalnızca depo değişince değişir → gereksiz re-rank olmaz.
 */
export function useDismissed() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadDismissed();
    return subscribeDismissed(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getDismissedSet(), [version]);
}
