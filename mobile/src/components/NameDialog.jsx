// ─────────────────────────────────────────────────────────────────────────────
// Ad penceresi — koleksiyon OLUŞTURMA ve YENİDEN ADLANDIRMA.
//
// İki ekranda birebir aynı pencere ayrı ayrı yazılıydı (collections.jsx ve
// collection/[id].jsx: aynı kutu, aynı alan, aynı iki düğme). 2.0'a geçerken
// tek yere toplandı; oluşturmadaki emoji seçici `children` olarak geliyor.
//
// ORTADA DURAN PENCERE, alt sayfa değil: tek alanlı, klavyeyle açılan kısa bir
// iş. Yüzey 2.0 alt sayfasının (G-06b) dili: bg2, köşe 24; gölge popover'ın
// (ortada duran yüzey — sheet gölgesi yukarı vuruyor, alttan açılan sayfa için).
// ─────────────────────────────────────────────────────────────────────────────
import { View, Pressable, StyleSheet, Modal, KeyboardAvoidingView } from 'react-native';

import { Button, TextField, Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K, control as C, radius as dsRadius, shadow, space } from '../theme/tokens';
import { SHEET_LAYOUT } from '../theme';
import { useStyles } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

/**
 * @param {boolean}  visible
 * @param {string}   title         "Yeni koleksiyon" / "Yeniden adlandır"
 * @param {string}   value
 * @param {Function} onChangeText
 * @param {Function} onClose
 * @param {Function} onSubmit      boş adla çağrılmaz (düğme devre dışı; klavyedeki
 *                                 "bitti" için çağıran ayrıca boşluğu eliyor)
 * @param {string}   submitLabel   "Oluştur" / "Kaydet"
 * @param {node}    [children]     alanın üstünde (emoji seçici)
 */
export default function NameDialog({ visible, title, value, onChangeText, onClose, onSubmit, submitLabel, children }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const bos = !value.trim();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior="padding" style={styles.kav}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.bg2 }]} onPress={(e) => e.stopPropagation()}>
            <Txt variant="headline" accessibilityRole="header">{title}</Txt>
            {children}
            <TextField
              label={t('col.namePlaceholder')}
              value={value}
              onChangeText={onChangeText}
              maxLength={60}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />
            <View style={styles.actions}>
              <Button title={t('col.cancel')} variant="secondary" height={44} onPress={onClose} style={styles.action} />
              <Button title={submitLabel} height={44} onPress={onSubmit} disabled={bos} style={styles.action} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/**
 * Emoji seçici — oluşturma penceresinin `children`'ı. Seçili emoji TextField
 * odak halkasıyla aynı dilde: 2 pt kırmızı çerçeve.
 */
export function EmojiPicker({ emojis, value, onChange }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  return (
    <View style={styles.emojiRow}>
      {emojis.map((e) => (
        <Pressable
          key={e}
          onPress={() => onChange(e)}
          accessibilityRole="button"
          accessibilityLabel={e}
          accessibilityState={{ selected: value === e }}
          style={[styles.emojiBtn, { backgroundColor: colors.surface1, borderColor: value === e ? colors.red : 'transparent' }]}
        >
          <Txt variant="headline">{e}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

// Karartma eski temadan (`colors.overlay`) — FilterSheet'le aynı kaynak.
const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space[20] },
  kav: { width: '100%', alignItems: 'center' },
  // Ortak pencere sınırı (tablet kolonu) + bu pencerenin daha dar üst sınırı.
  sheet: {
    ...SHEET_LAYOUT, maxWidth: K.nameDialog.maxWidth, borderRadius: dsRadius.sheet,
    padding: space[20], gap: space[16], boxShadow: shadow.popover,
  },
  actions: { flexDirection: 'row', gap: space[12] },
  action: { flex: 1 },

  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  emojiBtn: {
    width: K.nameDialog.emoji, height: K.nameDialog.emoji, borderRadius: dsRadius.button,
    alignItems: 'center', justifyContent: 'center', borderWidth: C.fieldFocusWidth,
  },
});
