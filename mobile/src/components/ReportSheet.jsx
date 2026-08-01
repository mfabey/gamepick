// ─────────────────────────────────────────────────────────────────────────────
// Şikayet sayfası — App Store Guideline 1.2'nin ikinci şartının kullanıcıya
// görünen yüzü. Kullanıcı veya içerik şikayet edilebilir.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { reportContent } from '../api/social';
import { colors, radius, spacing } from '../theme';
import { useLanguage } from '../context/LanguageContext';

const REASONS = [
  'spam', 'harassment', 'hate', 'sexual', 'violence', 'impersonation', 'illegal', 'other',
];

export default function ReportSheet({ visible, onClose, targetType, targetId, targetLabel }) {
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
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                      {on ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
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
                : <Text style={styles.ctaText}>{t('soc.reportSubmit')}</Text>}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  target: { color: colors.text2, fontSize: 13, marginTop: 3 },

  list: { flexGrow: 0, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowText: { flex: 1, color: colors.text, fontSize: 14.5, fontWeight: '600' },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.accent, borderColor: colors.accent },

  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 13, paddingTop: 12, paddingBottom: 12,
    minHeight: 78, color: colors.text, fontSize: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
    marginTop: 8, textAlignVertical: 'top',
  },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
