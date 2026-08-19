// ─────────────────────────────────────────────────────────────────────────────
// KİŞİ MENÜSÜ — "⋯" sözünü tutuyor (Faz 7)
//
// NEDEN VAR. İki kırılma birden:
//
//   1. YANILTICI GÖSTERGE. Arkadaş satırındaki üç nokta doğrudan silme onayını
//      açıyordu. Üç nokta EVRENSEL olarak "başka seçenekler" demek; kullanıcı
//      seçenek görmeye basıp geri alınamaz bir onayla karşılaşıyordu —
//      keşfetmeye çalıştığı için cezalandırılıyordu.
//
//   2. GİZLİ JESTLER. Engellemenin TEK yolu uzun basmaydı; üstelik aynı jest
//      arkadaş listesinde "engelle", arama sonucunda "şikayet et" veriyordu.
//      Aynı jest, iki sonuç, hiçbiri görünür değil. App Store 1.2 engelleme
//      ve şikayetin BULUNABİLİR olmasını istiyor.
//
// Uzun basma kısayol olarak KALIYOR ama artık iki listede de aynı menüyü
// açıyor: gizli jest bir bonus olabilir, tek erişim yolu olamaz.
//
// SIRA BİLGİ TAŞIYOR: yapıcı olanlar üstte, geri alınamaz olan en altta —
// yanlış dokunma maliyetinin en düşük olduğu yer. Satır 52pt (48 değil):
// yıkıcı seçenekler arasında ekstra pay.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Avatar from './Avatar';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, spacing, type, PRESSED } from '../theme';

/**
 * @param {object}  person   { uid, username, displayName, avatar }
 * @param {bool}    arkadas  arkadaşsa "çıkar" ve "mesaj" görünür
 * @param {func}    onSec    (anahtar) → 'profile'|'message'|'remove'|'block'|'report'
 */
export default function PersonMenu({ visible, person, arkadas = false, onClose, onSec }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (!person) return null;

  // "PROFİLİNE GİT" YOK — bilerek. Faz 7'nin maketi bunu ilk seçenek olarak
  // çiziyor ama uygulamada BAŞKA BİR KULLANICININ PROFİL EKRANI YOK: tek
  // kişiye özel hedef `/chat/[uid]`. Gidecek yeri olmayan bir menü satırı
  // koymak, kullanıcıyı hiçbir yere götüren bir söz vermek olurdu.
  // (Bu deponun kuralı: hesaplanamayan basamak tasarlanmaz.)
  const secenekler = [
    arkadas && { anahtar: 'message', etiket: t('soc.menu.message'), ikon: 'chatbubble-outline' },
    arkadas && { anahtar: 'remove', etiket: t('soc.menu.remove'), ikon: 'person-remove-outline', yikici: true, ayirici: true },
    { anahtar: 'block', etiket: t('soc.menu.block'), ikon: 'ban-outline', yikici: true, ayirici: !arkadas },
    { anahtar: 'report', etiket: t('soc.menu.report'), ikon: 'flag-outline', yikici: true },
  ].filter(Boolean);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Zeminde PRESSED YOK — Faz 6'nın şikayet sayfasında düzelttiği kusurun
          aynısı: basma geri bildirimi dokunulabilir ÖĞEYE aittir. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />

          <View style={styles.head}>
            <Avatar avatar={person.avatar} name={person.displayName || person.username} size={42} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={styles.ad}>{person.displayName || person.username}</Text>
              <Text numberOfLines={1} style={styles.kullanici}>@{person.username}</Text>
            </View>
          </View>

          {secenekler.map((s) => (
            <View key={s.anahtar}>
              {s.ayirici ? <View style={styles.ayirici} /> : null}
              <Pressable
                onPress={() => { onClose(); onSec(s.anahtar); }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.satir, pressed && PRESSED]}
              >
                <Ionicons
                  name={s.ikon}
                  size={19}
                  color={s.yikici ? colors.danger : colors.text2}
                />
                <Text style={[styles.satirText, s.yikici && styles.satirYikici]}>{s.etiket}</Text>
              </Pressable>
            </View>
          ))}
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
    paddingHorizontal: spacing.s20, paddingTop: spacing.s8, paddingBottom: spacing.s32,
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.cardBorder, marginBottom: spacing.s16,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.s12, paddingBottom: spacing.s8 },
  ad: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  kullanici: { color: colors.text3, fontSize: type.footnote },
  ayirici: {
    height: StyleSheet.hairlineWidth, backgroundColor: colors.cardBorder,
    marginVertical: spacing.s8,
  },
  // 52pt bilinçli: yıkıcı seçenekler arasında yanlış dokunma payı.
  satir: { height: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.s12 },
  satirText: { color: colors.text, fontSize: type.subhead, fontWeight: '600' },
  satirYikici: { color: colors.danger },
});
