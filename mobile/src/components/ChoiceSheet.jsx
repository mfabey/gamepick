// ─────────────────────────────────────────────────────────────────────────────
// TEK SEÇİMLİ ALT SAYFA — `Alert.alert`'ün buton dizisi yerine.
//
// NEDEN VAR. Android'in `AlertDialog`'u ÜÇ butondan fazlasını göstermiyor
// (positive / negative / neutral). React Native'in `Alert.alert`'ü bunun
// üstündeki butonları sessizce düşürüyor — hata da vermiyor.
//
// Ölçüldü (2026-08-31, Android 16 emülatör, release APK): ayarlardaki dil
// seçici 5 dil + İptal = 6 buton üretiyordu. Ekranda yalnız ENGLISH, ESPAÑOL
// ve PORTUGUÊS çıktı; **Deutsch, Türkçe ve İptal hiç görünmedi**. Yani
// Android'de Türkçe SEÇİLEMİYORDU — kod tabanı Türkçe olan, birincil pazarı
// Türkiye olan bir uygulamada.
//
// Bu yüzden liste tipi seçimler artık buradan geçiyor: seçenek sayısının üst
// sınırı yok, kaydırılabiliyor ve görünüm sistem diyaloğuna değil uygulamaya
// ait.
//
// KAPSAM. Yalnız TEK seçimli listeler. Onay/yıkıcı işlem diyalogları
// (silme onayı gibi) hâlâ `Alert.alert` kullanıyor; onlar iki butonlu ve
// Android'de doğru render oluyor, taşımanın acil gerekçesi yok
// (bkz. AGENTS.md — kampanya yapılmaz, dokunulan dosyada taşınır).
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { radius, spacing, PRESSED, type, TOUCH_MIN } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * @param {boolean}  visible
 * @param {string}   title        Başlık (çevrilmiş metin bekleniyor)
 * @param {Array}    options      [{ key, label, sublabel? }]
 * @param {string}   selectedKey  Seçili olanın key'i
 * @param {Function} onSelect     (key) => void — aynı key'e basılırsa çağrılmaz
 * @param {Function} onClose      () => void
 */
export default function ChoiceSheet({
  visible, title, options = [], selectedKey, onSelect, onClose,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const sec = (key) => {
    // Aynı seçeneğe basmak durumu değiştirmiyor; yine de sayfa kapanıyor ki
    // kullanıcı "bir şey olmadı" hissiyle ekranda kalmasın.
    if (key !== selectedKey) {
      Haptics.selectionAsync();
      onSelect(key);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* stopPropagation: sayfanın İÇİNE basmak kapatmasın.
            PRESSED bilerek YOK — satıra basınca tüm sayfa soluyordu. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.s24) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>

          <ScrollView style={styles.list} bounces={false}>
            {options.map((o) => {
              const secili = o.key === selectedKey;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => sec(o.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: secili }}
                  style={({ pressed }) => [styles.row, pressed && PRESSED]}
                >
                  <View style={styles.rowBody}>
                    <Text style={[styles.rowLabel, secili && styles.rowLabelOn]}>{o.label}</Text>
                    {o.sublabel ? <Text style={styles.rowSub}>{o.sublabel}</Text> : null}
                  </View>
                  {secili ? (
                    <Ionicons name="checkmark" size={21} color={colors.accentText} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && PRESSED]}
          >
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.s16, paddingTop: spacing.s12,
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.5, marginBottom: spacing.s12,
  },
  title: { color: colors.text, fontSize: type.body, fontWeight: '900', marginBottom: spacing.s4 },

  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s12,
    paddingVertical: spacing.s12, minHeight: TOUCH_MIN,
  },
  rowBody: { flex: 1 },
  rowLabel: { color: colors.text, fontSize: type.subhead, fontWeight: '600' },
  // Seçili satır YALNIZ kalınlıkla ayrılmıyor: sağdaki onay işareti asıl
  // göstergesi. Renkle ayırmak accent borcunu artırırdı.
  rowLabelOn: { fontWeight: '800' },
  rowSub: { color: colors.text3, fontSize: type.caption, marginTop: spacing.s4 },

  cancel: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.s12, marginTop: spacing.s4, minHeight: TOUCH_MIN,
  },
  cancelText: { color: colors.text2, fontSize: type.subhead, fontWeight: '700' },
});
