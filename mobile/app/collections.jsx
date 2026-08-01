// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon listesi — kullanıcının kendi oyun listeleri.
// Oluştur / aç / sil. Düzenleme koleksiyon detayında.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCollections } from '../src/hooks/useCollections';
import { createCollection, deleteCollection } from '../src/services/collectionsStore';
import { posterImage } from '../src/utils/images';
import { colors, radius, spacing } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

const EMOJIS = ['🎮', '🏆', '❤️', '🔥', '👾', '🗡️', '🚀', '🧩', '🌙', '⚡'];

export default function CollectionsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const collections = useCollections();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const submit = useCallback(async () => {
    const clean = name.trim();
    if (!clean) return;
    const id = await createCollection(clean, emoji);
    if (!id) { Alert.alert(t('col.limitReached')); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCreating(false);
    setName('');
    setEmoji(EMOJIS[0]);
    router.push({ pathname: '/collection/[id]', params: { id } });
  }, [name, emoji, router, t]);

  const confirmDelete = useCallback((col) => {
    Alert.alert(col.name, t('col.deleteConfirm'), [
      { text: t('col.cancel'), style: 'cancel' },
      {
        text: t('col.delete'),
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteCollection(col.id);
        },
      },
    ]);
  }, [t]);

  const renderItem = useCallback(({ item }) => (
    <CollectionRow
      col={item}
      t={t}
      onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item.id } })}
      onLongPress={() => confirmDelete(item)}
    />
  ), [router, confirmDelete, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('col.title')}</Text>
        <Pressable style={styles.iconBtn} onPress={() => setCreating(true)} hitSlop={10}>
          <Ionicons name="add" size={26} color={colors.accent} />
        </Pressable>
      </View>

      {collections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="albums-outline" size={54} color={colors.text3} />
          <Text style={styles.emptyTitle}>{t('col.empty')}</Text>
          <Text style={styles.emptyText}>{t('col.emptyText')}</Text>

          {/* Hazır öneriler — boş ekranı eyleme çevirir */}
          <View style={styles.suggests}>
            {[t('col.suggest1'), t('col.suggest2'), t('col.suggest3')].map((s, i) => (
              <Pressable
                key={s}
                style={styles.suggest}
                onPress={async () => {
                  const id = await createCollection(s, EMOJIS[i + 1] || EMOJIS[0]);
                  if (id) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push({ pathname: '/collection/[id]', params: { id } });
                  }
                }}
              >
                <Text style={styles.suggestEmoji}>{EMOJIS[i + 1]}</Text>
                <Text style={styles.suggestText}>{s}</Text>
                <Ionicons name="add" size={17} color={colors.text3} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <FlashList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Oluşturma sayfası */}
      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCreating(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{t('col.new')}</Text>

              <View style={styles.emojiRow}>
                {EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[styles.emojiBtn, emoji === e && styles.emojiBtnOn]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('col.namePlaceholder')}
                placeholderTextColor={colors.text3}
                style={styles.input}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
              />

              <View style={styles.sheetActions}>
                <Pressable style={styles.ghostBtn} onPress={() => setCreating(false)}>
                  <Text style={styles.ghostText}>{t('col.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.cta, !name.trim() && styles.ctaOff]}
                  onPress={submit}
                  disabled={!name.trim()}
                >
                  <Text style={styles.ctaText}>{t('col.create')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CollectionRow({ col, onPress, onLongPress, t }) {
  const covers = (col.games || []).slice(0, 4);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.thumbs}>
        {covers.length === 0 ? (
          <View style={styles.thumbEmpty}><Text style={styles.rowEmoji}>{col.emoji}</Text></View>
        ) : (
          covers.map((g) => (
            <Image
              key={g.id}
              source={posterImage(g.image)}
              cachePolicy="memory-disk"
              style={styles.thumb}
              contentFit="cover"
              transition={150}
            />
          ))
        )}
      </View>

      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={styles.rowName}>{col.emoji} {col.name}</Text>
        <Text style={styles.rowMeta}>{(col.games || []).length} {t('col.gameCount')}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10, gap: 8,
  },
  title: { flex: 1, fontSize: 19, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: spacing.md, paddingBottom: 30 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingRight: 6,
  },
  thumbs: {
    width: 62, height: 62, borderRadius: radius.md, overflow: 'hidden',
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card,
  },
  thumb: { width: '50%', height: '50%' },
  thumbEmpty: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 26 },
  rowBody: { flex: 1 },
  rowName: { color: colors.text, fontSize: 15.5, fontWeight: '800' },
  rowMeta: { color: colors.text2, fontSize: 12.5, marginTop: 3 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 14 },
  emptyText: { color: colors.text2, fontSize: 13.5, textAlign: 'center', marginTop: 7, lineHeight: 20 },
  suggests: { alignSelf: 'stretch', marginTop: 22, gap: 8 },
  suggest: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  suggestEmoji: { fontSize: 17 },
  suggestText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: colors.bgElevated,
    borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 14 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  emojiBtnOn: { borderColor: colors.accent },
  emojiText: { fontSize: 19 },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 14, height: 50, color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  ghostBtn: { paddingHorizontal: 16, height: 46, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.text2, fontSize: 14.5, fontWeight: '700' },
  cta: {
    minWidth: 110, height: 46, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
});
