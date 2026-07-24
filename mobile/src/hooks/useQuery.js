import { useEffect, useState, useCallback } from 'react';
import { getEntry, isFresh, subscribe, fetchQuery } from '../services/queryCache';

/**
 * SWR benzeri sorgu hook'u.
 *
 * - Önbellekte taze veri varsa ANINDA döner (spinner yok).
 * - Bayat/eksikse arka planda tazeler; geldiğinde bileşen güncellenir.
 * - Aynı key için istekler tekilleştirilir (dedup).
 *
 * `key` isteği benzersiz tanımlamalı (ör. `news:tr`); `fetcher` key'in saf
 * fonksiyonu olmalı (aynı key → aynı sonuç).
 *
 * @returns { data, error, loading, isValidating, refetch }
 */
export function useQuery(key, fetcher, { ttl, enabled = true } = {}) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled || !key) return;
    const unsub = subscribe(key, () => force((n) => n + 1));
    if (!isFresh(getEntry(key), ttl)) {
      fetchQuery(key, fetcher, { ttl }).catch(() => {});
    }
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttl]);

  const entry = key ? getEntry(key) : null;
  const data = entry?.data;
  const error = entry?.error ?? null;
  const isValidating = !!entry?.promise;
  const loading = enabled && !!key && data === undefined && !error;

  const refetch = useCallback(
    () => fetchQuery(key, fetcher, { ttl, force: true }).catch(() => {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ttl]
  );

  return { data, error, loading, isValidating, refetch };
}
