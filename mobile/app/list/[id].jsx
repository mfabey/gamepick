// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listesi detayı — oyunlar, beğeni, şikayet, sahibi için kaldırma.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { fetchList, toggleListLike, deletePublicList } from '../../src/api/social';
import ReportSheet from '../../src/components/ReportSheet';
import EmptyState from '../../src/components/EmptyState';
import { Icon } from '../../src/components/Icon';
import { NavBar } from '../../src/components/ui/Navigation';
import { IconButton, Txt } from '../../src/components/ui/Primitives';
import { spacing } from '../../src/theme';
import { component as K, radius as dsRadius, space } from '../../src/theme/tokens';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { useYanBosluk } from '../../src/hooks/useIcerikAlani';
import { useStyles } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import GameRow, { SATIR_Y } from '../../src/components/GameRow';

export default function PublicListScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { t } = useLanguage();

  const [list, setList] = useState(undefined);   // undefined=yükleniyor, null=bulunamadı
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetchList(String(id));
      setList(r?.list || null);
    } catch {
      setList(null);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const onLike = useCallback(async () => {
    if (!list) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prev = { likedByMe: list.likedByMe, likeCount: list.likeCount };
    setList((l) => ({ ...l, likedByMe: !l.likedByMe, likeCount: l.likeCount + (l.likedByMe ? -1 : 1) }));
    try {
      const r = await toggleListLike(list.id);
      setList((l) => ({ ...l, likedByMe: r.liked, likeCount: r.likeCount }));
    } catch {
      setList((l) => ({ ...l, ...prev }));
    }
  }, [list]);

  const onUnpublish = useCallback(() => {
    Alert.alert(list?.title || '', t('pl.unpublishConfirm'), [
      { text: t('pl.cancel'), style: 'cancel' },
      {
        text: t('pl.unpublish'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePublicList(list.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch { Alert.alert(t('soc.err.generic')); }
        },
      },
    ]);
  }, [list, router, t]);

  // Şikâyet "daha fazla"nın arkasında (G-02 gönderi başlığındaki kalıp);
  // 2.0 ikon setinde bayrak yok. Sahibi için aynı düğme doğrudan yayından
  // kaldırma onayını açıyor — tek eylemli bir menü, onay metniyle birlikte.
  const openMenu = useCallback(() => {
    if (list?.isOwner) { onUnpublish(); return; }
    Alert.alert(list?.title || '', undefined, [
      { text: t('a11y.report'), onPress: () => setReporting(true) },
      { text: t('pl.cancel'), style: 'cancel' },
    ]);
  }, [list, onUnpublish, t]);

  const openGame = useCallback((g) => {
    router.push({
      pathname: '/game/[id]',
      params: { id: String(g.id), name: g.name || '', image: g.image || '', appid: g.appid || '' },
    });
  }, [router]);

  // FAZ 2 — E bedeni (kompakt satır). Öncesinde 3 sütunlu ızgaraydı ve ad
  // KAPAK ÜSTÜNE yazılıyordu; fazın öz-denetimindeki "açık temada kapak üstü
  // metin" maddesini deliyordu — açık renkli bir kapakta beyaz ad kayboluyor.
  // Liste detayı fazın E için saydığı ekranlardan biri.
  const renderItem = useCallback(({ item }) => (
    <GameRow game={item} onPress={() => openGame(item)} />
  ), [openGame]);

  if (list === undefined) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <NavBar />
        <View style={styles.center}><ActivityIndicator color={colors.text2} /></View>
      </SafeAreaView>
    );
  }

  if (list === null) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <NavBar />
        <EmptyState icon="alert" title={t('soc.err.generic')} />
      </SafeAreaView>
    );
  }

  const liked = !!list.likedByMe;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar right={<IconButton icon="more" label={t('a11y.more')} onPress={openMenu} />} />

      <FlashList
        data={list.games || []}
        keyExtractor={(item, i) => `${item.id}_${i}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan + spacing.s20 }]}
        estimatedItemSize={SATIR_Y}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {list.status === 'hidden' && (
              <View style={[styles.notice, { backgroundColor: colors.surface1 }]}>
                <Icon name="eyeoff" size={K.listLike.icon} color={colors.red} />
                <Txt variant="footnote" style={styles.noticeText}>{t('pl.hiddenNotice')}</Txt>
              </View>
            )}

            <Txt variant="title1" accessibilityRole="header">{list.emoji} {list.title}</Txt>
            {list.description ? <Txt variant="body" style={[styles.desc, { color: colors.text2 }]}>{list.description}</Txt> : null}

            <View style={styles.metaRow}>
              <Txt variant="footnote" style={[styles.meta, { color: colors.text3 }]}>
                {list.gameCount} {t('pl.games')} · {t('pl.by')} @{list.ownerUsername}
              </Txt>
              <Pressable
                onPress={onLike}
                hitSlop={space[8]}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.like')}
                accessibilityState={{ selected: liked }}
                style={styles.likeBtn}
              >
                <Icon name="heart" size={K.listLike.icon} color={liked ? colors.red : colors.text3} fill={liked ? colors.red : 'none'} />
                <Txt variant="footnoteMedium" style={[styles.num, { color: liked ? colors.red : colors.text3 }]}>{list.likeCount}</Txt>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="pad" title={t('pl.emptyList')} compact />
        }
      />

      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        targetType="list"
        targetId={list.id}
        targetLabel={list.title}
      />
    </SafeAreaView>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingTop: space[8], paddingBottom: space[16] },
  // Gizlenmiş liste bildirimi — 2.0 kart yüzeyi; vurgu yalnız ikonda.
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: space[8],
    padding: space[12], borderRadius: dsRadius.button, marginBottom: space[16],
  },
  noticeText: { flex: 1 },

  desc: { marginTop: space[8] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[12], marginTop: space[12] },
  meta: { flex: 1 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: K.listLike.inlineGap },
  num: { fontVariant: ['tabular-nums'] },

  list: { paddingHorizontal: spacing.s20 },
});
