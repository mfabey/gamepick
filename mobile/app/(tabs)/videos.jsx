import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useVideoCatalog } from '../../src/hooks/useVideoCatalog';

import { useLanguage } from '../../src/context/LanguageContext';
import { useWishlist } from '../../src/context/WishlistContext';
import { useDesignTheme } from '../../src/theme/useDesignTheme';
import { useTabBosluk } from '../../src/hooks/useAltBosluk';
import { useTabPressAction, scrollRefToTop } from '../../src/hooks/useTabPressAction';
import { Button, Chip, IconButton, SectionHeader } from '../../src/components/ui/Primitives';
import { PageHeader, QueryState } from '../../src/components/ui/ScreenParts';
import VideoCard from '../../src/components/ui/VideoCard';

export default function VideosScreen() {
  const { colors } = useDesignTheme();
  const { t, lang } = useLanguage();
  const { isWatched } = useWishlist();
  const router = useRouter();
  const bottom = useTabBosluk();
  const ref = useRef(null);
  const [saved, setSaved] = useState(false);
  const query = useVideoCatalog(lang);
  const all = query.items;
  const items = saved ? all.filter(isWatched) : all;
  const top = useCallback(() => scrollRefToTop(ref), []);
  useTabPressAction(top);
  const open = item => router.push({ pathname: '/video/[id]', params: { id: item.id } });
  return <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: colors.bg }]}>
    <PageHeader title={t('vid.title')}>
      <IconButton icon="search" label={t('hero.search')} onPress={() => router.push('/games')} />
      <IconButton icon="heart" label={t('v2.savedGames')} selected={saved} onPress={() => setSaved(value => !value)} />
    </PageHeader>
    <ScrollView ref={ref} contentContainerStyle={{ paddingBottom: bottom }} showsVerticalScrollIndicator={false}>
      <View style={s.filters}>
        <Chip title={t('v2.trailers')} selected={!saved} onPress={() => setSaved(false)} />
        <Chip title={t('v2.savedGames')} selected={saved} onPress={() => setSaved(true)} />
      </View>
      <QueryState loading={query.loading} error={!all.length && query.error} empty={!items.length} retry={query.refetch} />
      {!!items.length && <View style={s.feature}><VideoCard item={items[0]} fluid onPress={() => open(items[0])} /></View>}
      {!saved && !!all.length && <View style={s.section}>
        <View style={s.heading}><SectionHeader title={t('v2.shortClips')} action={t('home.viewAll')} onAction={() => router.push('/reels')} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>
          {all.slice(0, 8).map(item => <VideoCard key={item.id} item={item} short onPress={() => router.push({ pathname: '/reels', params: { start: item.id } })} />)}
        </ScrollView>
      </View>}
      {items.length > 1 && <View style={s.section}>
        <View style={s.heading}><SectionHeader title={t('v2.exploreVideos')} /></View>
        <View style={s.list}>{items.slice(1).map(item => <VideoCard key={item.id} item={item} fluid onPress={() => open(item)} />)}</View>
      </View>}
      {query.hasMore && <View style={s.feature}><Button title={t(query.moreError ? 'v2.retry' : 'v2.loadMore')} variant="secondary" loading={query.loadingMore} onPress={query.loadMore} /></View>}
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, filters: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  feature: { paddingHorizontal: 20 }, section: { marginTop: 32 }, heading: { paddingHorizontal: 20, marginBottom: 12 },
  rail: { paddingHorizontal: 20, gap: 12 }, list: { paddingHorizontal: 20, gap: 24 },
});
