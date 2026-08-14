import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Modal,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing, type, PRESSED, NUMERIC } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { createPost } from '../api/social';

// ─────────────────────────────────────────────────────────────────────────────
// Gönderi / yanıt yazma penceresi.
//
// TEK BİLEŞEN İKİ İŞ: `replyTo` doluysa yanıt, boşsa yeni gönderi. Sunucuda da
// öyle — yanıt ayrı bir kayıt türü değil, `replyTo` alanı dolu bir gönderi.
// İki ayrı kompozitör yazmak aynı doğrulama ve hata yolunu ikiye bölerdi.
//
// SAYAÇ SUNUCUYLA AYNI SINIRDA (500). İstemci sınırı sunucudan gevşek olsaydı
// kullanıcı yazdığını gönderemeyip sebebini anlamazdı.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LEN = 500;

export default function PostComposer({ visible, onClose, onPosted, replyTo = null, game = null }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = useCallback(() => {
    if (busy) return;
    setText(''); setError('');
    onClose?.();
  }, [busy, onClose]);

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true); setError('');
    try {
      const r = await createPost({ text: value, game, replyTo });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setText('');
      onPosted?.(r?.post);
      onClose?.();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Sunucu kodları kullanıcıya anlamlı karşılıklarıyla dönüyor; bilinmeyen
      // kod olduğu gibi gösterilmiyor, genel mesaja düşüyor.
      const code = e?.code || '';
      setError(
        code === 'TEXT_TOO_LONG' ? t('post.errLong')
        : code === 'TEXT_INAPPROPRIATE' ? t('post.errBlocked')
        : code === 'NO_SESSION' ? t('post.errSession')
        : t('post.errGeneric')
      );
    } finally {
      setBusy(false);
    }
  }, [text, busy, game, replyTo, onPosted, onClose, t]);

  const left = MAX_LEN - text.length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Pressable onPress={close} hitSlop={10} style={({ pressed }) => pressed && PRESSED}>
              <Text style={styles.cancel}>{t('common.cancel')}</Text>
            </Pressable>

            <Text style={styles.title}>{replyTo ? t('post.replyTitle') : t('post.newTitle')}</Text>

            <Pressable
              onPress={submit}
              disabled={!text.trim() || busy}
              hitSlop={10}
              style={({ pressed }) => [
                styles.send,
                (!text.trim() || busy) && styles.sendOff,
                pressed && PRESSED,
              ]}
            >
              {busy
                ? <ActivityIndicator size="small" color={colors.bg} />
                : <Text style={styles.sendText}>{t('post.send')}</Text>}
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder={replyTo ? t('post.replyHint') : t('post.hint')}
            placeholderTextColor={colors.text3}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            maxLength={MAX_LEN}
            textAlignVertical="top"
          />

          {game?.appid ? (
            <View style={styles.gameChip}>
              <Ionicons name="game-controller-outline" size={14} color={colors.text2} />
              <Text style={styles.gameName} numberOfLines={1}>{game.name}</Text>
            </View>
          ) : null}

          <View style={styles.foot}>
            {error ? <Text style={styles.error}>{error}</Text> : <View />}
            <Text style={[styles.count, NUMERIC, left < 40 && { color: colors.accentText }]}>{left}</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // tema-bagimsiz: medya onizlemesinin ustundeki karartma
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 28,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cancel: { color: colors.text2, fontSize: type.subhead },
  title: { color: colors.text, fontSize: type.subhead, fontWeight: '700' },
  send: {
    backgroundColor: colors.text, borderRadius: radius.pill,
    paddingHorizontal: 16, paddingVertical: 7, minWidth: 74, alignItems: 'center',
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: colors.bg, fontSize: type.footnote, fontWeight: '800' },

  input: {
    color: colors.text, fontSize: type.body, lineHeight: 22,
    minHeight: 130, marginTop: 14,
  },

  gameChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%',
  },
  gameName: { color: colors.text2, fontSize: type.caption, fontWeight: '600', flexShrink: 1 },

  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  error: { color: colors.accentText, fontSize: type.caption, flexShrink: 1, paddingRight: 12 },
  count: { color: colors.text3, fontSize: type.caption, fontWeight: '600' },
});
