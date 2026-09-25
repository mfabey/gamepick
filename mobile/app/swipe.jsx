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
import { View, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
import { useAltBosluk } from '../src/hooks/useAltBosluk';
import { genreSlugsFor } from '../src/services/recommend';
import { recordSignal } from '../src/services/tasteProfile';
import { recordDismiss } from '../src/services/dismissStore';
import { recordSeen } from '../src/services/seenStore';
import { recordLike, removeLike } from '../src/services/likeStore';
import EmptyState from '../src/components/EmptyState';
import { Icon } from '../src/components/Icon';
import { NavBar } from '../src/components/ui/Navigation';
import { IconButton, PressableScale, Txt } from '../src/components/ui/Primitives';
import { OverlayTag } from '../src/components/ui/Media';
import { component as K, layout, radius as dsRadius, space } from '../src/theme/tokens';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import GameCover from '../src/components/GameCover';

const VISIBLE = 3;                         // aynı anda render edilen kart sayısı
const REFILL_AT = 4;                       // deste bu sayıya inince yeni sayfa çek

export default function SwipeScreen() {
  const { colors } = useDesignTheme();
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
  // Aksiyon satırı ekranın en altında; Android gezinme çubuğu 48dp'ye kadar
  // çıkıyor ve 18dp'lik dolgu 62dp'lik düğmelerin altını yutuyordu.
  const altBosluk = useAltBosluk(18);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar
        title={t('swipe.title')}
        subtitle={stats.like + stats.pass > 0
          ? `${stats.like} ${t('swipe.liked')} · ${stats.pass} ${t('swipe.passed')}`
          : t('swipe.subtitle')}
        right={<IconButton icon="reply" label={t('a11y.undo')} onPress={undo} disabled={history.length === 0} />}
      />

      {/* Deste */}
      <View style={styles.deck}>
        {initialLoading ? (
          <ActivityIndicator color={colors.text2} size="large" />
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

      {/* Aksiyon butonları — kaydırmak istemeyen kullanıcı için. Tasarımda
          karşılığı yok: iki karar dairesi dolgulu (geç = marka kırmızısı,
          beğen = yeşil), ortadaki bilgi 2.0 `filled` IconButton. */}
      {remaining > 0 && !initialLoading && (
        <View style={[styles.actions, { paddingBottom: altBosluk }]}>
          <PressableScale
            style={[styles.actionBtn, { backgroundColor: colors.brand }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); commit(top, false); }}
            accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
            <Icon name="x" size={K.swipe.actionIcon} color={colors.white} strokeWidth={K.swipe.actionStroke} />
          </PressableScale>
          <IconButton icon="info" variant="filled" label={t('a11y.info')} onPress={() => openDetail(top)} />
          <PressableScale
            style={[styles.actionBtn, { backgroundColor: colors.green }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); commit(top, true); }}
            accessibilityRole="button" accessibilityLabel={t('a11y.like')}>
            <Icon name="heart" size={K.swipe.actionIcon} color={colors.white} fill={colors.white} />
          </PressableScale>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Tek kart ────────────────────────────────────────────────────────────────
function SwipeCard({ game, index, isTop, onDecide, onPress, t }) {
  const { colors } = useDesignTheme();
  const { width: SCREEN_W } = useWindowDimensions();
  const cardWidth = Math.min(SCREEN_W - layout.gutter * 2, K.swipe.cardMaxWidth);
  const SWIPE_THRESHOLD = cardWidth * 0.28;
  const FLY_OUT = SCREEN_W * 1.6;
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
      <Animated.View style={[styles.card, { width: cardWidth, backgroundColor: colors.surface1 }, cardStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onPress} disabled={!isTop}>
          <GameCover uri={game.image} name={game.name} style={StyleSheet.absoluteFill}>
          {/* Metin görselin karartması üstünde: renkler TEMA BAĞIMSIZ beyaz
              (açık temada da kapak karanlık uçla bitiyor). */}
          <View style={styles.cardBody}>
            <Txt variant="title1" numberOfLines={2} style={{ color: colors.white }}>{game.name}</Txt>
            {game.genres?.length > 0 && (
              <View style={styles.tags}>
                {game.genres.slice(0, 3).map((g) => <OverlayTag key={g} label={g} placement="inline" />)}
              </View>
            )}
            {game.metacritic ? (
              <View style={styles.meta}>
                <Icon name="star" size={K.overlayTag.icon} color={colors.gold} fill={colors.gold} />
                <Txt variant="footnoteStrong" style={{ color: colors.onArt }}>{game.metacritic}</Txt>
              </View>
            ) : null}
          </View>

          {/* Karar rozetleri (yalnızca üstteki kartta anlamlı) */}
          {isTop && (
            <>
              <Animated.View style={[styles.badge, styles.badgeLike, { borderColor: colors.green }, likeStyle]}>
                <Txt variant="headlineBold" style={[styles.badgeText, { color: colors.white }]}>{t('swipe.like')}</Txt>
              </Animated.View>
              <Animated.View style={[styles.badge, styles.badgePass, { borderColor: colors.red }, passStyle]}>
                <Txt variant="headlineBold" style={[styles.badgeText, { color: colors.white }]}>{t('swipe.pass')}</Txt>
              </Animated.View>
            </>
          )}
          </GameCover>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

function DeckEmpty({ t, loading, onBrowse }) {
  const { colors } = useDesignTheme();
  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.text2} size="large" />
      </View>
    );
  }
  return (
    <EmptyState
      icon="checkc"
      title={t('swipe.emptyTitle')}
      text={t('swipe.emptyText')}
      actionLabel={t('nav.games')}
      actionIcon="search"
      onAction={onBrowse}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  deck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: layout.gutter },
  card: {
    position: 'absolute',
    height: '100%', maxHeight: K.swipe.cardMaxHeight,
    borderRadius: dsRadius.cardLarge, overflow: 'hidden',
  },

  cardBody: { position: 'absolute', left: space[20], right: space[20], bottom: space[24] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space[6], marginTop: space[8] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[8] },

  // Karar damgası — tasarımda karşılığı yok; eğik, çerçeveli, kenardan 20.
  badge: {
    position: 'absolute', top: space[28],
    paddingHorizontal: space[14], paddingVertical: space[6],
    borderRadius: dsRadius.md, borderWidth: K.swipe.stampBorder,
  },
  badgeLike: { left: space[20], transform: [{ rotate: '-14deg' }] },
  badgePass: { right: space[20], transform: [{ rotate: '14deg' }] },
  badgeText: { letterSpacing: 1 },

  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    // paddingBottom ÇALIŞMA ZAMANINDA (useAltBosluk) — alt kenar güvenli.
    gap: space[24], paddingTop: space[16],
  },
  actionBtn: {
    width: K.swipe.action, height: K.swipe.action, borderRadius: K.swipe.action / 2,
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingHorizontal: space[24] },
});
