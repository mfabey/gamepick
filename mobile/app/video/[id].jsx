// ─────────────────────────────────────────────────────────────────────────────
// Video oynatıcı — G-15 (kit s3.py player()).
//
// KAYNAK STEAM'İN RESMÎ FRAGMANI. Kit bir yaratıcı platformu çiziyor
// (yaratıcı satırı, takip düğmesi, izlenme sayısı, beğeni/yorum/klip
// hapları, altyazı ve kalite ayarı); bu akışta hiçbirinin karşılığı yok ve
// uydurulmuyor. Çizilen: oynatıcı, başlık, iki eylem hapı, OYUN KARTI ve
// sıradaki listesi.
//
// OYUN KARTI EKRANIN ASIL İŞİ: fragman izlemenin sonu "bu oyunu al mı?"
// sorusu. Kit kartta fiyat · indirim · mağaza istiyor ve bizde o veri VAR —
// `useGamePrices` oyun detayıyla AYNI sorgu anahtarını kullanıyor, yani
// karttan detaya geçişte sıfır istek.
//
// KONTROLLER YERLİ (`nativeControls`): kitin kendi çizdiği ilerleme çubuğu,
// altyazı ve tam ekran düğmeleri yerine platformun oynatıcı kontrolleri
// duruyor. Kendi kontrolümüzü çizmek altyazı/kalite gibi var olmayan
// özellikleri de vaat ederdi.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { fetchVideo, fetchVideoFeed } from '../../src/api/videoFeed';
import { useQuery } from '../../src/hooks/useQuery';
import { useGamePrices } from '../../src/hooks/useGamePrices';
import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { NavBar, QueryState } from '../../src/components/ui/ScreenParts';
import { Button, CoverImage, PressableScale, SectionHeader, Switch, Txt } from '../../src/components/ui/Primitives';
import { DiscountTag, Price, StoreBadge } from '../../src/components/ui/Commerce';
import { Icon } from '../../src/components/Icon';
import { useAppPreferences, setAppPreference } from '../../src/services/appPreferences';
import { component as K, layout, space } from '../../src/theme/tokens';

const P = K.player;

export default function VideoScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { lang, t } = useLanguage();
  const { colors } = useDesignTheme();
  const inset = useSafeAreaInsets();

  // ── VİDEO ÖNCE KATALOGDAN OKUNUYOR ──
  // Listeden buraya gelen kullanıcı için YENİ İSTEK YOK: sıradaki listesi
  // zaten bu katalogu kullanıyor, anahtar aynı.
  const katalog = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const katalogdaki = useMemo(
    () => (katalog.data?.results || []).find((v) => String(v.id) === String(id)) || null,
    [katalog.data, id],
  );

  // TEK VİDEO UCU YALNIZCA YEDEK: derin bağlantıyla gelinmişse (video
  // katalogda değilse) deneniyor. Uç `?id=`yi tanımayan bir sunucuda `null`
  // dönüyor (bkz. api/videoFeed.js) — ekran boş durumu çiziyor, sonsuza
  // dek dönmüyor.
  const yedek = useQuery(
    `video:${lang}:${id}`,
    () => fetchVideo(id, lang),
    { ttl: 300000, enabled: !!katalog.data && !katalogdaki },
  );
  const item = katalogdaki || yedek.data || null;
  const yukleniyor = katalog.loading || (!!katalog.data && !katalogdaki && yedek.loading);

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <NavBar title={t('vid.title')} />
    <QueryState loading={yukleniyor} error={!item && (katalog.error || yedek.error)}
                empty={!yukleniyor && !item} retry={katalog.refetch} />
    {item && <Player key={id} item={item} bottom={inset.bottom} />}
  </SafeAreaView>;
}

