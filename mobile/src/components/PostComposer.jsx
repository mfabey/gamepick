import { useState, useCallback } from 'react';
import { View, Pressable, TextInput, StyleSheet, Modal, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Txt } from './ui/Primitives';
import { NavBar } from './ui/Navigation';
import Avatar from './Avatar';
import { Icon } from './Icon';
import { useDesignTheme } from '../theme/useDesignTheme';
import { layout, space, typography } from '../theme/tokens';
import { useYanBosluk } from '../hooks/useIcerikAlani';
import { useAuth } from '../context/AuthContext';
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
  const { colors } = useDesignTheme();
  const { account } = useAuth();
  const yan = useYanBosluk();
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

  const name = account?.displayName || account?.name || account?.username || '';
  const hint = replyTo ? t('post.replyHint') : t('post.hint');
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior="padding" style={styles.flex}>
          <View style={{ marginHorizontal: yan }}>
            <NavBar title={replyTo ? t('post.replyTitle') : t('post.newTitle')} border
              left={<Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy }}
                onPress={close} style={styles.cancel}>
                <Txt variant="input" style={{ color: colors.text2 }}>{t('common.cancel')}</Txt>
              </Pressable>}
              right={<Button title={t('post.send')} height={34} onPress={submit}
                disabled={!text.trim()} loading={busy} />} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.flex}
            contentContainerStyle={[styles.body, { paddingHorizontal: yan + layout.gutter }]}>
            <View style={styles.author}>
              <Avatar avatar={account?.avatar} name={name} size={40} />
              <View style={styles.flex}>
                <Txt variant="cardTitle" numberOfLines={1}>{name}</Txt>
                {account?.username ? <Txt variant="footnote" style={{ color: colors.text3 }}>@{account.username}</Txt> : null}
              </View>
            </View>
            <TextInput style={[styles.input, { color: colors.text }]} placeholder={hint}
              accessibilityLabel={hint} placeholderTextColor={colors.text3} selectionColor={colors.red}
              value={text} onChangeText={setText} multiline autoFocus maxLength={MAX_LEN}
              editable={!busy} textAlignVertical="top" maxFontSizeMultiplier={1.3} />
            {game?.appid ? <View style={[styles.game, { backgroundColor: colors.surface1 }]}>
              <Icon name="pad" size={16} color={colors.text2} />
              <Txt variant="footnoteStrong" numberOfLines={1} style={styles.shrink}>{game.name}</Txt>
            </View> : null}
          </ScrollView>
          <View style={[styles.foot, { paddingHorizontal: yan + layout.gutter, backgroundColor: colors.bg2, borderTopColor: colors.line }]}>
            <Txt variant="footnote" accessibilityLiveRegion="polite" style={[styles.flex, { color: colors.red }]}>{error}</Txt>
            <Txt variant="footnote" style={{ color: text.length === MAX_LEN ? colors.red : colors.text3,
              fontVariant: ['tabular-nums'] }}>{text.length}/{MAX_LEN}</Txt>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cancel: { minHeight: 44, justifyContent: 'center' },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  body: { flexGrow: 1, paddingVertical: space[20] },
  author: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  input: { ...typography.bodyLarge, lineHeight: 26, minHeight: 104, marginTop: space[14], padding: 0 },
  game: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', maxWidth: '100%',
    gap: space[8], paddingHorizontal: space[12], paddingVertical: space[8], borderRadius: 10, marginTop: space[16] },
  foot: { flexDirection: 'row', alignItems: 'center', gap: space[12], paddingVertical: space[12], borderTopWidth: StyleSheet.hairlineWidth },
});
