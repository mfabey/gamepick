import { useState, useEffect, useMemo } from 'react';
import {
  loadCollections, subscribeCollections, getCollections,
  getCollection, collectionsContaining,
} from '../services/collectionsStore';

/** Tüm koleksiyonlar (yeniden eskiye). */
export function useCollections() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadCollections();
    return subscribeCollections(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getCollections(), [version]);
}

/** Tek koleksiyon — detay ekranı için. */
export function useCollection(id) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadCollections();
    return subscribeCollections(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getCollection(id), [id, version]);
}

/** Bu oyunu içeren koleksiyon id'lerinin Set'i. */
export function useCollectionsContaining(gameId) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadCollections();
    return subscribeCollections(() => setVersion((n) => n + 1));
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => collectionsContaining(gameId), [gameId, version]);
}
