import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushToken } from '../notifications';
import { registerPush, unregisterPush } from '../api/push';
import { subscribeSession } from '../services/session';
import { syncAccountData } from '../services/sync';

const WISH_KEY  = 'gr_wishlist';
const NOTIF_KEY = 'gr_notif_enabled';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems]     = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady]     = useState(false);
  const tokenRef = useRef(null);

  // Oturum değişimini izle → giriş/çıkışta senkron tetiklensin
  const [sessionTick, setSessionTick] = useState(0);
  useEffect(() => subscribeSession(() => setSessionTick(n => n + 1)), []);

  // Açılışta yükle
  useEffect(() => {
    (async () => {
      try { const i = await AsyncStorage.getItem(WISH_KEY); if (i) setItems(JSON.parse(i)); } catch {}
      try { const e = await AsyncStorage.getItem(NOTIF_KEY); if (e === '1') setEnabled(true); } catch {}
      setReady(true);
    })();
  }, []);

  // ── Eksik appid'leri tamamla ──
  // Detay ekranı uzun süre appid'i iletmeden ekleme yapıyordu; o kayıtlar
  // widget'ta hiç görünmüyor çünkü fiyatlar appid ile çekiliyor. Slug'dan
  // bir kez çözüp kalıcı yazıyoruz → liste kendiliğinden iyileşiyor.
  //
  // Denenen kimlikler ref'te tutuluyor: çözülemeyen bir oyun her render'da
  // yeniden sorgulanmasın (ve sonsuz döngü oluşmasın).
  const backfilledRef = useRef(new Set());
  useEffect(() => {
    if (!ready) return;
    const missing = items.filter(
      (g) => !g.appid && (g.slug || g.name) && !backfilledRef.current.has(g.id)
    );
    if (missing.length === 0) return;

    let alive = true;
    (async () => {
      const { fetchCardPrice } = await import('../api/games');
      const resolved = {};
      for (const g of missing) {
        backfilledRef.current.add(g.id);
        try {
          const r = await fetchCardPrice({ slug: g.slug || '', name: g.name || '', hasSteam: true });
          if (r?.appid) resolved[g.id] = String(r.appid);
        } catch { /* çözülemedi, bir daha denenmeyecek */ }
      }
      if (!alive || Object.keys(resolved).length === 0) return;
      persist(items.map((g) => (resolved[g.id] ? { ...g, appid: resolved[g.id] } : g)));
    })();

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, ready]);

  // ── Wishlist Widget Güncelleme ──
  useEffect(() => {
    if (!ready) return;

    const appids = items.map(g => g.appid).filter(Boolean);
    if (appids.length === 0) {
      import('../../modules/gamerisen-widget-module')
        .then(({ setWidgetData }) => setWidgetData('gamerisen_wishlist', JSON.stringify([])))
        .catch(() => {});
      return;
    }

    let alive = true;
    import('../api/library').then(({ fetchSteamPrices }) => {
      return fetchSteamPrices(appids);
    }).then(prices => {
      if (!alive || !prices) return;
      
      const saleItems = items
        .map(g => {
          const priceInfo = g.appid ? prices[g.appid] : null;
          return {
            name: g.name,
            appid: g.appid,
            discount: priceInfo?.discount || 0,
            price: priceInfo?.current != null ? `${priceInfo.current.toLocaleString('tr-TR')} ₺` : '',
            originalPrice: priceInfo?.original != null ? priceInfo.original : 0,
            currentPrice: priceInfo?.current != null ? priceInfo.current : 0,
          };
        })
        .filter(g => g.discount > 0 || (g.originalPrice > 0 && g.currentPrice < g.originalPrice))
        .sort((a, b) => b.discount - a.discount)
        .slice(0, 3);

      // Kapaklar base64 olarak yükün içinde gidiyor — WidgetKit render
      // sırasında indirme yapamıyor. Küçük capsule boyu seçildi (231×87,
      // ~10 KB): satır küçük resmi 40×19pt, daha büyüğü UserDefaults'a
      // gereksiz yük olurdu. En fazla üç öğe var, toplam ~40 KB.
      Promise.all([
        import('../../modules/gamerisen-widget-module'),
        import('../utils/widgetImage'),
      ]).then(async ([{ setWidgetData }, { fetchImageBase64, steamCapsuleUrl }]) => {
        const withImages = await Promise.all(
          saleItems.map(async (g) => ({
            name: g.name,
            discount: g.discount,
            price: g.price,
            image: await fetchImageBase64(steamCapsuleUrl(g.appid)),
          }))
        );
        if (!alive) return;
        setWidgetData('gamerisen_wishlist', JSON.stringify(withImages));
      }).catch(() => {});
    }).catch(() => {});

    return () => { alive = false; };
  }, [items, ready]);

  // ── Hesap senkronu ─────────────────────────────────────────────────────────
  // Oturum açıksa zevk profili + takip listesi sunucuyla birleştirilir.
  // Oturum yoksa sessizce atlanır; uygulama hesapsız da tam çalışır.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    syncAccountData(items, async (merged) => {
      if (!alive || !Array.isArray(merged)) return;
      setItems(merged);
      try { await AsyncStorage.setItem(WISH_KEY, JSON.stringify(merged)); } catch {}
    });
    return () => { alive = false; };
    // Oturum değişince (giriş/çıkış) tekrar dene
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sessionTick]);

  const watchPayload = useCallback((list) => list.map(g => ({
    id: g.id, appid: g.appid || null, slug: g.slug || null, name: g.name, hasSteam: !!g.hasSteam,
  })), []);

  const syncBackend = useCallback(async (list) => {
    if (!enabled || !tokenRef.current) return;
    try { await registerPush(tokenRef.current, watchPayload(list), Platform.OS); } catch {}
  }, [enabled, watchPayload]);

  const persist = useCallback(async (list) => {
    setItems(list);
    try { await AsyncStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch {}
    syncBackend(list);
  }, [syncBackend]);

  const add = useCallback(async (game) => {
    if (items.some(i => i.id === game.id)) return;
    const g = {
      id: game.id,
      name: game.name,
      slug: game.rawgSlug || game.slug || '',
      appid: game.appid || null,
      hasSteam: !!game.hasSteam,
      image: game.image || '',
    };
    await persist([...items, g]);
  }, [items, persist]);

  const remove = useCallback(async (id) => {
    await persist(items.filter(i => i.id !== id));
  }, [items, persist]);

  const toggle = useCallback(async (game) => {
    if (items.some(i => i.id === game.id)) await remove(game.id);
    else await add(game);
  }, [items, add, remove]);

  const isWatched = useCallback((id) => items.some(i => i.id === id), [items]);

  const enableNotifications = useCallback(async () => {
    const r = await registerForPushToken();
    if (r.error) return r;
    tokenRef.current = r.token;
    try { await registerPush(r.token, watchPayload(items), Platform.OS); } catch {}
    setEnabled(true);
    try { await AsyncStorage.setItem(NOTIF_KEY, '1'); } catch {}
    return { ok: true };
  }, [items, watchPayload]);

  const disableNotifications = useCallback(async () => {
    if (tokenRef.current) await unregisterPush(tokenRef.current);
    setEnabled(false);
    try { await AsyncStorage.setItem(NOTIF_KEY, '0'); } catch {}
  }, []);

  // Bildirimler açıksa açılışta token'ı tazele + kaydı yenile
  useEffect(() => {
    if (!ready || !enabled) return;
    (async () => {
      const r = await registerForPushToken();
      if (!r.error) {
        tokenRef.current = r.token;
        try { await registerPush(r.token, watchPayload(items), Platform.OS); } catch {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, enabled]);

  const value = useMemo(
    () => ({ items, enabled, ready, add, remove, toggle, isWatched, enableNotifications, disableNotifications }),
    [items, enabled, ready, add, remove, toggle, isWatched, enableNotifications, disableNotifications]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
