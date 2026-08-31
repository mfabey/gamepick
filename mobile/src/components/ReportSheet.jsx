// ─────────────────────────────────────────────────────────────────────────────
// Şikayet sayfası — App Store Guideline 1.2'nin ikinci şartının kullanıcıya
// görünen yüzü. Kullanıcı veya içerik şikayet edilebilir.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { reportContent } from '../api/social';
import { radius, spacing, PRESSED, type } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const REASONS = [
  'spam', 'harassment', 'hate', 'sexual', 'violence', 'impersonation', 'illegal', 'other',
];

export default function ReportSheet({ visible, onClose, targetType, targetId, targetLabel }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const close = useCallback(() => {
    setReason(null);
    setNote('');
    setSending(false);
    onClose();
  }, [onClose]);

  const submit = useCallback(async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await reportContent({ targetType, targetId, reason, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('soc.reportSent'));
      close();
    } catch (e) {
      Alert.alert(t(`soc.err.${e?.code}`) !== `soc.err.${e?.code}` ? t(`soc.err.${e.code}`) : t('soc.err.generic'));
      setSending(false);
    }
  }, [reason, note, sending, targetType, targetId, close, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      {/* FAZ 6, KUSUR — YÜZEYDEKİ `PRESSED` KALKTI.
          Hem zemine hem sayfaya `pressed && PRESSED` verilmişti: sayfanın
          HERHANGİ BİR YERİNE dokunmak tüm yüzeyi %65 opaklığa düşürüyordu.
          Bir sebep seçmek, hatta metin alanına dokunmak sayfayı yanıp
          söndürüyordu.

          İlke: basma geri bildirimi DOKUNULABİLİR ÖĞEYE aittir, onu taşıyan
          yüzeye değil. İkisi de hâlâ Pressable — biri kapatıyor, öteki
          dokunuşu yutuyor — ama görsel tepki vermiyorlar. */}
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior="padding">
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.title}>{t('soc.reportTitle')}</Text>
            {targetLabel ? <Text numberOfLines={1} style={styles.target}>{targetLabel}</Text> : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {REASONS.map((r) => {
                const on = reason === r;
                return (
                  <Pressable
                    key={r}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                    onPress={() => { Haptics.selectionAsync(); setReason(r); }}
                  >
                    <Text style={styles.rowText}>{t(`soc.reason.${r}`)}</Text>
                    <View style={[styles.radio, on && styles.radioOn]}>
                      {on ? <Ionicons name="checkmark" size={14} color={colors.bg} /> : null}
                    </View>
                  </Pressable>
                );
              })}

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('soc.reportNote')}
                placeholderTextColor={colors.text3}
                style={styles.input}
                maxLength={500}
                multiline
              />
            </ScrollView>

            <Pressable
              style={[styles.cta, (!reason || sending) && styles.ctaOff]}
              onPress={submit}
              disabled={!reason || sending}
            >
              {sending
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.ctaText, (!reason || sending) && styles.ctaTextOff]}>{t('soc.reportSubmit')}</Text>}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 28,
    maxHeight: '85%',
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.5, marginBottom: 14,
  },
  title: { color: colors.text, fontSize: type.body, fontWeight: '900' },
  target: { color: colors.text2, fontSize: type.footnote, marginTop: 3 },

  list: { flexGrow: 0, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowText: { flex: 1, color: colors.text, fontSize: type.subhead, fontWeight: '600' },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  // FAZ 6 — SEÇİM NÖTR. Ekranda İKİ farklı kırmızı vardı: seçili radyo
  // `accent`, CTA `danger` — biri bilgi biri eylem. Kırmızı bir sebebi
  // işaretlemiyor; seçim Faz 4/5'in nötr dolgu diline geçti.
  radioOn: { backgroundColor: colors.text, borderColor: colors.text },

  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 13, paddingTop: spacing.md, paddingBottom: spacing.md,
    minHeight: 78, color: colors.text, fontSize: type.subhead,
    borderWidth: 1, borderColor: colors.cardBorder,
    marginTop: spacing.sm, textAlignVertical: 'top',
  },

  // FAZ 6 — TEK GÖNDER DİLİ: 44pt · radius.md · subhead 15/600.
  // Dolgu `danger` KALIYOR: bu ekranın eylemi gerçekten yıkıcı. Anlam
  // farkı RENKTE, biçimde değil — kullanıcı yıkıcı eylemi renkten ayırt
  // ediyor, boyuttan değil.
  cta: {
    height: 44, borderRadius: radius.md, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  ctaOff: { backgroundColor: colors.bgInput },
  // tema-bagimsiz: dolu danger dugmesinin uzerinde
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },
  ctaTextOff: { color: colors.text3 },
});
