// ─────────────────────────────────────────────────────────────────────────────
// G-02b · İlgi alanları (27 Eyl)
//
// İki kapıdan açılıyor:
//   · Tanıtım (`?kaynak=tanitim`): kaynak/G-02b-Interests — geri, 3 adımlı
//     ilerleme (2. adım), "Atla", altta "Devam et". Sonra oturum yoksa giriş
//     (G-03, adım 3), varsa ana sayfa.
//   · Ayarlar → İlgi alanları: 2.0 NavBar, altta "Kaydet".
//
// Seçimlerin asıl etkisi: türler zevk profiline yazılıyor (services/ilgiler).
// Metin yalnız bunu vaat ediyor — "önerilerini kişiselleştireceğiz".
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Icon } from '../src/components/Icon';
import { Button, PressableScale, Txt } from '../src/components/ui/Primitives';
import { NavBar } from '../src/components/ui/Navigation';
import { StoreBadge } from '../src/components/ui/Commerce';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { turAdi } from '../src/services/genreName';
import { MAGAZALAR, PLATFORMLAR, TURLER, ilgileriKaydet, useIlgiler } from '../src/services/ilgiler';
import { layout, radius, space } from '../src/theme/tokens';

const ADIM = 2;           // tanıtım · ilgi alanları · giriş
const ADIM_SAYISI = 3;

function IlgiCipi({ etiket, secili, onPress, on }) {
  const { colors } = useDesignTheme();
  return (
    <PressableScale onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: secili }}
      accessibilityLabel={etiket}
      style={[styles.cip, { backgroundColor: secili ? colors.primary : colors.surface2 }]}>
      {on}
      <Txt variant="input" numberOfLines={1} style={{ color: secili ? colors.onPrimary : colors.text, fontWeight: '600' }}>{etiket}</Txt>
    </PressableScale>
  );
}

export default function IlgilerEkrani() {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account } = useAuth();
  const { kaynak } = useLocalSearchParams();
  const tanitim = kaynak === 'tanitim';
  const kayitli = useIlgiler();

  const [platformlar, setPlatformlar] = useState(kayitli.platformlar);
  const [turler, setTurler] = useState(kayitli.turler);
  const [magazalar, setMagazalar] = useState(kayitli.magazalar);
  const [mesgul, setMesgul] = useState(false);
  // Depo geç yüklenirse (soğuk açılış) seçimleri bir kez ondan al.
  useEffect(() => {
    setPlatformlar(kayitli.platformlar); setTurler(kayitli.turler); setMagazalar(kayitli.magazalar);
  }, [kayitli.kaydedildi]); // eslint-disable-line react-hooks/exhaustive-deps

  const degistir = (liste, setListe, deger) => {
    Haptics.selectionAsync().catch(() => {});
    setListe(liste.includes(deger) ? liste.filter((x) => x !== deger) : [...liste, deger]);
  };

  const bitir = () => {
    if (tanitim && !account) router.replace('/account');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const kaydet = async () => {
    setMesgul(true);
    try { await ilgileriKaydet({ platformlar, turler, magazalar }); } finally { setMesgul(false); }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    bitir();
  };

  const turSecenekleri = useMemo(() => TURLER.map((g) => ({ deger: g, etiket: turAdi(g, t) })), [t]);

  const bolum = (baslik, cocuklar) => (
    <View style={styles.bolum}>
      <Txt variant="subhead" style={{ color: colors.text2, fontWeight: '600' }}>{baslik}</Txt>
      <View style={styles.cipler}>{cocuklar}</View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.kok, { backgroundColor: colors.bg }]}>
      {tanitim ? (
        <View style={styles.ust}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')} style={styles.ustYan}>
            <Icon name="back" size={24} color={colors.text} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.ilerleme} accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: ADIM_SAYISI, now: ADIM }}>
            {Array.from({ length: ADIM_SAYISI }, (_, i) => (
              <View key={i} style={[styles.ilerlemeParca, { backgroundColor: i < ADIM ? colors.red : colors.surface3 }]} />
            ))}
          </View>
          <Pressable onPress={bitir} hitSlop={10} accessibilityRole="button" style={[styles.ustYan, styles.ustSag]}>
            <Txt variant="input" style={{ color: colors.text2 }}>{t('onb.skip')}</Txt>
          </Pressable>
        </View>
      ) : (
        <NavBar title={t('ilgi.entry')} />
      )}

      <ScrollView contentContainerStyle={[styles.icerik, { paddingBottom: insets.bottom + 96 }]} showsVerticalScrollIndicator={false}>
        {tanitim ? (
          <View style={styles.baslik}>
            <Txt variant="largeTitle" accessibilityRole="header">{t('ilgi.title')}</Txt>
            <Txt variant="bodyLarge" style={{ color: colors.text2 }}>{t('ilgi.desc')}</Txt>
          </View>
        ) : (
          <Txt variant="body" style={[styles.ayarAciklama, { color: colors.text2 }]}>{t('ilgi.desc')}</Txt>
        )}

        {bolum(t('ilgi.platforms'), PLATFORMLAR.map((p) => (
          <IlgiCipi key={p} etiket={t(`ilgi.${p}`)} secili={platformlar.includes(p)}
            onPress={() => degistir(platformlar, setPlatformlar, p)}
            on={p === 'pc' ? <Icon name="monitor" size={18} color={platformlar.includes(p) ? colors.onPrimary : colors.text} /> : null} />
        )))}

        {bolum(t('ilgi.genres'), turSecenekleri.map((g) => (
          <IlgiCipi key={g.deger} etiket={g.etiket} secili={turler.includes(g.deger)}
            onPress={() => degistir(turler, setTurler, g.deger)} />
        )))}

        {bolum(t('ilgi.stores'), MAGAZALAR.map((m) => (
          <IlgiCipi key={m} etiket={m} secili={magazalar.includes(m)}
            onPress={() => degistir(magazalar, setMagazalar, m)}
            on={<StoreBadge store={m} size={22} radius={6} font={12} />} />
        )))}
      </ScrollView>

      <View style={[styles.alt, { paddingBottom: insets.bottom + space[12], backgroundColor: colors.bg }]}>
        <Button title={tanitim ? t('onb.continue') : t('ilgi.save')} height={52} onPress={kaydet} loading={mesgul} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  ust: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter },
  ustYan: { width: 72, height: 44, justifyContent: 'center' },
  ustSag: { alignItems: 'flex-end' },
  ilerleme: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: space[8] },
  ilerlemeParca: { width: 36, height: 4, borderRadius: 2 },
  icerik: { paddingHorizontal: layout.gutter, gap: space[24] },
  baslik: { gap: space[8], paddingTop: space[16] },
  ayarAciklama: { paddingTop: space[8] },
  bolum: { gap: space[12] },
  cipler: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  cip: {
    height: 40, flexDirection: 'row', alignItems: 'center', gap: space[8],
    paddingHorizontal: space[16], borderRadius: radius.pill,
  },
  alt: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: layout.gutter, paddingTop: space[12] },
});
