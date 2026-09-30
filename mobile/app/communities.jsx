// ─────────────────────────────────────────────────────────────────────────────
// Toplulukları keşfet (27 Eyl) — Topluluk sekmesindeki "Toplulukların"
// rayının "Tümü" / "Keşfet" hedefi. Kit'te ayrı ekran yok (kutucuk '#'
// bağlantısı); tasarım dili G-06'nın "Topluluklar" kapsamındaki satırlar
// (CommunityRow) ile aynı.
//
// Üstte katıldıkların, altta en etkin topluluklar (en çok gönderi alan).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { NavBar } from '../src/components/ui/Navigation';
import { Button, SectionHeader } from '../src/components/ui/Primitives';
import { CommunityRow } from '../src/components/ui/Social';
import EmptyState from '../src/components/EmptyState';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { useAuth } from '../src/context/AuthContext';
import { useQuery } from '../src/hooks/useQuery';
import { communityAction, discoverCommunities, fetchMyCommunities } from '../src/api/social';
import { layout, space } from '../src/theme/tokens';

export default function Topluluklar() {
  const { colors } = useDesignTheme();
  const { t, tSay } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { account } = useAuth();
  const benimAnahtar = account?.uid ? `communities:mine:${account.uid}` : null;
  const { data: benim, refetch: benimTazele } = useQuery(benimAnahtar, fetchMyCommunities, { ttl: 60 * 1000, enabled: !!account?.uid });
  const { data: kesif, error, loading, refetch: kesifTazele } = useQuery('communities:discover', discoverCommunities, { ttl: 10 * 60 * 1000 });
  const [mesgul, setMesgul] = useState(null);

  const benimList = benim?.communities || [];
  const katildiklarim = new Set(benimList.map((c) => c.appid));
  const oneriler = (kesif?.communities || []).filter((c) => !katildiklarim.has(c.appid));

  const ac = (c) => router.push({ pathname: '/community/[appid]', params: { appid: c.appid, name: c.name, image: c.image || '' } });
  const katil = useCallback(async (c) => {
    if (!account) { router.push('/account'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMesgul(c.appid);
    try {
      await communityAction('join', c);
      await Promise.all([benimTazele?.(), kesifTazele?.()]);
    } catch { /* satır eski hâlinde kalır */ } finally { setMesgul(null); }
  }, [account, router, benimTazele, kesifTazele]);

  const meta = (c) => `${tSay(c.memberCount, 'comm.memberOne', 'comm.members')} · ${tSay(c.postCount, 'comm.postOne', 'comm.posts')}`;

  return (
    <SafeAreaView edges={['top']} style={[styles.kok, { backgroundColor: colors.bg }]}>
      <NavBar title={t('comm.discoverTitle')} border />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space[24] }} showsVerticalScrollIndicator={false}>
        {benimList.length > 0 && (
          <View style={styles.bolum}>
            <SectionHeader title={t('comm.yours')} />
            {benimList.map((c) => (
              <CommunityRow key={c.appid} image={c.image} name={c.name} meta={c.newCount > 0 ? t('comm.new').replace('{n}', String(c.newCount)) : meta(c)} onPress={() => ac(c)} />
            ))}
          </View>
        )}
        {oneriler.length > 0 && (
          <View style={styles.bolum}>
            <SectionHeader title={t('comm.communities')} />
            {oneriler.map((c) => (
              <CommunityRow key={c.appid} image={c.image} name={c.name} meta={meta(c)} onPress={() => ac(c)}
                right={<Button title={t('comm.join')} height={34} loading={mesgul === c.appid} onPress={() => katil(c)} />} />
            ))}
          </View>
        )}
        {!loading && !benimList.length && !oneriler.length ? (
          <View style={styles.bos}>
            <EmptyState icon="comment" title={error ? t('comm.error') : t('comm.discoverTitle')} text={error ? undefined : t('comm.discoverEmpty')}
              actionLabel={error ? t('limited.retry') : undefined} onAction={error ? kesifTazele : undefined} compact />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  kok: { flex: 1 },
  bolum: { paddingHorizontal: layout.gutter, paddingTop: space[24], gap: space[8] },
  bos: { paddingTop: space[40], paddingHorizontal: layout.gutter },
});
