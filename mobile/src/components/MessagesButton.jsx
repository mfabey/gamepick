import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getChatList } from '../api/social';
import { getSession, subscribeSession } from '../services/session';
import { colors, radius, type, PRESSED, NUMERIC } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Mesajlar düğmesi — anasayfanın sağ üstü.
//
// BURASI ÖNCE KAYDIRARAK KEŞİF (swipe) GİRİŞİYDİ. O özellik arşive alındı:
// eşleştirme mantığı kullanıcı sayısı arttığında anlam kazanacak, şimdilik
// boş bir havuzda kaydırmak kimseye bir şey vermiyordu. Ekran ve rota duruyor,
// yalnızca giriş noktası kaldırıldı — geri açmak tek satır.
//
// ROZET SAYI DEĞİL NOKTA + SAYI: okunmamış konuşma sayısı gösteriliyor, mesaj
// sayısı değil. "12 mesaj" bilgisi kaç kişinin beklediğini söylemiyor.
//
// SAYIM EKRANA HER DÖNÜŞTE tazeleniyor (useFocusEffect). Aralıklı yoklama
// koymuyoruz: anasayfa açık dururken arka planda sürekli istek atmanın
// karşılığı yok, kullanıcı zaten sohbete girip çıkıyor.
// ─────────────────────────────────────────────────────────────────────────────

export default function MessagesButton({ onPress, accessibilityLabel }) {
  const [unread, setUnread] = useState(0);
  const [session, setSession] = useState(() => getSession());

  useFocusEffect(useCallback(() => {
    const off = subscribeSession(() => setSession(getSession()));
    if (!getSession()) { setUnread(0); return off; }
    let alive = true;
    getChatList()
      .then((r) => { if (alive) setUnread(Number(r?.unread) || 0); })
      .catch(() => { /* çevrimdışı — rozet gösterilmiyor, hata da gösterilmiyor */ });
    return () => { alive = false; off(); };
  }, []));

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && PRESSED]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.text} />
      {session && unread > 0 ? (
        <View style={styles.badge}>
          <Text style={[styles.badgeText, NUMERIC]}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 40×40 + hitSlop 6 → etkin dokunma alanı 52×52, HIG alt sınırının üstünde
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 4, right: 2,
    minWidth: 17, height: 17, borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.accent,
    // Koyu çerçeve rozeti simgeden ayırıyor; olmadan üst üste biniyor gibi
    // görünüyor.
    borderWidth: 2, borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: type.caption2, fontWeight: '800' },
});
