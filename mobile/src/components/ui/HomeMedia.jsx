import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useQuery } from '../../hooks/useQuery';
import { fetchNews } from '../../api/news';
import { fetchVideoFeed } from '../../api/videoFeed';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { PressableScale, SectionHeader, Txt } from './Primitives';
import NewsImage from '../NewsImage';
import VideoCard from './VideoCard';

export default function HomeMedia() {
  const { t, lang } = useLanguage();
  const { colors } = useDesignTheme();
  const router = useRouter();
  const news = useQuery(`news:v2:${lang}`, () => fetchNews(lang), { ttl: 600000 });
  const videos = useQuery(`video-catalog:${lang}`, () => fetchVideoFeed(1, lang, 'catalog'), { ttl: 300000 });
  const items = news.data?.results || [];
  const clips = videos.data?.results || [];
  return <>
    {!!items.length && <View style={s.section}>
      <View style={s.heading}><SectionHeader title={t('news.title')} action={t('home.viewAll')} onAction={() => router.push('/news')} /></View>
      <View style={s.news}>{items.slice(0, 4).map((item, index) => <PressableScale key={item.url} accessibilityRole="button" accessibilityLabel={item.title}
        onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })} style={[index === 0 ? s.feature : s.row, { backgroundColor: colors.surface1 }]}>
        <NewsImage item={item} style={index === 0 ? s.heroImage : s.thumb} />
        <View style={[s.copy, { flex: index === 0 ? undefined : 1 }]}>
          <Txt variant={index === 0 ? 'headline' : 'cardTitle'} numberOfLines={3}>{item.title}</Txt>
          <Txt variant="caption" style={{ color: colors.text2 }}>{item.source} · {item.date}</Txt>
        </View>
      </PressableScale>)}</View>
    </View>}
    {!!clips.length && <View style={s.section}>
      <View style={s.heading}><SectionHeader title={t('v2.exploreVideos')} action={t('home.viewAll')} onAction={() => router.push('/videos')} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
        {clips.slice(0, 8).map(item => <VideoCard key={item.id} item={item} onPress={() => router.push({ pathname: '/video/[id]', params: { id: item.id } })} />)}
      </ScrollView>
    </View>}
  </>;
}
const s = StyleSheet.create({
  section: { marginTop: 32 }, heading: { paddingHorizontal: 20, marginBottom: 12 },
  news: { paddingHorizontal: 20, gap: 16 }, feature: { borderRadius: 16, overflow: 'hidden' },
  heroImage: { width: '100%', height: 196 }, thumb: { width: 96, height: 72, borderRadius: 12 },
  copy: { padding: 12, gap: 8 }, row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12 },
  rail: { paddingHorizontal: 20, gap: 12 },
});
