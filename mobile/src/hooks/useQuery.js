import { useEffect, useState, useCallback } from 'react';
import { getEntry, isFresh, subscribe, fetchQuery, whenCacheReady } from '../services/queryCache';

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
 * @returns { data, error, loading, isValidating, stale, ts, refetch }
 */
export function useQuery(key, fetcher, { ttl, enabled = true } = {}) {
  const [, force] = useState(0);

  useEffect(() => {
    if (!enabled || !key) return;
    let alive = true;
    const unsub = subscribe(key, () => force((n) => n + 1));

    // ── DİSK GERİ YÜKLEMESİ BEKLENİYOR ──
    // Beklenmeseydi soğuk açılışta her ekran, diskte HAZIR duran veriyi
    // görmeden ağa çıkardı: çevrimdışıyken istek düşer, ekran hata durumuna
    // geçer, veri arkadan sessizce gelirdi. Bekleme tavanlı (400 ms) — geri
    // yükleme yavaşsa açılış isteği rehin kalmaz.
    // Geri yükleme veriyi doldurduğunda ayrıca `force` ÇAĞRILMIYOR: abonelik
    // yukarıda kuruldu ve `seed` içindeki `notify` bu bileşeni zaten uyandırır.
    // Buraya bir de force konsaydı taze önbellekle açılan HER ekran boşuna bir
    // kez daha çizilirdi.
    whenCacheReady().then(() => {
      if (!alive) return;
      if (!isFresh(getEntry(key), ttl)) fetchQuery(key, fetcher, { ttl }).catch(() => {});
    });

    return () => { alive = false; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ttl]);

  const entry = key ? getEntry(key) : null;
  const data = entry?.data;
  const error = entry?.error ?? null;
  const isValidating = !!entry?.promise;
  const loading = enabled && !!key && data === undefined && !error;

  // Elde veri VAR ama TTL geçmiş.
  const stale = data !== undefined && !isFresh(entry, ttl);
  // Çevrimdışı bandının "{n} güncellendi" cümlesinin dayanağı. Yaş değil
  // DAMGA taşınıyor: yaş her çizimde değişen bir sayı, damga sabit — bandın
  // içindeki `bagilZaman` cümleyi kendisi kuruyor.
  const ts = data !== undefined ? (entry?.ts || 0) : 0;

  const refetch = useCallback(
    () => fetchQuery(key, fetcher, { ttl, force: true }).catch(() => {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, ttl]
  );

  return { data, error, loading, isValidating, stale, ts, refetch };
}
