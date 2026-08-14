// ─────────────────────────────────────────────────────────────────────────────
// Swipe keşfi — Tinder mantığı.
//   Sağa kaydır  → "İlgimi çekti"  (like sinyali + beğeni deposu)
//   Sola kaydır  → "Bana göre değil" (dismiss → aday havuzundan SERT elenir)
//
// Aday üretimi sıfırdan yazılmadı: ana sayfanın "Senin İçin" motoru
// (useForYouFeed) zaten tür rotasyonu + tekrar eleme + zevke göre sıralama
// yapıyor, deste onun üzerine kuruldu.
//
// Performans notu: yalnızca en üstteki 3 kart render edilir ve jest tamamen
// UI thread'inde (Reanimated worklet) çalışır — karar anına kadar JS thread'e
// hiç dokunulmaz, böylece kaydırma 60fps kalır.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation, runOnJS,
} from 'react-native-reanimated';

import { useTasteProfile } from '../src/hooks/useTasteProfile';
import { useOwnedGames } from '../src/hooks/useOwnedGames';
import { useSeen } from '../src/hooks/useSeen';
import { useDismissed } from '../src/hooks/useDismissed';
import { useForYouFeed } from '../src/hooks/useForYouFeed';
import { genreSlugsFor } from '../src/services/recommend';
import { recordSignal } from '../src/services/tasteProfile';
import { recordDismiss } from '../src/services/dismissStore';
import { recordSeen } from '../src/services/seenStore';
import { recordLike, removeLike } from '../src/services/likeStore';
import EmptyState from '../src/components/EmptyState';
import { posterImage } from '../src/utils/images';
import { colors, radius, spacing, PRESSED, type } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import IconButton from '../src/components/IconButton';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;   // bu mesafeden sonra bırakınca karar verilir
const FLY_OUT = SCREEN_W * 1.6;            // karar sonrası kartın uçacağı mesafe
const VISIBLE = 3;                         // aynı anda render edilen kart sayısı
const REFILL_AT = 4;                       // deste bu sayıya inince yeni sayfa çek

