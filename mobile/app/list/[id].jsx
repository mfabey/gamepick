// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listesi detayı — oyunlar, beğeni, şikayet, sahibi için kaldırma.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { fetchList, toggleListLike, deletePublicList } from '../../src/api/social';
import ReportSheet from '../../src/components/ReportSheet';
import EmptyState from '../../src/components/EmptyState';
import { radius, spacing, PRESSED, type } from '../../src/theme';
import { useStyles, useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import IconButton from '../../src/components/IconButton';
import GameRow, { SATIR_Y } from '../../src/components/GameRow';

export default function PublicListScreen() {
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  if (list === null) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={50} color={colors.text3} />
          <Text style={styles.emptyTitle}>{t('soc.err.generic')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {list.isOwner ? (
          <IconButton icon='trash-outline' size={19} color={colors.danger} onPress={onUnpublish} style={styles.iconBtn} />
        ) : (
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => setReporting(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.report')}>
            <Ionicons name="flag-outline" size={19} color={colors.text2} />
          </Pressable>
        )}
      </View>

      <FlashList
        data={list.games || []}
        keyExtractor={(item, i) => `${item.id}_${i}`}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 30 }]}
        estimatedItemSize={SATIR_Y}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {list.status === 'hidden' && (
              <View style={styles.notice}>
                <Ionicons name="eye-off-outline" size={16} color={colors.accent} />
                <Text style={styles.noticeText}>{t('pl.hiddenNotice')}</Text>
              </View>
            )}

            <Text style={styles.title}>{list.emoji} {list.title}</Text>
            {list.description ? <Text style={styles.desc}>{list.description}</Text> : null}

            <View style={styles.metaRow}>
              <Text style={styles.meta}>
                {list.gameCount} {t('pl.games')} · {t('pl.by')} @{list.ownerUsername}
              </Text>
              <Pressable style={({ pressed }) => [styles.likeBtn, pressed && PRESSED]} onPress={onLike} hitSlop={8}>
                <Ionicons
                  name={list.likedByMe ? 'heart' : 'heart-outline'}
                  size={20}
                  color={list.likedByMe ? colors.danger : colors.text3}
                />
                <Text style={[styles.likeCount, list.likedByMe && { color: colors.danger }]}>
                  {list.likeCount}
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="game-controller-outline" title={t('pl.emptyList')} compact />
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

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: spacing.xs,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },

  header: { paddingHorizontal: 5, paddingBottom: 14 },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.accentBg, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.accentBorder,
    padding: spacing.md, marginBottom: 14,
  },
  noticeText: { flex: 1, color: colors.text, fontSize: type.footnote, lineHeight: 18 },

  title: { color: colors.text, fontSize: type.title2, fontWeight: '900', letterSpacing: -0.5 },
  desc: { color: colors.text2, fontSize: type.subhead, marginTop: 7, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  meta: { flex: 1, color: colors.text3, fontSize: type.footnote },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount: { color: colors.text3, fontSize: type.footnote, fontWeight: '700' },

  list: { paddingHorizontal: spacing.s20 },

  emptyTitle: { color: colors.text, fontSize: type.body, fontWeight: '800', marginTop: spacing.md },

});
