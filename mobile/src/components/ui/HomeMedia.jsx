import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useQuery } from '../../hooks/useQuery';
import { fetchNews } from '../../api/news';
import { fetchVideoFeed } from '../../api/videoFeed';
import { useLanguage } from '../../context/LanguageContext';
import { bagilZaman } from '../../utils/relativeTime';
import { SectionHeader } from './Primitives';
import { NewsFeature, NewsRow } from './Media';
import { Rail } from './GameCards';
import NewsImage from '../NewsImage';
import VideoCard from './VideoCard';
import { component as K, layout } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// G-04 "Oyun Dünyasından" ve "İzlemeye Değer" (kit home() s7/s8).
//
// Haber: öne çıkan kart + üç satır (satırlar 18 altta, aralık 14). Kategori
// sunucunun konu etiketi (`cat`); zaman istemcide bağıl (bkz. relativeTime).
// Kırmızı canlı nokta ilk bir saat (G-DS-3: "Tazelik: kırmızı nokta ilk 1
// saat"). Görseli olmayan RSS öğesi eski davranıştaki monogramla çiziliyor.
//
// Önbellek anahtarları /news (`news:v2:<dil>`) ve Videolar sekmesiyle
// (`video-catalog:<dil>`) ortak; ikinci ekran açılınca istek tekrarlanmıyor.
// ─────────────────────────────────────────────────────────────────────────────
const CANLI_MS = 60 * 60 * 1000;

export default function HomeMedia() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const news = useQuery(`news:v2:${lang}`, () => fetchNews(lang), { ttl: 600000 });
  const videos = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const items = news.data?.results || [];
  const clips = videos.data?.results || [];
  const [first, ...rest] = items.slice(0, 4);

  const zaman = (item) => bagilZaman(item.ts, t) || item.date;
  const canli = (item) => !!item.ts && Date.now() - item.ts < CANLI_MS;
  const open = (item) => router.push({ pathname: '/news/[id]', params: { id: item.id } });
  const yedek = (item) => <NewsImage item={item} style={StyleSheet.absoluteFill} />;
  const openVideo = (item) => router.push({ pathname: '/video/[id]', params: { id: item.id } });

  return <>
    {!!first && <View style={s.section}>
      <View style={s.heading}><SectionHeader title={t('v2.gamingWorld')} action={t('home.viewAll')} onAction={() => router.push('/news')} /></View>
      <View style={s.pad}>
        <NewsFeature title={first.title} image={first.image} fallback={yedek(first)} category={first.cat} time={zaman(first)}
          live={canli(first)} source={first.source} onPress={() => open(first)} />
        {rest.length > 0 && <View style={s.rows}>
          {rest.map((item) => <NewsRow key={item.id} title={item.title} image={item.image} fallback={yedek(item)} category={item.cat}
            time={zaman(item)} live={canli(item)} onPress={() => open(item)} />)}
        </View>}
      </View>
    </View>}
    {clips.length > 0 && <View style={s.section}>
      <View style={s.heading}><SectionHeader title={t('v2.exploreVideos')} action={t('home.viewAll')} onAction={() => router.push('/videos')} /></View>
      <Rail kind="video" data={clips.slice(0, 8)} keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <VideoCard item={item} onPress={() => openVideo(item)} />} />
    </View>}
  </>;
}

const s = StyleSheet.create({
  section: { marginTop: layout.sectionGap },
  heading: { paddingHorizontal: layout.gutter, marginBottom: layout.headingToContent },
  pad: { paddingHorizontal: layout.gutter },
  rows: { marginTop: K.home.newsRowsTop, gap: K.home.newsRowsGap },
});