export default function SwipeScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const { topGenres, normalizedGenres, profile } = useTasteProfile();
  const ownedNames = useOwnedGames();
  const seenIds = useSeen();
  const dismissedIds = useDismissed();

  // Tür seti bu oturum boyunca DONDURULUR.
  // Her swipe bir like sinyali üretip zevk profilini değiştiriyor; slug'lar canlı
  // hesaplansaydı topGenres sıralaması kayacak, useForYouFeed akışı sıfırlayacak
  // ve deste kullanıcının elinin altından kaybolacaktı.
  const frozenKey = useRef(null);
  const liveKey = genreSlugsFor(topGenres(4)).join(',');
  if (frozenKey.current === null && liveKey) frozenKey.current = liveKey;
  const slugsKey = frozenKey.current || liveKey;
  const slugs = useMemo(() => (slugsKey ? slugsKey.split(',') : []), [slugsKey]);

  // Ağırlıklar ise CANLI kalsın: yalnızca sonraki sayfaların sıralamasını
  // etkiler (akışı sıfırlamaz), böylece algoritma kaydırdıkça öğrenir.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const genreWeights = useMemo(() => normalizedGenres(), [profile]);

  const { items, loadMore, loadingMore } = useForYouFeed({
    enabled: true,
    slugs,
    genreWeights,
    ownedNames,
    seenIds,
    excludeIds: dismissedIds,
  });

  // Deste: akıştan gelenlerin henüz karar verilmemiş olanları
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState([]);   // geri alma yığını
  const [stats, setStats] = useState({ like: 0, pass: 0 });

  const deck = useMemo(() => items.slice(cursor), [items, cursor]);
  const remaining = deck.length;

  // Deste azalınca yeni sayfa çek
  useEffect(() => {
    if (remaining <= REFILL_AT && !loadingMore) loadMore();
  }, [remaining, loadingMore, loadMore]);

  const commit = useCallback(async (game, liked) => {
    if (!game) return;
    setCursor((c) => c + 1);
    setHistory((h) => [...h, { game, liked }].slice(-20));
    setStats((s) => liked ? { ...s, like: s.like + 1 } : { ...s, pass: s.pass + 1 });

    recordSeen(game.id);
    if (liked) {
      recordLike(game);
      recordSignal({ genres: game.genres, type: 'like' });
    } else {
      // Negatif tür ağırlığı UYGULAMIYORUZ: birkaç olumsuz karar bir türü
      // kalıcı olarak gömebilir. Sert eleme (dismiss) doğru araç.
      recordDismiss(game.id);
    }
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHistory((h) => h.slice(0, -1));
    setCursor((c) => Math.max(0, c - 1));
    setStats((s) => last.liked ? { ...s, like: Math.max(0, s.like - 1) } : { ...s, pass: Math.max(0, s.pass - 1) });
    if (last.liked) removeLike(last.game.id);
    // Not: dismiss geri alınmıyor — dismissStore'da silme yok ve süreli kayıt,
    // kullanıcı kartı yeniden görmek isterse zaten "geri" ile deste geri sarılıyor.
  }, [history]);

  const openDetail = useCallback((game) => {
    router.push({
      pathname: '/game/[id]',
      params: {
        id: String(game.id), name: game.name || '', image: game.image || '',
        slug: game.rawgSlug || game.slug || '', hasSteam: game.hasSteam ? '1' : '',
      },
    });
  }, [router]);

  const top = deck[0];
  const initialLoading = items.length === 0 && loadingMore;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Üst çubuk */}
      <View style={styles.head}>
        <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headText}>
          <Text style={styles.title}>{t('swipe.title')}</Text>
          <Text style={styles.subtitle}>
            {stats.like + stats.pass > 0
              ? `${stats.like} ${t('swipe.liked')} · ${stats.pass} ${t('swipe.passed')}`
              : t('swipe.subtitle')}
          </Text>
        </View>
        <IconButton icon='arrow-undo' size={20} color={colors.text} onPress={undo} disabled={history.length === 0} style={[styles.iconBtn, history.length === 0 && styles.iconBtnOff]} />
      </View>

      {/* Deste */}
      <View style={styles.deck}>
        {initialLoading ? (
          <ActivityIndicator color={colors.accent} size="large" />
        ) : remaining === 0 ? (
          <DeckEmpty t={t} loading={loadingMore} onBrowse={() => router.push('/games')} />
        ) : (
          // Ters sırada render: ilk kart DOM'da en sonda → en üstte görünür
          deck.slice(0, VISIBLE).map((game, i) => (
            <SwipeCard
              key={game.id}
              game={game}
              index={i}
              isTop={i === 0}
              onDecide={(liked) => commit(game, liked)}
              onPress={() => openDetail(game)}
              t={t}
            />
          )).reverse()
        )}
      </View>

      {/* Aksiyon butonları — kaydırmak istemeyen kullanıcı için */}
      {remaining > 0 && !initialLoading && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.passBtn]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); commit(top, false); }}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.infoBtn, pressed && PRESSED]} onPress={() => openDetail(top)}>
            <Ionicons name="information" size={20} color={colors.text2} />
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.likeBtn]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); commit(top, true); }}
          >
            <Ionicons name="heart" size={26} color="#fff" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Tek kart ────────────────────────────────────────────────────────────────
