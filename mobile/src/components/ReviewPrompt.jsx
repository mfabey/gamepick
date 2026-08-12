import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ReviewComposer from './ReviewComposer';
import { colors, radius, spacing, type, PRESSED, NUMERIC } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// "Bunları oynadın — ne düşünüyorsun?"  Anasayfanın üretim davetiyesi.
//
// BU BÖLÜM ASLA BOŞ GÖRÜNEMEZ ve tasarımın bütün noktası bu. İçeriği
// TOPLULUKTAN değil, kullanıcının KENDİ Steam kütüphanesinden geliyor:
// hesabı bağlı bir kullanıcıda liste ilk günden dolu. Topluluk akışı bomboş
// olsa bile anasayfa "burada bir şeyler oluyor" diyor.
//
// Ters kurgu — "son incelemeler" şeridi — kullanıcı sayısı azken tam tersini
// söylerdi: iki inceleme gösteren bir bölüm, hiç göstermeyenden daha çok
// terk edilmişlik hissi verir.
//
// STEAM BAĞLI DEĞİLSE HİÇ ÇİZİLMİYOR. "Steam'ini bağla" çağrısı burada
// olsaydı anasayfanın üstü bir kurulum ekranına dönerdi; o davet zaten
// profilde duruyor.
// ─────────────────────────────────────────────────────────────────────────────

export default function ReviewPrompt({ games, onWritten }) {
  const { t, lang } = useLanguage();
  const [composer, setComposer] = useState(null);

  const open = useCallback((g) => {
    Haptics.selectionAsync().catch(() => {});
    setComposer({ appid: g.appid, name: g.name });
  }, []);

  if (!games?.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Ionicons name="create-outline" size={15} color={colors.accentText} />
        <Text style={styles.title}>{t('home.reviewPrompt')}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {games.map((g) => (
          <Pressable
            key={g.appid}
            style={({ pressed }) => [styles.card, pressed && PRESSED]}
            onPress={() => open(g)}
            accessibilityRole="button"
            accessibilityLabel={`${g.name} — ${t('home.reviewPrompt')}`}
          >
            <Image source={g.image} style={styles.img} contentFit="cover" transition={140} />
            <Text style={styles.name} numberOfLines={1}>{g.name}</Text>
            {/* Saat DOĞRULANMIŞ: sunucunun Steam'den okuduğu değer. Burada
                görünmesi, yazacak olan kişiye de "senin gerçek saatin
                yazının altında duracak" diyor. */}
            <Text style={[styles.hours, NUMERIC]}>
              {Math.round(g.hours)}{lang === 'tr' ? ' saat' : ' h'}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ReviewComposer
        visible={!!composer}
        onClose={() => setComposer(null)}
        appid={composer?.appid}
        gameName={composer?.name}
        existing={null}
        onSaved={() => { setComposer(null); onWritten?.(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.lg, marginBottom: 10,
  },
  // Bölüm başlıkları büyük harf ve gri; bu başlık VURGU RENGİNDE çünkü
  // diğerleri "işte içerik" derken bu "sıra sende" diyor. Aynı görünseydi
  // bir liste başlığı sanılırdı.
  title: {
    color: colors.accentText, fontSize: type.caption, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  card:  { width: 140 },
  img:   { width: 140, height: 66, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  name:  { color: colors.text, fontSize: type.caption, fontWeight: '700', marginTop: 5 },
  hours: { color: colors.green, fontSize: type.caption2, fontWeight: '700', marginTop: 1 },
});
