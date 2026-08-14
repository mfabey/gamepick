// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon detayı — içindeki oyunlar, yeniden adlandırma, oyun çıkarma.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCollection } from '../../src/hooks/useCollections';
import PublishSheet from '../../src/components/PublishSheet';
import EmptyState from '../../src/components/EmptyState';
import {
  renameCollection, deleteCollection, removeGameFromCollection,
} from '../../src/services/collectionsStore';
import { posterImage } from '../../src/utils/images';
import { colors, radius, spacing, PRESSED, type } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';
import IconButton from '../../src/components/IconButton';
import GameCover from '../../src/components/GameCover';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const col = useCollection(String(id));

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [publishing, setPublishing] = useState(false);

  const openRename = useCallback(() => {
    setName(col?.name || '');
    setEditing(true);
  }, [col]);

  const saveName = useCallback(async () => {
    const clean = name.trim();
    if (!clean) return;
    await renameCollection(String(id), clean);
    Haptics.selectionAsync();
    setEditing(false);
  }, [name, id]);

  const confirmDelete = useCallback(() => {
    Alert.alert(col?.name || '', t('col.deleteConfirm'), [
      { text: t('col.cancel'), style: 'cancel' },
      {
        text: t('col.delete'),
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteCollection(String(id));
          router.back();
        },
      },
    ]);
  }, [col, id, router, t]);

  const openGame = useCallback((g) => {
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(g.id), name: g.name || '', image: g.image || '',
        slug: g.slug || '', hasSteam: g.hasSteam ? '1' : '',
      },
    });
  }, [router]);

  const removeGame = useCallback((g) => {
    Alert.alert(g.name, t('col.removeGame'), [
      { text: t('col.cancel'), style: 'cancel' },
      {
        text: t('col.removeGame'),
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          removeGameFromCollection(String(id), g.id);
        },
      },
    ]);
  }, [id, t]);

  const renderItem = useCallback(({ item }) => (
    <Pressable
      style={({ pressed }) => [styles.cell, pressed && PRESSED]}
      onPress={() => openGame(item)}
      onLongPress={() => removeGame(item)}
    >
      {/* posterImage() ELDEN GİTTİ diye görünüyor ama gitmedi: GameCover
          içeride PosterImage kullanıyor, o da aynı dönüşümü yapıyor VE
          dikey kapak 404 verirse orijinale dönüyor. Burada o geri dönüş
          yoktu. */}
      <GameCover uri={item.image} style={styles.cover}>
        <Text numberOfLines={2} style={styles.cellName}>{item.name}</Text>
      </GameCover>
    </Pressable>
  ), [openGame, removeGame]);

  if (!col) {
    // Koleksiyon silinmiş olabilir (bu ekran açıkken) — sessizce geri dön
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const games = col.games || [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headText}>
          <Text numberOfLines={1} style={styles.title}>{col.emoji} {col.name}</Text>
          <Text style={styles.subtitle}>{games.length} {t('col.gameCount')}</Text>
        </View>
        {games.length > 0 && (
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => setPublishing(true)} hitSlop={10}>
            <Ionicons name="share-social-outline" size={19} color={colors.accent} />
          </Pressable>
        )}
        <IconButton icon='create-outline' size={20} color={colors.text} onPress={openRename} style={styles.iconBtn} />
        <IconButton icon='trash-outline' size={19} color={colors.danger} onPress={confirmDelete} style={styles.iconBtn} />
      </View>

      {games.length === 0 ? (
        <EmptyState
          icon="game-controller-outline"
          title={t('col.emptyList')}
          text={t('col.emptyListText')}
          actionLabel={t('nav.games')}
          actionIcon="search"
          onAction={() => router.push('/games')}
        />
      ) : (
        <FlashList
          data={games}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PublishSheet
        visible={publishing}
        onClose={() => setPublishing(false)}
        collection={col}
      />

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={({ pressed }) => [styles.backdrop, pressed && PRESSED]} onPress={() => setEditing(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={({ pressed }) => [styles.sheet, pressed && PRESSED]} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.sheetTitle}>{t('col.rename')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('col.namePlaceholder')}
                placeholderTextColor={colors.text3}
                style={styles.input}
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              <View style={styles.sheetActions}>
                <Pressable style={({ pressed }) => [styles.ghostBtn, pressed && PRESSED]} onPress={() => setEditing(false)}>
                  <Text style={styles.ghostText}>{t('col.cancel')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.cta, !name.trim() && styles.ctaOff]}
                  onPress={saveName}
                  disabled={!name.trim()}
                >
                  <Text style={styles.ctaText}>{t('col.save')}</Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10, gap: 6,
  },
  headText: { flex: 1, paddingHorizontal: spacing.xs },
  title: { fontSize: type.body, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: type.footnote, color: colors.text2, marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: spacing.sm, paddingBottom: 30 },
  cell: { flex: 1, paddingHorizontal: 5, paddingBottom: 10 },
  cover: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.card,
  },
  cellName: { position: 'absolute', left: 8, right: 8, bottom: 7, color: '#fff', fontSize: type.caption, fontWeight: '700', lineHeight: 14 },




  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: colors.bgElevated,
    borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sheetTitle: { color: colors.text, fontSize: type.body, fontWeight: '900', marginBottom: 14 },
  input: {
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: 14, height: 50, color: colors.text, fontSize: type.subhead,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: spacing.lg },
  ghostBtn: { paddingHorizontal: spacing.lg, height: 46, alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.text2, fontSize: type.subhead, fontWeight: '700' },
  cta: {
    minWidth: 110, height: 46, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },
});
