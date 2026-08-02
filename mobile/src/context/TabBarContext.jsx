// ─────────────────────────────────────────────────────────────────────────────
// Sekme çubuğu ↔ ekran kaydırma köprüsü.
//
// Sekme çubuğu ekranların DIŞINDA (navigator seviyesinde) render ediliyor, bu
// yüzden ekranın kaydırma konumunu doğrudan göremiyor. Aradaki kanal bir
// Reanimated paylaşılan değeri: ekranlar yazıyor, çubuk okuyor.
//
// Paylaşılan değer kullanılmasının sebebi: animasyon UI thread'inde çalışsın.
// State kullanılsaydı her kaydırma karesinde React yeniden render olurdu.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useCallback, useRef } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

const TabBarCtx = createContext(null);

// Yön değişimini bu eşikten sonra kabul et — parmak titremesi çubuğu
// sürekli açıp kapatmasın
const DIR_THRESHOLD = 8;
// Bu konumun üstünde çubuk her zaman tam boy (liste başında daralma olmaz)
const TOP_ZONE = 24;

export function TabBarProvider({ children }) {
  const compact = useSharedValue(0);   // 0 = tam boy, 1 = daralmış
  return <TabBarCtx.Provider value={compact}>{children}</TabBarCtx.Provider>;
}

/** Sekme çubuğunun okuduğu değer. */
export function useTabBarCompact() {
  return useContext(TabBarCtx);
}

/**
 * Ekranların ana dikey kaydırıcısına takılacak onScroll işleyicisi.
 *
 *   const onScroll = useTabBarScroll();
 *   <FlashList onScroll={onScroll} scrollEventThrottle={16} … />
 *
 * Sağlayıcı yoksa (sekme dışı ekran) zararsız boş fonksiyon döner.
 */
export function useTabBarScroll() {
  const compact = useContext(TabBarCtx);
  const lastY = useRef(0);

  return useCallback((e) => {
    if (!compact) return;
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const dy = y - lastY.current;

    // Liste başındayken her zaman aç
    if (y <= TOP_ZONE) {
      if (compact.value !== 0) compact.value = withTiming(0, { duration: 180 });
      lastY.current = y;
      return;
    }

    if (dy > DIR_THRESHOLD) {
      // Aşağı kaydırılıyor → daralt
      if (compact.value !== 1) compact.value = withTiming(1, { duration: 180 });
      lastY.current = y;
    } else if (dy < -DIR_THRESHOLD) {
      // Yukarı kaydırılıyor → aç
      if (compact.value !== 0) compact.value = withTiming(0, { duration: 180 });
      lastY.current = y;
    }
    // Eşiğin altındaki hareketlerde lastY GÜNCELLENMEZ; yoksa yavaş kaydırmada
    // fark hiç birikmez ve durum asla değişmez.
  }, [compact]);
}
