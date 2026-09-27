// ─────────────────────────────────────────────────────────────────────────────
// BİRLEŞİK ARAMA — G-05 Arama + G-06 Sonuçlar (27 Eyl, kit s2.py search() /
// results()). /games ekranının parçaları: rota değişmedi, katalog "Oyunlar"
// kapsamı olarak kaldı (design-migration §1, ekran 05/06).
//
//   AramaOnerileri  arama kutusu odakta ve BOŞKEN: son aramalar (yalnız
//                   cihazda) + trend aramalar (sunucu, yalnız oyun adları).
//   AramaSonuclari  sorgu varken Oyunlar dışındaki kapsamlar ve "Tümü".
//
// KAYNAKLAR: kişiler /api/social/search (hesap ister), topluluklar
// /api/social/community?q=, haberler anasayfa/haberler ekranıyla AYNI liste
// (başlıkta arama — tam metin hizmeti yok, kit'teki gibi başlık eşleşmesi).
// Videolar kapsamı YOK: video kataloğunda arama ucu yok.
//
// Bir kapsamın ucu yanıt vermezse (sunucu eski, çevrimdışı) o bölüm
// çizilmiyor; "Tümü" diğerlerini göstermeye devam ediyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon } from './Icon';
import GameCard from './ui/GameCard';
import EmptyState from './EmptyState';
import NewsImage from './NewsImage';
import { Button, SectionHeader, Txt } from './ui/Primitives';
import { CommunityRow, UserRow } from './ui/Social';
import { NewsRow } from './ui/Media';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { useQuery } from '../hooks/useQuery';
import { getSession } from '../services/session';
import { aramaSil, aramalariTemizle, useSonAramalar } from '../services/sonAramalar';
import { fetchSearchTrends } from '../api/games';
import { fetchNews } from '../api/news';
import { searchCommunities, searchUsers } from '../api/social';
import { bagilZaman } from '../utils/relativeTime';
import { component as K, layout, radius, space } from '../theme/tokens';

const A = K.searchScreen;

