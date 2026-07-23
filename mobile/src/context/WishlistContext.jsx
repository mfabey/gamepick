import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushToken } from '../notifications';
import { registerPush, unregisterPush } from '../api/push';

const WISH_KEY  = 'gr_wishlist';
const NOTIF_KEY = 'gr_notif_enabled';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems]     = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady]     = useState(false);
  const tokenRef = useRef(null);

  // Açılışta yükle
  useEffect(() => {
    (async () => {
      try { const i = await AsyncStorage.getItem(WISH_KEY); if (i) setItems(JSON.parse(i)); } catch {}
      try { const e = await AsyncStorage.getItem(NOTIF_KEY); if (e === '1') setEnabled(true); } catch {}
      setReady(true);
    })();
  }, []);

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

  return (
    <WishlistContext.Provider value={{ items, enabled, ready, add, remove, toggle, isWatched, enableNotifications, disableNotifications }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
