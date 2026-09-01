import { useState, useEffect, useMemo } from 'react';
import {
  loadCollections, subscribeCollections, getCollections,
  getCollection, collectionsContaining,
} from '../services/collectionsStore';
import { oyunAnahtarlari } from '../services/oyunKimlik';

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

/**
 * Bu oyunu içeren koleksiyon id'lerinin Set'i.
 *
 * OYUN NESNESİ de kabul ediyor, çıplak kimlik de. Nesne geçmek ŞART olduğu yer
 * var: kimlik eşleştirmesi appid ve slug kademelerine bakıyor (oyunKimlik.js),
 * çıplak kimlik onları göremiyor ve aynı oyun iki kez ekleniyordu.
 *
 * MEMO ANAHTARI NESNENİN KENDİSİ DEĞİL: çağıran ekranlar `gameObj`'yi her
 * render'da yeniden kuruyor, referans her seferinde değişir ve memo hiç
 * tutmazdı. Bunun yerine türetilmiş anahtarlar dizisi (ilkel string) kullanılıyor.
 */
export function useCollectionsContaining(gameOrId) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    loadCollections();
    return subscribeCollections(() => setVersion((n) => n + 1));
  }, []);
  const oyun = gameOrId && typeof gameOrId === 'object' ? gameOrId : { id: gameOrId };
  const anahtar = oyunAnahtarlari(oyun).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => collectionsContaining(oyun), [anahtar, version]);
}