function SwipeCard({ game, index, isTop, onDecide, onPress, t }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);

  // Arkadaki kartlar hafif küçük ve aşağıda dursun (derinlik hissi)
  const restScale = 1 - index * 0.04;
  const restY = index * 10;

  // Dokunsal geri bildirim karar ANINDA verilmeli — animasyonun bitmesi beklenmez
  const haptic = useCallback((liked) => {
    Haptics.impactAsync(
      liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }, []);

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      x.value = e.translationX;
      y.value = e.translationY;
    })
    .onEnd((e) => {
      const passed = Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > 800;
      if (passed) {
        const liked = e.translationX > 0;
        runOnJS(haptic)(liked);
        y.value = withTiming(e.translationY + 40, { duration: 220 });
        // Kararı animasyon BİTİNCE bildir: aksi hâlde deste anında ilerler,
        // kart o anda unmount olur ve uçuş animasyonu hiç görünmez.
        x.value = withTiming(
          liked ? FLY_OUT : -FLY_OUT,
          { duration: 220 },
          (finished) => { if (finished) runOnJS(onDecide)(liked); }
        );
      } else {
        x.value = withSpring(0, { damping: 18, stiffness: 200 });
        y.value = withSpring(0, { damping: 18, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + (isTop ? 0 : restY) },
      { rotate: `${interpolate(x.value, [-SCREEN_W, 0, SCREEN_W], [-12, 0, 12], Extrapolation.CLAMP)}deg` },
      { scale: isTop ? 1 : restScale },
    ],
  }));

  // Kararı önizleyen rozetler — kullanıcı bırakmadan ne olacağını görsün
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onPress} disabled={!isTop}>
          <Image
            source={posterImage(game.image)}
            cachePolicy="memory-disk"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={['transparent', 'rgba(6,7,9,0.55)', 'rgba(6,7,9,0.97)']}
            locations={[0.35, 0.68, 1]}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.cardBody}>
            <Text numberOfLines={2} style={styles.cardName}>{game.name}</Text>
            {game.genres?.length > 0 && (
              <View style={styles.tags}>
                {game.genres.slice(0, 3).map((g) => (
                  <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>
                ))}
              </View>
            )}
            {game.metacritic ? (
              <View style={styles.meta}>
                <Ionicons name="star" size={12} color={colors.accent} />
                <Text style={styles.metaText}>{game.metacritic}</Text>
              </View>
            ) : null}
          </View>

          {/* Karar rozetleri (yalnızca üstteki kartta anlamlı) */}
          {isTop && (
            <>
              <Animated.View style={[styles.badge, styles.badgeLike, likeStyle]}>
                <Text style={styles.badgeText}>{t('swipe.like')}</Text>
              </Animated.View>
              <Animated.View style={[styles.badge, styles.badgePass, passStyle]}>
                <Text style={styles.badgeText}>{t('swipe.pass')}</Text>
              </Animated.View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function DeckEmpty({ t, loading, onBrowse }) {
  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return (
    <EmptyState
      icon="checkmark-done-circle-outline"
      title={t('swipe.emptyTitle')}
      text={t('swipe.emptyText')}
      actionLabel={t('nav.games')}
      actionIcon="search"
      onAction={onBrowse}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  head: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 6, paddingBottom: 10, gap: 10,
  },
  headText: { flex: 1 },
  title: { fontSize: type.headline, fontWeight: '900', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: type.footnote, color: colors.text2, marginTop: 2 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnOff: { opacity: 0.35 },

  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  card: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  cardBody: { position: 'absolute', left: 18, right: 18, bottom: 22 },
  cardName: { color: '#fff', fontSize: type.title2, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: radius.pill,
    // tema-bagimsiz: kart gorselinin ustundeki etiket
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  tagText: { color: '#fff', fontSize: type.caption, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  metaText: { color: colors.text2, fontSize: type.footnote, fontWeight: '700' },

  badge: {
    position: 'absolute', top: 28,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.md, borderWidth: 3,
  },
  badgeLike: { left: 20, borderColor: colors.green, transform: [{ rotate: '-14deg' }] },
  badgePass: { right: 20, borderColor: colors.accent, transform: [{ rotate: '14deg' }] },
  badgeText: { color: '#fff', fontSize: type.headline, fontWeight: '900', letterSpacing: 1 },

  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 22, paddingVertical: 18,
  },
  actionBtn: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
  },
  passBtn: { backgroundColor: colors.accent },
  likeBtn: { backgroundColor: colors.green },
  infoBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.cardBorder,
  },

  empty: { alignItems: 'center', paddingHorizontal: spacing.xl },


});
