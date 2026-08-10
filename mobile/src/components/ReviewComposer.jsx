import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { writeReview, removeReview } from '../api/social';
import { colors, radius, spacing, type, PRESSED } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// İnceleme yazma penceresi.
//
// KAPI SUNUCUDA. İstemci "yazabilir mi" diye tahmin etmiyor; deniyor ve
// sunucunun döndürdüğü kodu (NOT_IN_LIBRARY / NOT_ENOUGH_HOURS) kullanıcı
// diline çeviriyor. Tek doğruluk kaynağı sunucu — istemcide ikinci bir kural
// kümesi tutmak, iki kuralın zamanla ayrışması demek.
//
// ÖNERİ SEÇİMİ İKİLİ, yıldız değil. Yıldızda her şey 4 çıkıyor ve bilgi
// taşımıyor; oyuncular Steam'den bu dili zaten biliyor.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TEXT = 2000;

export default function ReviewComposer({ visible, onClose, appid, gameName, existing, onSaved }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [rec, setRec] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(existing?.text || '');
    setRec(existing ? !!existing.recommended : true);
  }, [visible, existing]);

  const save = useCallback(async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await writeReview(appid, text.trim(), rec);
      onSaved?.();
    } catch (e) {
      const c = e?.code;
      Alert.alert(
        c === 'NOT_IN_LIBRARY'       ? t('rev.notInLibrary')
          : c === 'NOT_ENOUGH_HOURS'   ? t('rev.notEnoughHours')
          : c === 'TEXT_INAPPROPRIATE' ? t('msg.inappropriate')
          : c === 'TEXT_TOO_LONG'      ? t('msg.tooLong')
          : t('rev.saveFailed')
      );
    } finally {
      setBusy(false);
    }
  }, [text, rec, busy, appid, onSaved, t]);

  const del = useCallback(() => {
    Alert.alert(t('rev.deleteTitle'), t('rev.deleteText'), [
      { text: t('msg.cancel'), style: 'cancel' },
      {
        text: t('rev.delete'),
        style: 'destructive',
        onPress: async () => {
          try { await removeReview(appid); onSaved?.(); }
          catch { Alert.alert(t('rev.saveFailed')); }
        },
      },
    ]);
  }, [appid, onSaved, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title} numberOfLines={1}>{gameName || ''}</Text>

          <View style={styles.recRow}>
            <Pressable
              style={({ pressed }) => [styles.recBtn, rec && styles.recOn, pressed && PRESSED]}
              onPress={() => setRec(true)}
            >
              <Ionicons name="thumbs-up" size={16} color={rec ? colors.green : colors.text3} />
              <Text style={[styles.recText, rec && { color: colors.text }]}>{t('rev.yes')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.recBtn, !rec && styles.recOff, pressed && PRESSED]}
              onPress={() => setRec(false)}
            >
              <Ionicons name="thumbs-down" size={16} color={!rec ? colors.danger : colors.text3} />
              <Text style={[styles.recText, !rec && { color: colors.text }]}>{t('rev.no')}</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('rev.placeholder')}
              placeholderTextColor={colors.text3}
              maxLength={MAX_TEXT}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.actions}>
            {existing
              ? (
                <Pressable style={({ pressed }) => [styles.delBtn, pressed && PRESSED]} onPress={del}>
                  <Text style={styles.delText}>{t('rev.delete')}</Text>
                </Pressable>
              )
              : <View style={{ flex: 1 }} />}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, (!text.trim() || busy) && styles.saveOff, pressed && PRESSED]}
              onPress={save}
              disabled={!text.trim() || busy}
            >
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>{t('rev.save')}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: colors.overlay },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%', backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl,
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: colors.cardBorder, marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: type.subhead, fontWeight: '800', marginBottom: spacing.md },

  recRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  recBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 44, borderRadius: radius.md,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: 'transparent',
  },
  recOn:   { borderColor: colors.green },
  recOff:  { borderColor: colors.danger },
  recText: { color: colors.text3, fontSize: type.footnote, fontWeight: '700' },

  input: {
    minHeight: 140, color: colors.text, fontSize: type.subhead, lineHeight: 21,
    backgroundColor: colors.bgInput, borderRadius: radius.md, padding: spacing.md,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  delBtn:  { flex: 1, minHeight: 44, justifyContent: 'center' },
  delText: { color: colors.danger, fontSize: type.footnote, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: spacing.xl, minHeight: 44, borderRadius: radius.md,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  saveOff:  { backgroundColor: colors.bgHover },
  saveText: { color: '#fff', fontSize: type.footnote, fontWeight: '800' },
});