function Player({ item, bottom }) {
  const { colors } = useDesignTheme();
  const { t, lang, formatPrice } = useLanguage();
  const { toggle, isWatched } = useWishlist();
  const router = useRouter();
  const { autoplay } = useAppPreferences();
  const query = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const next = (query.data?.results || []).filter(video => video.id !== item.id);
  // Reels'le AYNI oyun nesnesi: video öğesi olduğu gibi verilirse istek
  // listesine `hasSteam: false` yazılıyor ve fiyat izleme Steam'i atlıyor.
  const oyun = { id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '' };

  // Oyun detayıyla AYNI anahtar: karttan detaya geçişte fiyat yeniden
  // çekilmiyor ve iki ekran çelişemiyor.
  const { stores } = useGamePrices({
    queryKey: String(item.appid || item.id), appid: item.appid, title: item.name,
    name: item.name, steamUrl: item.steamUrl, enabled: !!item.appid,
  });
  const enUcuz = stores[0] || null;

  const player = useVideoPlayer({ uri: item.hls, contentType: 'hls' }, instance => {
    instance.loop = false;
    instance.staysActiveInBackground = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const open = useCallback(video => router.replace({ pathname: '/video/[id]', params: { id: video.id } }), [router]);
  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active') player.play();
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    return () => { sub.remove(); player.pause(); };
  }, [player]));
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      if (autoplay && next[0] && AppState.currentState === 'active') open(next[0]);
    });
    return () => sub.remove();
  }, [player, autoplay, next, open]);

  const izlendi = isWatched(oyun);

  return <ScrollView contentContainerStyle={{ paddingBottom: bottom + space[24] }} showsVerticalScrollIndicator={false}>
    <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} style={s.video} />
    {status === 'error' && <QueryState error retry={() => player.replaceAsync({ uri: item.hls, contentType: 'hls' }).then(() => player.play()).catch(() => {})} />}

    {/* Başlık 18/24 (kit info): oynatıcının altında metin ikinci plandadır,
        sayfa başlığı gibi büyük olması gerekmiyor. */}
    <Txt variant="cardTitleLarge" style={[s.pad, s.baslik]}>{item.name}</Txt>
    <Txt variant="footnote" style={[s.pad, s.meta, { color: colors.text2 }]}>
      {`${t('v2.trailer')} · Steam`}
    </Txt>

    {/* Eylemler 36 pt HAP (kit acts): iki tam boy düğme sarmalanıp iki
        satıra düşüyordu. Kitin beğeni/yorum/klip hapları yok — videonun
        beğenisi ve yorumu tutulmuyor. */}
    <View style={[s.pad, s.actions]}>
      <Hap icon="heart" label={t(izlendi ? 'wishlist.added' : 'wishlist.add')}
           active={izlendi} onPress={() => toggle(oyun)} />
      <Hap icon="share" label={t('stats.share')}
           onPress={() => Share.share({ message: `${item.name} ${item.steamUrl}` }).catch(() => {})} />
    </View>

    {/* ── Oyun kartı (kit gcard) ── */}
    <View style={[s.card, { backgroundColor: colors.surface1 }]}>
      <Txt variant="captionStrong" style={{ color: colors.text2 }}>{t('v2.aboutGame')}</Txt>
      <View style={s.cardRow}>
        <CoverImage source={item.image} radius={P.cardCoverRadius}
                    style={{ width: P.cardCoverWidth, height: P.cardCoverHeight }} />
        <View style={s.flex}>
          <Txt variant="cardTitleLarge" numberOfLines={2}>{item.name}</Txt>
          {item.genres?.[0] ? (
            <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{item.genres[0]}</Txt>
          ) : null}
          {/* Fiyat satırı yalnız fiyat GELDİYSE: yükleniyorken boş bir
              satır tutmak yerine kart kısa duruyor, gelince uzuyor —
              burası liste değil, tek kart; kaydırma sıçraması yok. */}
          {enUcuz ? (
            <View style={s.cardPrice}>
              <Price value={enUcuz.isFree ? t('card.free') : formatPrice(enUcuz.price)} size={16} />
              {enUcuz.discount > 0 ? <DiscountTag percent={enUcuz.discount} /> : null}
              <StoreBadge store={enUcuz.name} />
            </View>
          ) : null}
        </View>
      </View>
      <Button title={t('v2.viewGame')} variant="tinted" height={P.actionHeight}
              onPress={() => router.push({ pathname: '/game/[id]', params: { id: item.id, appid: item.appid, name: item.name, image: item.image, hasSteam: '1' } })} />
    </View>

    {/* ── Sıradaki ──
        Otomatik oynat anahtarı BAŞLIK SATIRINDA (kit sec_head sağı).
        Öncesinde başlığın altında ayrıca "Otomatik oynat" yazısı duruyordu;
        anahtarın kendi etiketi zaten o satırda ve yazı artık kalıntıydı. */}
    <View style={[s.pad, s.nextHead]}>
      <View style={s.flex}><SectionHeader title={t('v2.upNext')} /></View>
      <Txt variant="footnote" style={{ color: colors.text2 }}>{t('v2.autoplay')}</Txt>
      <Switch accessibilityLabel={t('v2.autoplay')} value={autoplay}
              onValueChange={value => setAppPreference('autoplay', value).catch(() => {})} />
    </View>

    <View style={[s.pad, s.nextList]}>
      {next.map(video => (
        <SiradakiSatir key={video.id} item={video} onPress={() => open(video)} />
      ))}
    </View>
  </ScrollView>;
}

