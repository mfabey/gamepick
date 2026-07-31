import { useState, useEffect, useMemo } from 'react';
import { loadLiked, subscribeLiked, getLikedSet, getLikedList } from '../services/likeStore';

/**
 * "İlgimi çekti" işaretli oyun id'lerinin Set'i.
 * Set referansı yalnızca depo değişince değişir → gereksiz re-render olmaz.
 */
export function useLiked() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadLiked();
    return subscribeLiked(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getLikedSet(), [version]);
}

/** Beğeni listesi (yeniden eskiye) — profil ve istatistik ekranları için. */
export function useLikedList() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadLiked();
    return subscribeLiked(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getLikedList(), [version]);
}