/** Boş arama görünümü (kit search()). Gösterecek bir şey yoksa null. */
export function AramaOnerileri({ onSec, style }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const sonlar = useSonAramalar();
  const { data } = useQuery('search:trends', fetchSearchTrends, { ttl: 10 * 60 * 1000 });
  const trendler = data?.trends || [];
  if (!sonlar.length && !trendler.length) return null;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      style={style} contentContainerStyle={styles.oneriIcerik}>
      {sonlar.length > 0 && (
        <View>
          <View style={styles.basliksatir}>
            <Txt variant="title2" accessibilityRole="header">{t('srch.recent')}</Txt>
            <Button title={t('srch.clear')} variant="tertiary" height={A.clear} onPress={aramalariTemizle} style={styles.temizle} />
          </View>
          <View style={styles.sonlar}>
            {sonlar.map((q) => (
              <View key={q} style={styles.son}>
                <Pressable accessibilityRole="button" onPress={() => onSec(q)} style={styles.sonMetin}>
                  <Icon name="clock" size={A.recentIcon} color={colors.text3} />
                  <Txt variant="input" numberOfLines={1} style={styles.esnek}>{q}</Txt>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={t('srch.remove').replace('{q}', q)}
                  onPress={() => aramaSil(q)} hitSlop={4} style={styles.sil}>
                  <Icon name="x" size={A.removeIcon} color={colors.text3} strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
      {trendler.length > 0 && (
        <View style={sonlar.length ? styles.bolumAra : null}>
          <Txt variant="title2" accessibilityRole="header">{t('srch.trending')}</Txt>
          <View style={styles.trendler}>
            {trendler.map((tr, i) => (
              <Pressable key={tr.appid} accessibilityRole="button" onPress={() => onSec(tr.name)}
                style={({ pressed }) => [styles.trend, { backgroundColor: pressed ? colors.surface2 : colors.surface1 }]}>
                <Icon name={i === 0 ? 'flame' : 'up'} size={A.trendIcon} color={i === 0 ? colors.orange : colors.text2} strokeWidth={2.2} />
                <Txt variant="subheadRegular" numberOfLines={1} style={styles.trendMetin}>{tr.name}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Sonuçlar (kit results()). `kapsam` 'all' | 'people' | 'communities' | 'news';
 * 'games' kapsamını ekranın kendi ızgarası çiziyor. `oyunlar` ızgaranın
 * ilk sayfası — "Tümü"de ilk sekizi yatay rayda.
 */
export function AramaSonuclari({ q, kapsam, onKapsam, oyunlar = [], oyunlarYukleniyor, oyunAc, altBosluk = 0 }) {
  const { colors } = useDesignTheme();
  const { t, lang, tSay } = useLanguage();
  const router = useRouter();
  const hepsi = kapsam === 'all';
  const oturum = !!getSession();

  const kisiler = useQuery(`search:people:${q}`, () => searchUsers(q),
    { ttl: 60 * 1000, enabled: !!q && oturum && (hepsi || kapsam === 'people') });
  const topluluk = useQuery(`search:comm:${q}`, () => searchCommunities(q),
    { ttl: 60 * 1000, enabled: !!q && (hepsi || kapsam === 'communities') });
  const haber = useQuery(`news:v2:${lang}`, () => fetchNews(lang), { ttl: 600000, enabled: hepsi || kapsam === 'news' });

  const kList = kisiler.data?.results || [];
  const tList = topluluk.data?.communities || [];
  const hList = useMemo(() => {
    const aranan = q.toLocaleLowerCase();
    return (haber.data?.results || []).filter((n) => String(n.title || '').toLocaleLowerCase().includes(aranan));
  }, [haber.data, q]);

  const kisiSatir = (p) => (
    <UserRow key={p.uid} avatar={p.avatar} name={p.displayName || p.username} handle={`@${p.username}`}
      onPress={() => router.push(`/u/${p.username}`)} />
  );
  const toplulukSatir = (c) => (
    <CommunityRow key={c.appid} image={c.image} name={t('comm.title').replace('{name}', c.name)}
      meta={`${tSay(c.memberCount, 'comm.memberOne', 'comm.members')} · ${tSay(c.postCount, 'comm.postOne', 'comm.posts')}`}
      onPress={() => router.push({ pathname: '/community/[appid]', params: { appid: c.appid, name: c.name, image: c.image || '' } })}
      right={<Icon name="chev" size={A.chevron} color={colors.text3} strokeWidth={2.4} />} />
  );
  const haberSatir = (n) => (
    <NewsRow key={n.id} title={n.title} image={n.image} fallback={<NewsImage item={n} style={StyleSheet.absoluteFill} />}
      category={n.cat} time={bagilZaman(n.ts, t) || n.date || ''} onPress={() => router.push({ pathname: '/news/[id]', params: { id: n.id } })} />
  );
  const tumu = (n, k) => (n > 3 ? { action: t('srch.seeAll').replace('{n}', String(n)), onAction: () => onKapsam(k) } : {});

  const kisiGiris = !oturum ? (
    <View style={[styles.giris, { backgroundColor: colors.surface1 }]}>
      <Txt variant="subheadRegular" style={[styles.esnek, { color: colors.text2 }]}>{t('srch.peopleSignIn')}</Txt>
      <Button title={t('acc.signIn')} variant="secondary" height={A.clear} onPress={() => router.push('/account?mode=signin')} />
    </View>
  ) : null;

  const bos = (yuk) => (yuk ? null : (
    <View style={styles.bos}><EmptyState icon="search" title={t('srch.none').replace('{q}', q)} compact /></View>
  ));

  let icerik;
  if (kapsam === 'people') {
    icerik = kisiGiris || (kList.length ? <View style={styles.liste}>{kList.map(kisiSatir)}</View> : bos(kisiler.loading));
  } else if (kapsam === 'communities') {
    icerik = tList.length ? <View style={styles.liste}>{tList.map(toplulukSatir)}</View> : bos(topluluk.loading);
  } else if (kapsam === 'news') {
    icerik = hList.length ? <View style={[styles.liste, styles.haberler]}>{hList.map(haberSatir)}</View> : bos(haber.loading);
  } else {
    const hicYok = !oyunlar.length && !kList.length && !tList.length && !hList.length;
    const yukleniyor = oyunlarYukleniyor || kisiler.loading || topluluk.loading || haber.loading;
    icerik = hicYok ? bos(yukleniyor) : (
      <>
        {oyunlar.length > 0 && (
          <View style={styles.bolum}>
            <View style={styles.pad}><SectionHeader title={t('srch.games')} action={t('srch.seeAll').replace('{n}', String(oyunlar.length))} onAction={() => onKapsam('games')} /></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ray}>
              {oyunlar.slice(0, 8).map((g) => <GameCard key={g.id} game={g} onPress={() => oyunAc(g)} />)}
            </ScrollView>
          </View>
        )}
        {kList.length > 0 && (
          <View style={[styles.bolum, styles.pad]}>
            <SectionHeader title={t('srch.people')} {...tumu(kList.length, 'people')} />
            {kList.slice(0, 3).map(kisiSatir)}
          </View>
        )}
        {tList.length > 0 && (
          <View style={[styles.bolum, styles.pad]}>
            <SectionHeader title={t('comm.communities')} {...tumu(tList.length, 'communities')} />
            {tList.slice(0, 3).map(toplulukSatir)}
          </View>
        )}
        {hList.length > 0 && (
          <View style={[styles.bolum, styles.pad]}>
            <SectionHeader title={t('srch.news')} {...tumu(hList.length, 'news')} />
            <View style={styles.haberler}>{hList.slice(0, 3).map(haberSatir)}</View>
          </View>
        )}
      </>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: altBosluk }}>
      {icerik}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  esnek: { flex: 1, minWidth: 0 },
  pad: { paddingHorizontal: layout.gutter },
  oneriIcerik: { paddingHorizontal: layout.gutter, paddingTop: space[16], paddingBottom: space[40] },
  basliksatir: { height: A.headRow, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  temizle: { paddingHorizontal: 0 },
  sonlar: { marginTop: A.recentTop },
  son: { height: layout.minTouch, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  sonMetin: { flex: 1, minWidth: 0, height: layout.minTouch, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  sil: { width: A.remove, height: A.remove, alignItems: 'center', justifyContent: 'center', marginRight: A.removeInset },
  bolumAra: { marginTop: space[24] },
  trendler: { marginTop: space[12], flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  trend: { height: A.trend, maxWidth: '100%', paddingHorizontal: space[12], borderRadius: radius.segmented, flexDirection: 'row', alignItems: 'center', gap: A.trendGap },
  trendMetin: { flexShrink: 1 },
  bolum: { marginTop: space[24] },
  ray: { paddingHorizontal: layout.gutter, paddingTop: space[12], gap: K.rail.game[0] },
  liste: { paddingHorizontal: layout.gutter, paddingTop: space[8] },
  haberler: { gap: space[12], paddingTop: space[12] },
  giris: { marginHorizontal: layout.gutter, marginTop: space[16], padding: space[16], borderRadius: radius.group, flexDirection: 'row', alignItems: 'center', gap: space[12] },
  bos: { paddingTop: space[40], paddingHorizontal: layout.gutter },
});