/** Eylem hapı — kit acts: 36 pt, `surface2`, ikon 17 + 14/600 metin. */
function Hap({ icon, label, active, onPress }) {
  const { colors } = useDesignTheme();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ selected: !!active }} onPress={onPress}
      style={[s.hap, { backgroundColor: colors.surface2 }]}>
      <Icon name={icon} size={P.actionIcon} color={active ? colors.red : colors.text}
            fill={active ? colors.red : undefined} />
      <Txt variant="subhead" numberOfLines={1}>{label}</Txt>
    </PressableScale>
  );
}

/**
 * Sıradaki satırı — kit upnext: 160×90 küçük resim + 14/19 başlık.
 *
 * Tam genişlik karttan satıra indi: bu liste bir KUYRUK, vitrin değil;
 * kitin yoğunluğunda dört video bir ekrana sığıyor.
 */
function SiradakiSatir({ item, onPress }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={item.name} onPress={onPress} style={s.next}>
      <CoverImage source={item.thumbnail || item.image} radius={P.nextThumbRadius}
                  style={{ width: P.nextThumbWidth, height: P.nextThumbHeight }} />
      <View style={s.flex}>
        <Txt variant="subheadRegular" numberOfLines={3}>{item.name}</Txt>
        <Txt variant="caption" numberOfLines={1} style={[s.nextMeta, { color: colors.text2 }]}>
          {item.genres?.[0] ? `${t('v2.trailer')} · ${item.genres[0]}` : t('v2.trailer')}
        </Txt>
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  video: { width: '100%', aspectRatio: 16 / 9 },
  pad: { paddingHorizontal: layout.gutter },
  flex: { flex: 1, minWidth: 0 },

  baslik: { marginTop: P.titleTop },
  meta: { marginTop: P.metaTop },
  actions: { marginTop: P.actionsTop, flexDirection: 'row', gap: P.actionGap },
  hap: {
    height: P.actionHeight, paddingHorizontal: space[12], borderRadius: P.actionHeight / 2,
    flexDirection: 'row', alignItems: 'center', gap: P.cardPriceGap,
  },

  card: {
    marginTop: P.cardTop, marginHorizontal: layout.gutter,
    padding: P.cardPadding, borderRadius: P.cardRadius, gap: P.cardGap,
  },
  cardRow: { minHeight: P.cardRow, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  cardPrice: { height: P.cardPriceRow, flexDirection: 'row', alignItems: 'center', gap: P.cardPriceGap },

  nextHead: { marginTop: P.nextTop, flexDirection: 'row', alignItems: 'center', gap: P.cardPriceGap },
  nextList: { marginTop: P.nextListTop, gap: P.nextGap },
  next: { minHeight: P.nextRow, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  nextMeta: { marginTop: P.nextTextGap },
});
