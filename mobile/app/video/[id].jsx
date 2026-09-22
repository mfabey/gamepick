import { useCallback, useEffect } from 'react';
import { AppState, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { fetchVideo, fetchVideoFeed } from '../../src/api/videoFeed';
import { useQuery } from '../../src/hooks/useQuery';
import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { NavBar, QueryState } from '../../src/components/ui/ScreenParts';
import { Button, SectionHeader, Switch, Txt } from '../../src/components/ui/Primitives';
import VideoCard from '../../src/components/ui/VideoCard';
import { useAppPreferences, setAppPreference } from '../../src/services/appPreferences';

export default function VideoScreen() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { lang, t } = useLanguage();
  const { colors } = useDesignTheme();
  const inset = useSafeAreaInsets();
  const query = useQuery(`video:${lang}:${id}`, () => fetchVideo(id, lang), { ttl: 300000 });
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <NavBar title={t('vid.title')} />
    <QueryState loading={query.loading} error={query.error} empty={!query.data} retry={query.refetch} />
    {query.data && <Player key={id} item={query.data} bottom={inset.bottom} />}
  </SafeAreaView>;
}
function Player({ item, bottom }) {
  const { colors } = useDesignTheme();
  const { t, lang } = useLanguage();
  const { toggle, isWatched } = useWishlist();
  const router = useRouter();
  const { autoplay } = useAppPreferences();
  const query = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const next = (query.data?.results || []).filter(video => video.id !== item.id);
  // Reels'le AYNI oyun nesnesi: video öğesi olduğu gibi verilirse istek
  // listesine `hasSteam: false` yazılıyor ve fiyat izleme Steam'i atlıyor.
  const oyun = { id: item.id, name: item.name, image: item.image, appid: item.appid, hasSteam: true, slug: '' };
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
  return <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }}>
    <VideoView player={player} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} style={s.video} />
    {status === 'error' && <QueryState error retry={() => player.replaceAsync({ uri: item.hls, contentType: 'hls' }).then(() => player.play()).catch(() => {})} />}
    <View style={s.body}>
      <Txt variant="title1">{item.name}</Txt>
      <Txt variant="footnote" style={{ color: colors.text2 }}>{t('v2.trailers')} · Steam</Txt>
      <View style={s.actions}>
        <Button title={t(isWatched(oyun) ? 'wishlist.added' : 'wishlist.add')} icon="heart" variant="secondary" onPress={() => toggle(oyun)} />
        <Button title={t('stats.share')} icon="share" variant="secondary" onPress={() => Share.share({ message: `${item.name} ${item.steamUrl}` }).catch(() => {})} />
      </View>
      <View style={[s.game, { backgroundColor: colors.surface1 }]}>
        <Txt variant="cardTitle">{item.name}</Txt>
        <Button title={t('v2.viewGame')} variant="tinted" onPress={() => router.push({ pathname: '/game/[id]', params: { id: item.id, appid: item.appid, name: item.name, image: item.image, hasSteam: '1' } })} />
      </View>
      <View style={s.next}><SectionHeader title={t('v2.upNext')} /><Switch accessibilityLabel={t('v2.autoplay')} value={autoplay} onValueChange={value => setAppPreference('autoplay', value).catch(() => {})} /></View>
      <Txt variant="footnote" style={{ color: colors.text2 }}>{t('v2.autoplay')}</Txt>
      {next.map(video => <VideoCard key={video.id} item={video} fluid onPress={() => open(video)} />)}
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  video: { width: '100%', aspectRatio: 16 / 9 }, body: { padding: 20, gap: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  game: { borderRadius: 16, padding: 16, gap: 12 }, next: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
