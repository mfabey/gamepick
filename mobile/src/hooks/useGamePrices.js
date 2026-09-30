import { useEffect, useMemo, useState } from 'react';
import { fetchPrices } from '../api/games';
import { requestPrice } from '../services/priceService';
import { useQuery } from './useQuery';

// ─────────────────────────────────────────────────────────────────────────────
// BİR OYUNUN MAĞAZA FİYAT LİSTESİ — Oyun Detayı (G-07) ve Fiyat
// Karşılaştırma (G-08) AYNI kaynaktan okuyor. Sorgu anahtarı ikisinde aynı
// (`prices:<steamAppId|slug|id>`), yani detaydan karşılaştırmaya geçişte
// SIFIR istek; iki ekran aynı listeyi gösterdiği için çelişemiyor (Faz 3:
// "Bir sayı yanlış olmaktan kötüsü iki sayının farklı olması").
//
// ITAD listesi + (boşsa) Steam kart fiyatı YEDEK olarak. Yedek neden
// duruyor: ITAD bazı oyunlarda hiç mağaza döndürmüyor (bölgesel kısıt,
// eşleşmeyen başlık); o hâlde ekranda tek fiyat bile olmuyordu. İKİ SİSTEM
// DEĞİL, biri ötekinin yokluğunda.
//
// KART FİYATI SERVİSTEN, DOĞRUDAN UÇTAN DEĞİL: disk önbelleği, tekilleştirme
// (listedeki kart aynı kaydı zaten çekmişti → karttan detaya SIFIR istek) ve
// çevrimdışı kısa devre priceService'te.
// ─────────────────────────────────────────────────────────────────────────────

const TTL = 30 * 60 * 1000;

/**
 * @param {object} o
 * @param {string} o.queryKey  steamAppId || slug || id
 * @param {string} [o.appid]   Steam appid (ITAD eşleşmesi için)
 * @param {string} [o.title]   oyun adı (appid yoksa ITAD başlık araması)
 * @param {string} [o.slug]    kart fiyatı anahtarı
 * @param {string} [o.name]    kart fiyatı anahtarı
 * @param {string} [o.steamUrl] yedek satırın adresi (kart fiyatı yanıtı adres taşımıyor)
 * @param {boolean} o.enabled  ITAD sorgusu açık mı
 * @returns {{ stores: Array, loaded: boolean, ts: number|null }}
 *   stores: ucuzdan pahalıya (ücretsiz en önde); { key, name, price, original, discount, isFree, url, yedek }
 */
export function useGamePrices({ queryKey, appid, title, slug, name, steamUrl, enabled }) {
  const { data: pricesData, ts } = useQuery(
    `prices:${queryKey}`,
    () => fetchPrices({ appid, title }),
    { ttl: TTL, enabled }
  );

  const [kartFiyati, setKartFiyati] = useState(null);
  useEffect(() => {
    let alive = true;
    requestPrice({ slug, name, hasSteam: true })
      .then((d) => { if (alive) setKartFiyati(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [slug, name]);

  const stores = useMemo(() => {
    const list = pricesData?.stores || [];
    if (list.length > 0) {
      return [...list]
        .sort((a, b) => (a.isFree ? -1 : b.isFree ? 1 : a.price - b.price))
        .map((s) => ({
          key: String(s.storeId || s.name), name: s.name, price: s.price, original: s.original,
          discount: s.discount || 0, isFree: !!s.isFree, url: s.url || null, yedek: false,
        }));
    }
    const p = kartFiyati;
    if (p?.price != null || p?.isFree) {
      return [{
        // Kart fiyatı yanıtı adres taşımıyor; Steam fiyatıysa oyunun Steam
        // sayfası. Yoksa "Mağazaya Git" ölü düğme kalıyordu (emülatörde görüldü).
        key: 'steam', name: 'Steam', price: p.price, original: p.original,
        discount: p.discount || 0, isFree: !!p.isFree, url: p.url || steamUrl || null, yedek: true,
      }];
    }
    return [];
  }, [pricesData, kartFiyati, steamUrl]);

  return { stores, loaded: !!pricesData, ts: pricesData ? ts : null };
}
