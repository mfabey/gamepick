// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon listesi — kullanıcının kendi oyun listeleri.
// Oluştur / aç / sil. Düzenleme koleksiyon detayında.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useCollections } from '../src/hooks/useCollections';
import { createCollection, deleteCollection } from '../src/services/collectionsStore';
import EmptyState from '../src/components/EmptyState';
import NameDialog, { EmojiPicker } from '../src/components/NameDialog';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { IconButton, PressableScale, Txt } from '../src/components/ui/Primitives';
import { CoverMosaic } from '../src/components/ui/GameCards';
import { spacing } from '../src/theme';
import { component as K, control as C, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';
import ProfileGate from '../src/components/ProfileGate';

const EMOJIS = ['🎮', '🏆', '❤️', '🔥', '👾', '🗡️', '🚀', '🧩', '🌙', '⚡'];

export default function CollectionsScreen() {
  return (
    <ProfileGate>
      <CollectionsScreenContent />
    </ProfileGate>
  );
}

function CollectionsScreenContent() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={t('col.title')}
        right={<IconButton icon="plus" label={t('a11y.add')} onPress={() => setCreating(true)} />}
      />

      {collections.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          title={t('col.empty')}
          text={t('col.emptyText')}
        >
          {/* Hazır öneriler — boş ekranı eyleme çevirir */}
          <View style={styles.suggests}>
            {[t('col.suggest1'), t('col.suggest2'), t('col.suggest3')].map((s, i) => (
              <PressableScale
                key={s}
                accessibilityRole="button"
                style={[styles.suggest, { backgroundColor: colors.surface1 }]}
                onPress={async () => {
                  const id = await createCollection(s, EMOJIS[i + 1] || EMOJIS[0]);
                  if (id) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push({ pathname: '/collection/[id]', params: { id } });
                  }
                }}
              >
                <Txt variant="body">{EMOJIS[i + 1]}</Txt>
                <Txt variant="input" numberOfLines={1} style={styles.suggestText}>{s}</Txt>
                <Icon name="plus" size={K.listRow.icon} color={colors.text3} />
              </PressableScale>
            ))}
          </View>
        </EmptyState>
      ) : (
        <FlashList
          data={collections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan + spacing.s20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      <NameDialog
        visible={creating}
        title={t('col.new')}
        value={name}
        onChangeText={setName}
        onClose={() => setCreating(false)}
        onSubmit={submit}
        submitLabel={t('col.create')}
      >
        <EmojiPicker emojis={EMOJIS} value={emoji} onChange={setEmoji} />
      </NameDialog>
    </SafeAreaView>
  );
}

/**
 * Koleksiyon satırı — detaydaki GameRow'la aynı ölçü (60 yükseklik, aralık 12,
 * satırlar arası 8): liste ile içi aynı ritimde. Uzun basma = silme.
 */
function CollectionRow({ col, onPress, onLongPress, t }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const games = col.games || [];
  return (
    <PressableScale
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={col.name}
    >
      <CoverMosaic covers={games.map((g) => g.image)} emoji={col.emoji} />
      <View style={styles.rowBody}>
        <Txt variant="cardTitle" numberOfLines={1}>{col.emoji} {col.name}</Txt>
        <Txt variant="footnote" style={{ color: colors.text2 }}>{games.length} {t('col.gameCount')}</Txt>
      </View>
      <Icon name="chev" size={K.gameRow.chevron} color={colors.text3} strokeWidth={K.gameRow.chevronStroke} />
    </PressableScale>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },

  list: { paddingTop: space[8], paddingHorizontal: spacing.s20 },
  row: { minHeight: K.gameRow.height, marginBottom: K.gameRow.rowGap, flexDirection: 'row', alignItems: 'center', gap: K.gameRow.gap },
  rowBody: { flex: 1, minWidth: 0 },

  // Öneriler ListRow ölçüsünde (52, iç boşluk 16, aralık 14) ama ayrı kartlar:
  // her biri kendi başına bir eylem, bir listenin satırları değil.
  suggests: { alignSelf: 'stretch', marginTop: space[24], gap: space[8] },
  suggest: {
    flexDirection: 'row', alignItems: 'center', gap: C.listGap,
    minHeight: C.listHeight, paddingHorizontal: C.listPadding, borderRadius: dsRadius.button,
  },
  suggestText: { flex: 1 },
});
