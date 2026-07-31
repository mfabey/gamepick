// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon detayı — içindeki oyunlar, yeniden adlandırma, oyun çıkarma.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Alert, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useCollection } from '../../src/hooks/useCollections';
import {
  renameCollection, deleteCollection, removeGameFromCollection,
} from '../../src/services/collectionsStore';
import { posterImage } from '../../src/utils/images';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();
  const col = useCollection(String(id));

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

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
      style={styles.cell}
      onPress={() => openGame(item)}
      onLongPress={() => removeGame(item)}
    >
      <View style={styles.cover}>
        <Image
          source={posterImage(item.image)}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
        <LinearGradient colors={['transparent', 'rgba(6,7,9,0.92)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        <Text numberOfLines={2} style={styles.cellName}>{item.name}</Text>
      </View>
    </Pressable>
  ), [openGame, removeGame]);

  if (!col) {
    // Koleksiyon silinmiş olabilir (bu ekran açıkken) — sessizce geri dön
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
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
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headText}>
          <Text numberOfLines={1} style={styles.title}>{col.emoji} {col.name}</Text>
          <Text style={styles.subtitle}>{games.length} {t('col.gameCount')}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={openRename} hitSlop={10}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={confirmDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={19} color={colors.danger} />
        </Pressable>
      </View>

      {games.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="game-controller-outline" size={50} color={colors.text3} />
          <Text style={styles.emptyTitle}>{t('col.emptyList')}</Text>
          <Text style={styles.emptyText}>{t('col.emptyListText')}</Text>
        </View>
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

      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEditing(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
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
                <Pressable style={styles.ghostBtn} onPress={() => setEditing(false)}>
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
  headText: { flex: 1, paddingHorizontal: 4 },
  title: { fontSize: 18, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 12.5, color: colors.text2, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingHorizontal: 8, paddingBottom: 30 },
  cell: { flex: 1, paddingHorizontal: 5, paddingBottom: 10 },
  cover: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.card,
  },
  cellName: { position: 'absolute', left: 8, right: 8, bottom: 7, color: '#fff', fontSize: 11.5, fontWeight: '700', lineHeight: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  emptyTitle: { color: colors.text, fontSize: 16.5, fontWeight: '800', marginTop: 14 },
  emptyText: { color: colors.text2, fontSize: 13.5, textAlign: 'center', marginTop: 7, lineHeight: 20 },

  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: {
    width: '100%', maxWidth: 420, backgroundColor: colors.bgElevated,
    borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  sheetTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 14 },
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
