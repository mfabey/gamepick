// ─────────────────────────────────────────────────────────────────────────────
// Sekmeye TEKRAR basınca çalışan eylem.
//
// iOS'ta yerleşik davranış: zaten bulunduğun sekmenin simgesine basmak listeyi
// başa sarar. Kullanıcı bunu bekliyor; olmayınca uzun listelerde yukarı çıkmak
// için elle kaydırmak gerekiyor.
//
// FloatingTabBar her basışta `tabPress` yayınlıyor (odakta olmayan sekmede
// ayrıca navigasyon yapıyor). Burada YALNIZCA ekran odaktayken tepki
// veriyoruz — aksi hâlde sekme değiştirirken de tetiklenir ve daha ekran
// açılmadan listeyi başa sarmaya çalışırdı.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { useNavigation } from 'expo-router';

/**
 * @param handler  sekmeye tekrar basılınca çağrılır (odaktayken)
 */
export function useTabPressAction(handler) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!navigation?.addListener) return;
    const unsub = navigation.addListener('tabPress', () => {
      // isFocused yoksa (beklenmedik navigasyon nesnesi) yine de çalıştır:
      // tabPress zaten yalnızca o sekmenin ekranına gönderiliyor.
      if (navigation.isFocused ? navigation.isFocused() : true) handler();
    });
    return unsub;
  }, [navigation, handler]);
}

/** Kaydırılabilir bir ref'i başa sarar — FlashList/FlatList ve ScrollView. */
export function scrollRefToTop(ref) {
  const node = ref?.current;
  if (!node) return;
  // FlashList ve FlatList
  if (typeof node.scrollToOffset === 'function') {
    node.scrollToOffset({ offset: 0, animated: true });
    return;
  }
  // ScrollView
  if (typeof node.scrollTo === 'function') {
    node.scrollTo({ y: 0, animated: true });
  }
}
