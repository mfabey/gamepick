// ─────────────────────────────────────────────────────────────────────────────
// KART MENÜSÜ — oyun kartına uzun basınca
//
// NEDEN VAR. Uzun basma tek bir yıkıcı eyleme ("İlgilenmiyorum") bağlıydı ve
// bu Faz 7'de kişi satırında düzelttiğim kalıbın aynısı: gizli bir jest tek
// erişim yolu olamaz, ve aynı jest her yerde farklı bir sonuç veremez.
//
// Paylaşım eklenince sorun somutlaştı: iki eylem var, jest bir tane. Menü
// ikisini de görünür kılıyor.
//
// SIRA: yapıcı olan üstte, eleyici altta — PersonMenu ile aynı kural.
// "İlgilenmiyorum" YIKICI DEĞİL (geri alınabilir bir tercih), o yüzden
// danger rengi taşımıyor; yalnız ikincil.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { radius, spacing, type, PRESSED } from '../theme';

/**
 * @param {object}  game      { id, name }
 * @param {func}    onGonder  "Arkadaşa gönder"
 * @param {func}   [onEle]    "İlgilenmiyorum" — verilmezse satır çıkmıyor
 */
export default function CardMenu({ visible, game, onClose, onGonder, onEle }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  if (!game) return null;

  const secenekler = [
    { anahtar: 'send', etiket: t('share.toFriend'), ikon: 'paper-plane-outline', calistir: onGonder },
    onEle && { anahtar: 'dismiss', etiket: t('home.notInterested'), ikon: 'close-circle-outline', calistir: onEle },
  ].filter(Boolean);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Zeminde PRESSED yok — Faz 6'da şikayet sayfasında düzeltilen kusurun
          aynısı: basma geri bildirimi dokunulabilir öğeye aittir. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text numberOfLines={2} style={styles.ad}>{game.name}</Text>

          {secenekler.map((s) => (
            <Pressable
              key={s.anahtar}
              onPress={() => { onClose(); s.calistir?.(); }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.satir, pressed && PRESSED]}
            >
              <Ionicons name={s.ikon} size={19} color={colors.text2} />
              <Text style={styles.satirText}>{s.etiket}</Text>
            </Pressable>
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
  ad: { color: colors.text, fontSize: type.subhead, fontWeight: '700', marginBottom: spacing.s8 },
  satir: { height: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.s12 },
  satirText: { color: colors.text, fontSize: type.subhead, fontWeight: '600' },
});
