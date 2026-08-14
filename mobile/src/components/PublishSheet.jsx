// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyonu toplulukla paylaşma sayfası.
//
// Yayınlama SUNUCUDA içerik süzgecinden geçer (başlık + açıklama); buradaki
// doğrulama yalnızca boş göndermeyi engelliyor, güvenlik sınırı sunucuda.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { publishList } from '../api/social';
import { colors, radius, spacing, PRESSED, type } from '../theme';
import { useLanguage } from '../context/LanguageContext';

export default function PublishSheet({ visible, onClose, collection, publishedId, onPublished }) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  // Sayfa her açılışında koleksiyonun güncel adıyla başlasın
  useEffect(() => {
    if (visible && collection) {
      setTitle(collection.name || '');
      setDesc('');
    }
  }, [visible, collection]);

  const submit = useCallback(async () => {
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const r = await publishList({
        id: publishedId || null,
        title: clean,
        description: desc.trim(),
        emoji: collection?.emoji || '🎮',
        games: (collection?.games || []).map((g) => ({
          id: g.id, name: g.name, image: g.image, appid: g.appid || null,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('pl.published'));
      onPublished?.(r?.list);
      onClose();
    } catch (e) {
      const key = `pl.err.${e?.code}`;
      Alert.alert(t(key) !== key ? t(key) : t('soc.err.generic'));
    } finally {
      setBusy(false);
    }
  }, [title, desc, busy, collection, publishedId, onPublished, onClose, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={({ pressed }) => [styles.backdrop, pressed && PRESSED]} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={({ pressed }) => [styles.sheet, pressed && PRESSED]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <Text style={styles.title}>{t('pl.publishTitle')}</Text>

            <View style={styles.notice}>
              <Ionicons name="globe-outline" size={15} color={colors.text2} />
              <Text style={styles.noticeText}>{t('pl.publishText')}</Text>
            </View>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('pl.listTitle')}
              placeholderTextColor={colors.text3}
              style={styles.input}
              maxLength={80}
            />
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder={t('pl.listDesc')}
              placeholderTextColor={colors.text3}
              style={[styles.input, styles.multiline]}
              maxLength={300}
              multiline
            />

            <Pressable
              style={[styles.cta, (!title.trim() || busy) && styles.ctaOff]}
              onPress={submit}
              disabled={!title.trim() || busy}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.ctaText}>{publishedId ? t('pl.update') : t('pl.publishBtn')}</Text>}
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
  },
  grabber: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.text3, opacity: 0.5, marginBottom: 14,
  },
  title: { color: colors.text, fontSize: type.body, fontWeight: '900' },

  notice: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start',
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.cardBorder, marginTop: spacing.md, marginBottom: 14,
  },
  noticeText: { flex: 1, color: colors.text2, fontSize: type.footnote, lineHeight: 18 },

  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 13, height: 50, color: colors.text, fontSize: type.subhead,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 10,
  },
  multiline: { height: 88, paddingTop: 13, textAlignVertical: 'top' },

  cta: {
    height: 52, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginTop: 6,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },
});
