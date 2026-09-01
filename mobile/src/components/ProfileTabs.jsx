import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { spacing, PRESSED, SECTION_TITLE, NUMERIC } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Profil içerik sekmeleri — YALNIZ İKON, etiket yok.
//
// KARAR 1 (handoff, tartışmaya kapalı): dört sekmenin Almanca etiketleri
// (Sammlung · Wunschliste · Bewertungen · Beiträge) 97pt'lik sütuna sığmıyor.
// Beş dil paritesi zorunlu olduğu için etiketi sığdırmaya çalışmak ya puntoyu
// okunmaz kılardı ya da metni kısaltırdı. İkon + ALTINDAKİ BAĞLAM SATIRI
// aynı bilgiyi taşıyor: "KOLEKSİYON · 214".
//
// Yani sekme adı kaybolmuyor, YER DEĞİŞTİRİYOR — ve aktif sekmenin adı zaten
// tek ihtiyaç duyulan ad.
//
// ERİŞİLEBİLİRLİK: aktif durum yalnız renkle anlatılmıyor (2pt alt çizgi +
// ikon tonu + accessibilityState.selected).
// ─────────────────────────────────────────────────────────────────────────────

export const PROFILE_TABS = [
  { key: 'collection', icon: 'grid-outline',              label: 'prof.tab.collection' },
  { key: 'wishlist',   icon: 'heart-outline',             label: 'prof.tab.wishlist' },
  { key: 'reviews',    icon: 'shield-checkmark-outline',  label: 'prof.tab.reviews' },
  { key: 'posts',      icon: 'chatbubble-outline',        label: 'prof.tab.posts' },
];

/**
 * @param active   etkin sekme anahtarı
 * @param counts   `/api/social/profile` sayaçları — bağlam satırındaki sayı
 * @param disabled gizli profil: şerit GÖRÜNÜR ama dokunulamaz (bkz. aşağıda)
 * @param right    bağlam satırının sağı (sıralama/filtre) — isteğe bağlı
 */
export default function ProfileTabs({ active, counts = {}, onChange, disabled = false, right = null }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();

  const aktif = PROFILE_TABS.find((x) => x.key === active) || PROFILE_TABS[0];
  const sayi = counts[aktif.key];

  return (
    <View>
      {/* GİZLİ PROFİLDE ŞERİT SİLİNMİYOR, SOLUYOR: kullanıcıya sayfanın
          yapısını öğretiyor ("burada dört sekme var") ama içeriğe söz
          vermiyor. Silmek, gizli profili bozuk bir sayfa gibi gösterirdi. */}
      <View style={[styles.strip, disabled && styles.stripOff]} pointerEvents={disabled ? 'none' : 'auto'}>
        {PROFILE_TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                if (on) return;
                Haptics.selectionAsync().catch(() => {});
                onChange?.(tab.key);
              }}
              style={({ pressed }) => [styles.tab, pressed && PRESSED]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(tab.label)}
            >
              <Ionicons name={tab.icon} size={20} color={on ? colors.text : colors.text3} />
              {on ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.context}>
        <Text style={styles.contextLabel} numberOfLines={1}>
          {t(aktif.label)}
          {Number.isFinite(sayi) ? <Text style={NUMERIC}>{` · ${sayi}`}</Text> : null}
        </Text>
        {right}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  strip: {
    height: 48, flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.cardBorder,
  },
  stripOff: { opacity: 0.4 },
  // Sütun genişliği flex'e bırakıldı: 390pt'de 97.5 çıkıyor (maket ölçüsü) ve
  // dar cihazda kendiliğinden daralıyor. Yükseklik 48 sabit — 44'lük dokunma
  // eşiğinin üstünde.
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  underline: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
    // Ekran başına izin verilen üç kırmızıdan biri (handoff denetim tablosu).
    // accent-serbest: AKTİF DURUM İŞARETİ — çizgi metin taşımıyor, kontrast eşiği geçerli değil
    backgroundColor: colors.accent,
  },

  context: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.s20, paddingTop: spacing.s12, paddingBottom: spacing.s8,
  },
  // Uygulamanın üstyazı jetonu (12/700/uppercase) kullanılıyor, maketin
  // 11/600'ü değil: bu depo bölüm başlığını bir kez ölçüp SECTION_TITLE'a
  // bağladı ve 40+ yerde o duruyor. Tek ekran için ikinci bir üstyazı
  // kademesi açmak, o kararı sessizce bozardı.
  contextLabel: { ...SECTION_TITLE, color: colors.text3, flex: 1, minWidth: 0 },
});
