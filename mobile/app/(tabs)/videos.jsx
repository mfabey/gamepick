// ─────────────────────────────────────────────────────────────────────────────
// Oyun videoları — dikey, tam ekran, Reels tarzı akış.  [BETA]
//
// AKICILIĞIN SIRRI: OYNATICI HAVUZU.
// Liste elemanı başına oynatıcı oluşturmak klasik hatadır — 20 AVPlayer aynı
// anda açık kalır, bellek şişer ve kaydırma tutuklaşır. Burada ekran düzeyinde
// SABİT 3 oynatıcı var; her elemana `index % 3` ile bir oynatıcı düşüyor.
// Görüntü alanına yakın üç eleman (i-1, i, i+1) her zaman farklı oynatıcıya
// denk geldiği için çakışma olmuyor.
//
// Ayrıca: video hazır olana kadar Steam'in kendi küçük görseli poster olarak
// duruyor → siyah ekran flaşı yok. Algılanan akıcılıkta en belirleyici detay bu.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';

import { fetchVideoFeed } from '../../src/api/videoFeed';
import { useWishlist } from '../../src/context/WishlistContext';
import { useCollections, useCollectionsContaining } from '../../src/hooks/useCollections';
import { toggleGameInCollection, createCollection } from '../../src/services/collectionsStore';
import CollectionPicker from '../../src/components/CollectionPicker';
import { recordSignal } from '../../src/services/tasteProfile';
import { reportActivity } from '../../src/api/social';
import { recordSeen } from '../../src/services/seenStore';
import { colors, radius, spacing, PRESSED, TAB_SPACE } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const POOL = 3;

