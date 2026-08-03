// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listeleri — keşif akışı.  [BETA]
//
// Sıralama: popüler (beğeni) veya yeni (tarih). Engellenen kullanıcıların
// listeleri sunucuda zaten eleniyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { fetchListFeed, toggleListLike } from '../src/api/social';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { posterImage } from '../src/utils/images';
import { colors, radius, spacing, type, PRESSED } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function ListsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [sort, setSort] = useState('popular');
  const [items, setItems] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Oturum ASENKRON yükleniyor (depodan). Düz `getSession()` çağrısı ilk
  // render'da null döndürüyor, ekran da abone olmadığı için oturum gelince
  // yeniden çizilmiyordu — liste sonsuza dek boş kalıyordu.
  //
  // social.jsx bu deseni zaten doğru kullanıyor; burası tek kaçaktı.
  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const load = useCallback(async (nextSort, nextPage) => {
    try {
      const r = await fetchListFeed(nextSort, nextPage);
      const fresh = r?.items || [];
      setItems((prev) => (nextPage === 1 ? fresh : [...(prev || []), ...fresh]));
      setHasMore(!!r?.hasMore);
      setPage(nextPage);
    } catch {
      if (nextPage === 1) setItems([]);
      setHasMore(false);
    }
  }, []);

  useEffect(() => { if (session) load(sort, 1); else setItems([]); }, [sort, load, session]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(sort, 1);
    setRefreshing(false);
  }, [sort, load]);

  const onEnd = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(sort, page + 1);
    setLoadingMore(false);
  }, [hasMore, loadingMore, sort, page, load]);

  const onLike = useCallback(async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // İyimser güncelleme — beğeni anında görünsün
    setItems((prev) => prev.map((x) => (
      x.id === item.id
        ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
        : x
    )));
    try {
      const r = await toggleListLike(item.id);
      setItems((prev) => prev.map((x) => (
        x.id === item.id ? { ...x, likedByMe: r.liked, likeCount: r.likeCount } : x
      )));
    } catch {
      // Başarısızsa geri al
      setItems((prev) => prev.map((x) => (
        x.id === item.id
          ? { ...x, likedByMe: item.likedByMe, likeCount: item.likeCount }
          : x
      )));
    }
  }, []);

  const renderItem = useCallback(({ item }) => (
    <ListCard
      item={item}
      t={t}
      onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
      onLike={() => onLike(item)}
    />
  ), [router, onLike, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{t('pl.title')}</Text>
          <View style={styles.betaBadge}><Text style={styles.betaText}>BETA</Text></View>
        </View>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.tabs}>
        {['popular', 'new'].map((k) => (
          <Pressable
            key={k}
            style={[styles.tab, sort === k && styles.tabOn]}
            onPress={() => { Haptics.selectionAsync(); setSort(k); setItems(null); }}
          >
            <Text style={[styles.tabText, sort === k && styles.tabTextOn]}>
              {t(k === 'popular' ? 'pl.sortPopular' : 'pl.sortNew')}
            </Text>
          </Pressable>
        ))}
      </View>

      {items === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="list-outline"
          title={t('pl.empty')}
          text={t('pl.emptyText')}
          actionLabel={t('col.entry')}
          actionIcon="albums"
          onAction={() => router.push('/collections')}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEnd}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text3} />
          }
        />
      )}
    </SafeAreaView>
  );
}

function ListCard({ item, onPress, onLike, t }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} onPress={onPress}>
      <View style={styles.covers}>
        {item.covers.length === 0 ? (
          <View style={styles.coverEmpty}><Text style={styles.coverEmoji}>{item.emoji}</Text></View>
        ) : (
          item.covers.slice(0, 4).map((src, i) => (
            <Image
              key={`${item.id}_${i}`}
              source={posterImage(src)}
              cachePolicy="memory-disk"
              style={styles.cover}
              contentFit="cover"
              transition={150}
            />
          ))
        )}
      </View>

      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.emoji} {item.title}</Text>
        {item.description ? (
          <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {/* Editör listeleri açıkça işaretleniyor — kullanıcı yapımı gibi
              görünmemeleri şart. */}
          {item.official ? (
            <View style={styles.officialChip}>
              <Ionicons name="ribbon" size={11} color={colors.accentText} />
              <Text style={styles.officialText}>{t('pl.official')}</Text>
            </View>
          ) : null}
          <Text numberOfLines={1} style={styles.cardMeta}>
            {item.gameCount} {t('pl.games')}
            {item.official ? '' : ` · ${t('pl.by')} @${item.ownerUsername}`}
          </Text>
        </View>
      </View>

      {/* Editör listesi beğenilemez: sahibi bir kullanıcı değil. Düğmeyi
          gösterip çalışmamasındansa hiç göstermemek doğru. */}
      {item.official ? null : (
        <Pressable style={({ pressed }) => [styles.likeBtn, pressed && PRESSED]} onPress={onLike} hitSlop={8}>
          <Ionicons
            name={item.likedByMe ? 'heart' : 'heart-outline'}
            size={21}
            color={item.likedByMe ? colors.danger : colors.text3}
          />
          <Text style={[styles.likeCount, item.likedByMe && { color: colors.danger }]}>
            {item.likeCount}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  title: { fontSize: type.body, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  betaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, backgroundColor: colors.accent },
  betaText: { color: '#fff', fontSize: type.caption2, fontWeight: '900', letterSpacing: 0.5 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: 10 },
  tab: {
    flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  tabOn: { backgroundColor: colors.accentBg, borderColor: colors.accentBorder },
  tabText: { color: colors.text2, fontSize: type.footnote, fontWeight: '700' },
  tabTextOn: { color: colors.accentText },

  list: { paddingHorizontal: spacing.md, paddingBottom: 30 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  covers: {
    width: 66, height: 66, borderRadius: radius.md, overflow: 'hidden',
    flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.card,
  },
  cover: { width: '50%', height: '50%' },
  coverEmpty: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: type.title1 },

  cardBody: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: type.subhead, fontWeight: '800' },
  cardDesc: { color: colors.text2, fontSize: type.footnote, marginTop: 3, lineHeight: 17 },
  cardMeta: { color: colors.text3, fontSize: type.caption, marginTop: 4 },

  likeBtn: { alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  officialChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2,
  },
  // 11pt Apple'ın mutlak minimumu (HIG). Önceki turda 10pt yazmıştım — ihlaldi.
  officialText: { color: colors.accentText, fontSize: type.caption2, fontWeight: '800', letterSpacing: 0.3 },
  likeCount: { color: colors.text3, fontSize: type.caption, fontWeight: '700' },
});
