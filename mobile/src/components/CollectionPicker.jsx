// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon seçim sayfası — bir oyunu listelere ekle/çıkar.
// Detay ekranından açılır; tek sorumluluğu seçim, veri yazımı store'da.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing, PRESSED } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import IconButton from './IconButton';

export default function CollectionPicker({
  visible, onClose, collections, selectedIds, game, onToggle, onCreate,
}) {
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submitNew = useCallback(async () => {
    const clean = name.trim();
    if (!clean) return;
    const id = await onCreate(clean);
    if (!id) { Alert.alert(t('col.limitReached')); return; }
    // Yeni koleksiyon oluşturulunca oyunu doğrudan içine koy — beklenen davranış
    await onToggle(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName('');
    setAdding(false);
  }, [name, onCreate, onToggle, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={({ pressed }) => [styles.backdrop, pressed && PRESSED]} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={({ pressed }) => [styles.sheet, pressed && PRESSED]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.title}>{t('col.addTo')}</Text>
            <Text numberOfLines={1} style={styles.gameName}>{game?.name}</Text>

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {collections.length === 0 && !adding ? (
                <Text style={styles.emptyText}>{t('col.emptyText')}</Text>
              ) : null}

              {collections.map((c) => {
                const on = selectedIds.has(c.id);
                return (
                  <Pressable
                    key={c.id}
                    style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
                    onPress={async () => {
                      Haptics.selectionAsync();
                      await onToggle(c.id);
                    }}
                  >
                    <Text style={styles.rowEmoji}>{c.emoji}</Text>
                    <View style={styles.rowBody}>
                      <Text numberOfLines={1} style={styles.rowName}>{c.name}</Text>
                      <Text style={styles.rowMeta}>{(c.games || []).length} {t('col.gameCount')}</Text>
                    </View>
                    <View style={[styles.check, on && styles.checkOn]}>
                      {on ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              })}

              {adding ? (
                <View style={styles.newRow}>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={t('col.namePlaceholder')}
                    placeholderTextColor={colors.text3}
                    style={styles.input}
                    maxLength={60}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submitNew}
                  />
                  <IconButton icon='checkmark' size={19} color="#fff" onPress={submitNew} disabled={!name.trim()} style={[styles.miniCta, !name.trim() && styles.ctaOff]} />
                </View>
              ) : (
                <Pressable style={({ pressed }) => [styles.addRow, pressed && PRESSED]} onPress={() => setAdding(true)}>
                  <Ionicons name="add-circle-outline" size={21} color={colors.accent} />
                  <Text style={styles.addText}>{t('col.new')}</Text>
                </Pressable>
              )}
            </ScrollView>

            <Pressable style={({ pressed }) => [styles.done, pressed && PRESSED]} onPress={onClose}>
              <Text style={styles.doneText}>{t('col.save')}</Text>
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
    maxHeight: '82%',
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.5, marginBottom: 14,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '900' },
  gameName: { color: colors.text2, fontSize: 13, marginTop: 3, marginBottom: 12 },

  list: { flexGrow: 0 },
  emptyText: { color: colors.text2, fontSize: 13, lineHeight: 20, paddingVertical: 10 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11 },
  rowEmoji: { fontSize: 22 },
  rowBody: { flex: 1 },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: colors.text3, fontSize: 12, marginTop: 2 },
  check: {
    width: 25, height: 25, borderRadius: 13,
    borderWidth: 2, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13 },
  addText: { color: colors.accentText, fontSize: 15, fontWeight: '700' },

  newRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  input: {
    flex: 1, backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 13, height: 46, color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  miniCta: {
    width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaOff: { opacity: 0.4 },

  done: {
    height: 50, borderRadius: radius.lg, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', marginTop: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  doneText: { color: colors.text, fontSize: 15, fontWeight: '800' },
});