export default function VideosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(false);
  const fetching = useRef(false);

  // Tam ekran eleman yüksekliği — paging bunun tam katlarına oturur
  const itemH = SCREEN_H;

  // ── Sabit oynatıcı havuzu ───────────────────────────────────────────────
  const cfg = useCallback((p) => {
    p.loop = true;
    p.muted = false;
    p.bufferOptions = { preferredForwardBufferDuration: 5 };
  }, []);
  const p0 = useVideoPlayer(null, cfg);
  const p1 = useVideoPlayer(null, cfg);
  const p2 = useVideoPlayer(null, cfg);
  const players = useMemo(() => [p0, p1, p2], [p0, p1, p2]);

  // Yüklenen kaynakları takip et → aynı videoyu tekrar tekrar yükleme
  const loadedRef = useRef({});   // { poolIndex: hlsUrl }

  const load = useCallback(async (p) => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const data = await fetchVideoFeed(p, lang);
      const fresh = data?.results || [];
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...fresh.filter((x) => !seen.has(x.id))];
      });
      setHasMore(!!data?.hasMore);
      setPage(p);
    } catch {
      setHasMore(false);
    } finally {
      fetching.current = false;
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { load(1); }, [load]);

  // ── Aktif elemana göre havuzu yönet ─────────────────────────────────────
  // Aktif olanı oynat, komşusunu ÖN YÜKLE (duraklatılmış), uzağı durdur.
  useEffect(() => {
    if (items.length === 0) return;

    const assign = async (idx, shouldPlay) => {
      const item = items[idx];
      if (!item) return;
      const slot = idx % POOL;
      const player = players[slot];
      if (!player) return;

      if (loadedRef.current[slot] !== item.hls) {
        loadedRef.current[slot] = item.hls;
        try { await player.replaceAsync(item.hls); } catch { return; }
      }
      player.muted = muted;
      if (shouldPlay) player.play(); else player.pause();
    };

    assign(active, true);
    assign(active + 1, false);   // sonraki hazır beklesin → geçiş anında donma olmaz
    assign(active - 1, false);

    // Havuz dışındaki her şey zaten farklı slota yazılınca serbest kalıyor
  }, [active, items, players, muted]);

  // Ekrandan çıkarken tüm sesi kes (arka planda çalmasın)
  useEffect(() => () => { players.forEach((p) => { try { p.pause(); } catch {} }); }, [players]);

  // Aktif video değişince zevk sinyali + görüldü kaydı
  useEffect(() => {
    const item = items[active];
    if (!item) return;
    recordSeen(item.id);
    if (item.genres?.length) recordSignal({ genres: item.genres, type: 'view' });
  }, [active, items]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems?.[0];
    if (first && typeof first.index === 'number') setActive(first.index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onEndReached = useCallback(() => {
    if (hasMore && !fetching.current) load(page + 1);
  }, [hasMore, page, load]);

  const renderItem = useCallback(({ item, index }) => (
    <VideoItem
      item={item}
      height={itemH}
      isActive={index === active}
      player={players[index % POOL]}
      muted={muted}
      onToggleMute={() => { Haptics.selectionAsync(); setMuted((m) => !m); }}
      router={router}
      t={t}
    />
  ), [active, players, itemH, muted, router, t]);

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.loadingText}>{t('vid.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.6}
        decelerationRate="fast"
      />

      {/* Üst çubuk — BETA rozeti.
          Geri butonu YOK: bu artık bir sekme, geri dönülecek bir yer yok. */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.titleWrap}>
          <Text style={styles.topTitle}>{t('vid.title')}</Text>
          <View style={styles.betaBadge}><Text style={styles.betaText}>BETA</Text></View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Tek video elemanı ──────────────────────────────────────────────────────
function VideoItem({ item, height, isActive, player, muted, onToggleMute, router, t }) {
  const { isWatched, toggle } = useWishlist();
  const collections = useCollections();
  const inCollections = useCollectionsContaining(item.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const watched = isWatched(item.id);

  // Aktiflik değişince poster durumunu sıfırla — geri dönüldüğünde
  // hazır olmayan videoda siyah ekran görünmesin
  useEffect(() => { if (!isActive) setReady(false); }, [isActive]);

  // Video hazır olunca posteri kaldır.
  // Anlık durumu ÖNCE kontrol etmek şart: komşu olarak ön yüklenmiş bir video
  // aktif hâle geldiğinde çoktan 'readyToPlay' olmuş olabilir ve statusChange
  // bir daha tetiklenmez — sadece olaya güvenilirse poster kalıcı olarak kalırdı.
  useEffect(() => {
    if (!isActive || !player) return;

    try { if (player.status === 'readyToPlay') setReady(true); } catch {}

    let sub;
    try {
      sub = player.addListener('statusChange', ({ status }) => {
        if (status === 'readyToPlay') setReady(true);
      });
    } catch { /* olay desteklenmiyorsa poster kalır, video yine oynar */ }

    return () => { try { sub?.remove(); } catch {} };
  }, [isActive, player]);

  const onWishlist = useCallback(() => {
    const willAdd = !watched;
    Haptics.impactAsync(willAdd ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    toggle({ id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '' });
    if (willAdd && item.genres?.length) recordSignal({ genres: item.genres, type: 'wishlist' });
    if (willAdd) {
      reportActivity({
        type: 'wishlist', gameId: item.id, gameName: item.name || '', gameImage: item.image || '',
      });
    }
  }, [watched, toggle, item]);

  const onBuy = useCallback(() => {
    Haptics.selectionAsync();
    if (item.steamUrl) WebBrowser.openBrowserAsync(item.steamUrl);
  }, [item]);

  const openDetail = useCallback(() => {
    router.push({
      pathname: '/game/[id]',
      params: { id: item.id, appid: item.appid, name: item.name, image: item.image },
    });
  }, [router, item]);

  return (
    <View style={[styles.item, { height }]}>
      {/* Poster — video hazır olana kadar; siyah flaşı önler */}
      {(!isActive || !ready) && (
        <Image
          source={item.image}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      )}

      {isActive && player ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
      ) : null}

      {/* Okunabilirlik için alt/üst karartma */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent', 'transparent', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.22, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Sağ aksiyon sütunu */}
      <View style={[styles.actions, { bottom: TAB_SPACE + 90 }]}>
        <ActionBtn
          icon={watched ? 'notifications' : 'notifications-outline'}
          active={watched}
          label={t('vid.follow')}
          onPress={onWishlist}
        />
        <ActionBtn
          icon={inCollections.size > 0 ? 'albums' : 'albums-outline'}
          active={inCollections.size > 0}
          label={t('vid.save')}
          onPress={() => { Haptics.selectionAsync(); setPickerOpen(true); }}
        />
        <ActionBtn icon="cart-outline" label={t('vid.buy')} onPress={onBuy} />
        <ActionBtn
          icon={muted ? 'volume-mute' : 'volume-high'}
          label={muted ? t('vid.unmute') : t('vid.mute')}
          onPress={onToggleMute}
        />
      </View>

      {/* Alt bilgi */}
      <Pressable style={[styles.info, { bottom: TAB_SPACE + 6 }]} onPress={openDetail}>
        <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
        {item.genres?.length > 0 && (
          <View style={styles.tags}>
            {item.genres.map((g) => (
              <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>
            ))}
          </View>
        )}
        <View style={styles.detailHint}>
          <Text style={styles.detailHintText}>{t('vid.detail')}</Text>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.75)" />
        </View>
      </Pressable>

      <CollectionPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        collections={collections}
        selectedIds={inCollections}
        game={{ name: item.name }}
        onToggle={(colId) => toggleGameInCollection(colId, {
          id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '',
        })}
        onCreate={(nm) => createCollection(nm)}
      />
    </View>
  );
}

function ActionBtn({ icon, label, active, onPress }) {
  return (
    <Pressable style={({ pressed }) => [styles.actionBtn, pressed && PRESSED]} onPress={onPress} hitSlop={6}>
      <View style={[styles.actionCircle, active && styles.actionCircleOn]}>
        <Ionicons name={icon} size={23} color="#fff" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loadingRoot: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.text2, fontSize: 13, marginTop: 12 },

  item: { width: SCREEN_W, backgroundColor: '#000' },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    // Geri butonu kalkınca tek çocuk kaldı; space-between sola yaslıyordu
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  topTitle: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  betaBadge: {
    paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  betaText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  actions: { position: 'absolute', right: 12, alignItems: 'center', gap: 17 },
  actionBtn: { alignItems: 'center', gap: 5 },
  actionCircle: {
    width: 47, height: 47, borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  actionCircleOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  info: { position: 'absolute', left: spacing.lg, right: 84 },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.4, lineHeight: 26 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  tag: {
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  tagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 11 },
  detailHintText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
});
