// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon detayı — içindeki oyunlar, yeniden adlandırma, oyun çıkarma.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCollection } from '../../src/hooks/useCollections';
import PublishSheet from '../../src/components/PublishSheet';
import EmptyState from '../../src/components/EmptyState';
import NameDialog from '../../src/components/NameDialog';
import {
  renameCollection, deleteCollection, removeGameFromCollection,
} from '../../src/services/collectionsStore';
import { spacing } from '../../src/theme';
import { space } from '../../src/theme/tokens';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { useStyles } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { NavBar } from '../../src/components/ui/Navigation';
import { IconButton } from '../../src/components/ui/Primitives';
import GameRow, { SATIR_Y } from '../../src/components/GameRow';

export default function CollectionDetailScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t, tSay } = useLanguage();
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

  // ÜÇ EYLEM, İKİ YUVA. 2.0 NavBar'ın sağ sütunu 96 pt: iki 44'lük düğme
  // sığıyor, eskisi gibi üçü (paylaş · adlandır · sil) sığmıyor ve başlığın
  // üstüne taşıyordu. Paylaş görünür kalıyor (asıl eylem); adlandırma ve
  // silme "daha fazla"da — iOS'un albüm menüsü kalıbı. Silme onayı aynen.
  // Alert üç düğme taşıyor: Android'in sınırı tam üç (bkz. ChoiceSheet).
  const openMenu = useCallback(() => {
    Alert.alert(col?.name || '', undefined, [
      { text: t('col.rename'), onPress: openRename },
      { text: t('col.delete'), style: 'destructive', onPress: confirmDelete },
      { text: t('col.cancel'), style: 'cancel' },
    ]);
  }, [col, openRename, confirmDelete, t]);

  // FAZ 2 — E bedeni. Bkz. list/[id]: ad kapak üstünden çıktı.
  // GameRow içeride GameCover kullanıyor, o da PosterImage'a düşüyor —
  // dikey kapak 404 verirse orijinale dönme davranışı korunuyor.
  const renderItem = useCallback(({ item }) => (
    <GameRow game={item} onPress={() => openGame(item)} onLongPress={() => removeGame(item)} />
  ), [openGame, removeGame]);

  if (!col) {
    // Koleksiyon silinmiş olabilir (bu ekran açıkken) — sessizce geri dön
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <NavBar />
      </SafeAreaView>
    );
  }

  const games = col.games || [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={`${col.emoji} ${col.name}`}
        subtitle={tSay(games.length, 'col.gameCountOne', 'col.gameCount')}
        right={<>
          {games.length > 0 && <IconButton icon="share" label={t('a11y.share')} onPress={() => setPublishing(true)} />}
          <IconButton icon="more" label={t('a11y.more')} onPress={openMenu} />
        </>}
      />

      {games.length === 0 ? (
        <EmptyState
          icon="pad"
          title={t('col.emptyList')}
          text={t('col.emptyListText')}
          actionLabel={t('nav.games')}
          actionIcon="search"
          onAction={() => router.push('/games')}
        />
      ) : (
        <FlashList
          data={games}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan + spacing.s20 }]}
          estimatedItemSize={SATIR_Y}
          showsVerticalScrollIndicator={false}
        />
      )}

      <PublishSheet
        visible={publishing}
        onClose={() => setPublishing(false)}
        collection={col}
      />

      <NameDialog
        visible={editing}
        title={t('col.rename')}
        value={name}
        onChangeText={setName}
        onClose={() => setEditing(false)}
        onSubmit={saveName}
        submitLabel={t('col.save')}
      />
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  list: { paddingTop: space[8], paddingHorizontal: spacing.s20 },
});
