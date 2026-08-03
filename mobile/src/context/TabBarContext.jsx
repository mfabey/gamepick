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
import { createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

const TabBarCtx = createContext(null);

// Yön değişimini bu eşikten sonra kabul et — parmak titremesi çubuğu
// sürekli açıp kapatmasın
const DIR_THRESHOLD = 8;
// Bu konumun üstünde çubuk her zaman tam boy (liste başında daralma olmaz)
const TOP_ZONE = 24;

export function TabBarProvider({ children }) {
  const compact = useSharedValue(0);   // 0 = tam boy, 1 = daralmış
  // TAMAMEN gizleme — daralmadan ayrı bir eksen. Reels'te videoya basılı
  // tutunca bütün arayüz siliniyor ve çubuk da buna dahil; "daralmış" hâli
  // bunun için yeterli değil, çubuk yine görünür kalırdı.
  const hidden = useSharedValue(0);    // 0 = görünür, 1 = gizli
  const value = useMemo(() => ({ compact, hidden }), [compact, hidden]);
  return <TabBarCtx.Provider value={value}>{children}</TabBarCtx.Provider>;
}

/** Sekme çubuğunun daralma değeri. */
export function useTabBarCompact() {
  return useContext(TabBarCtx)?.compact ?? null;
}

/** Sekme çubuğunu tamamen gizleme değeri (ekranlar yazar, çubuk okur). */
export function useTabBarHidden() {
  return useContext(TabBarCtx)?.hidden ?? null;
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
  const compact = useContext(TabBarCtx)?.compact ?? null;
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
