// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listeleri — keşif akışı.
//
// Sıralama: popüler (beğeni) veya yeni (tarih). Engellenen kullanıcıların
// listeleri sunucuda zaten eleniyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Pressable, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { fetchListFeed, toggleListLike } from '../src/api/social';
import { getSession, subscribeSession } from '../src/services/session';
import EmptyState from '../src/components/EmptyState';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { PressableScale, Segmented, Txt } from '../src/components/ui/Primitives';
import { CoverMosaic } from '../src/components/ui/GameCards';
import { Badge } from '../src/components/ui/Social';
import { spacing } from '../src/theme';
import { component as K, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useYanBosluk } from '../src/hooks/useIcerikAlani';
import { useStyles } from '../src/context/ThemeContext';
import { useLanguage } from '../src/context/LanguageContext';

export default function ListsScreen() {
  const styles = useStyles(makeStyles);
  const yan = useYanBosluk();
  const insets = useSafeAreaInsets();
  const { colors } = useDesignTheme();
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

  // Topluluk listeleri HESAPSIZ okunur. Eskiden oturum yoksa liste boş
  // bırakılıyordu; karo profilde kilitsiz olduğu için ekran "bozuk" görünüyordu.
  useEffect(() => { load(sort, 1); }, [sort, load, session]);

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
    // Beğeni yazma işlemi; hesapsız kullanıcıyı sessizce başarısız bırakmak
    // yerine kayda yönlendiriyoruz (iyimser güncelleme de geri sarardı).
    if (!session) { router.push('/account'); return; }
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
  }, [session, router]);

  const renderItem = useCallback(({ item }) => (
    <ListCard
      item={item}
      t={t}
      onPress={() => router.push({ pathname: '/list/[id]', params: { id: item.id } })}
      onLike={() => onLike(item)}
    />
  ), [router, onLike, t]);

  // AYNI SEKMEYE BASMAK HİÇBİR ŞEY YAPMAMALI. Öncesinde liste boşaltılıyor
  // (`setItems(null)`) ama `sort` değişmediği için yükleme etkisi yeniden
  // koşmuyordu: seçili sekmeye basan kullanıcı sonsuz bir dönen göstergede
  // kalıyordu. 2.0 `Segmented` de seçili öğede onChange çağırıyor.
  const onSort = useCallback((k) => {
    if (k === sort) return;
    Haptics.selectionAsync();
    setSort(k);
    setItems(null);
  }, [sort]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('pl.title')} />

      <View style={[styles.tabs, { marginHorizontal: yan }]}>
        <Segmented
          accessibilityLabel={t('pl.title')}
          items={[
            { value: 'popular', label: t('pl.sortPopular') },
            { value: 'new', label: t('pl.sortNew') },
          ]}
          value={sort}
          onChange={onSort}
        />
      </View>

      {items === null ? (
        <View style={styles.center}><ActivityIndicator color={colors.text2} /></View>
      ) : items.length === 0 ? (
        /* Boş durum izleyiciye göre değişiyor: sayfa artık hesapsız da
           açılıyor ve "koleksiyonlarından birini paylaş" çağrısı hesapsız
           kullanıcıyı kilitli ekrana götürüyordu. */
        <EmptyState
          icon="book"
          title={t('pl.empty')}
          text={session ? t('pl.emptyText') : t('pl.emptyGuest')}
          actionLabel={session ? t('col.entry') : t('acc.goSignIn')}
          actionIcon={session ? 'layers' : 'userplus'}
          onAction={() => router.push(session ? '/collections' : '/account')}
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space[32], paddingHorizontal: yan + spacing.s20 }]}
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

/**
 * Topluluk listesi satırı — koleksiyon satırıyla aynı kapak (CoverMosaic 60)
 * ve aralık; altında açıklama ve künye, sağda beğeni.
 */
function ListCard({ item, onPress, onLike, t }) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const liked = !!item.likedByMe;
  return (
    <PressableScale style={styles.card} onPress={onPress} accessibilityRole="button" accessibilityLabel={item.title}>
      <CoverMosaic covers={item.covers} emoji={item.emoji} />

      <View style={styles.cardBody}>
        <Txt variant="cardTitle" numberOfLines={1}>{item.emoji} {item.title}</Txt>
        {item.description ? (
          <Txt variant="footnote" numberOfLines={2} style={{ color: colors.text2 }}>{item.description}</Txt>
        ) : null}
        <View style={styles.metaRow}>
          {/* Editör listeleri açıkça işaretleniyor — kullanıcı yapımı gibi
              görünmemeleri şart. 2.0 rozeti: kalkan + "EDİTÖR". */}
          {item.official ? <Badge label={t('pl.official')} kind="mod" /> : null}
          <Txt variant="caption" numberOfLines={1} style={[styles.meta, { color: colors.text3 }]}>
            {item.gameCount} {t('pl.games')}
            {item.official ? '' : ` · ${t('pl.by')} @${item.ownerUsername}`}
          </Txt>
        </View>
      </View>

      {/* Editör listesi beğenilemez: sahibi bir kullanıcı değil. Düğmeyi
          gösterip çalışmamasındansa hiç göstermemek doğru. */}
      {item.official ? null : (
        <Pressable
          onPress={onLike}
          hitSlop={space[8]}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.like')}
          accessibilityState={{ selected: liked }}
          style={styles.likeBtn}
        >
          <Icon name="heart" size={K.listLike.icon} color={liked ? colors.red : colors.text3} fill={liked ? colors.red : 'none'} />
          <Txt variant="captionStrong" style={[styles.num, { color: liked ? colors.red : colors.text3 }]}>{item.likeCount}</Txt>
        </Pressable>
      )}
    </PressableScale>
  );
}

const makeStyles = () => StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabs: { paddingHorizontal: spacing.s20, paddingTop: space[4], paddingBottom: space[12] },

  list: { paddingHorizontal: spacing.s20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: K.gameRow.gap, paddingVertical: space[8] },
  cardBody: { flex: 1, minWidth: 0, gap: space[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space[6], marginTop: space[2] },
  meta: { flexShrink: 1 },

  likeBtn: { alignItems: 'center', gap: K.listLike.gap, paddingHorizontal: space[4] },
  num: { fontVariant: ['tabular-nums'] },
});
