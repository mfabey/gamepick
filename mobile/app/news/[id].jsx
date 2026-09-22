import { Share, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQuery } from '../../src/hooks/useQuery';
import { fetchNewsArticle } from '../../src/api/news';
import { useLanguage } from '../../src/context/LanguageContext';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { PageHeader, QueryState } from '../../src/components/ui/ScreenParts';
import { Button, IconButton, Txt } from '../../src/components/ui/Primitives';
import NewsImage from '../../src/components/NewsImage';

export default function NewsDetail() {
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { colors } = useDesignTheme();
  const { lang, t } = useLanguage();
  const bottom = useSafeAreaInsets().bottom;
  const query = useQuery(`news-article:${lang}:${id}`, () => fetchNewsArticle(id, lang), { ttl: 1800000 });
  const item = query.data;
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
    <PageHeader title={t('news.title')} back>
      {item && <IconButton icon="share" label={t('stats.share')} onPress={() => Share.share({ message: `${item.title} ${item.url}` }).catch(() => {})} />}
    </PageHeader>
    <QueryState loading={query.loading} error={!item && query.error} empty={!item} retry={query.refetch} />
    {item && <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }}>
      <NewsImage item={item} style={s.image} />
      <View style={s.body}>
        <Txt variant="footnoteStrong" style={{ color: colors.red }}>{item.cat}</Txt>
        <Txt variant="largeTitle">{item.title}</Txt>
        <Txt variant="footnote" style={{ color: colors.text2 }}>{item.source} · {item.date}</Txt>
        <Txt variant="caption" style={{ color: colors.text2 }}>{t('v2.newsSummary')}</Txt>
        {!!item.excerpt && <Txt variant="bodyLarge" selectable>{item.excerpt}</Txt>}
        <Button title={t('v2.readSource')} icon="ext" onPress={() => /^https?:\/\//i.test(item.url) && WebBrowser.openBrowserAsync(item.url)} />
      </View>
    </ScrollView>}
  </SafeAreaView>;
}
const s = StyleSheet.create({ image: { width: '100%', height: 260 }, body: { padding: 20, gap: 20 } });
