// ─────────────────────────────────────────────────────────────────────────────
// İncelemeler — kullanıcı içeriğinin kendi sayfası.
//
// OYUN SAYFALARINDA DEĞİL, BURADA. Oyun sayfaları uygulamanın kendi verdiği
// bilgiyi göstermeye devam ediyor (Steam'in toplu analizi). Sebebi terk
// edilmişlik riski: kullanıcı sayısı azken her oyunun altında "0 inceleme"
// görmek, uygulamanın ölü olduğunu söyler. Seyrek kullanıcı içeriği, hiç
// içerik olmamasından kötüdür.
//
// AYNI RİSK BU SAYFA İÇİN DE GEÇERLİ, o yüzden sayfa bir "akış" olarak
// kurulmadı: ÜSTTE yazabileceğin oyunlar var ve Steam'i bağlı bir kullanıcıda
// o liste ilk günden dolu. Sayfa "kimse bir şey yazmamış" yerine "şunlar
// hakkında yazabilirsin" diye açılıyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { getReviewFeed, getEligibleGames } from '../src/api/social';
import { getSession, subscribeSession } from '../src/services/session';
import ReviewComposer from '../src/components/ReviewComposer';
import ReviewCard from '../src/components/ReviewCard';
import ReportSheet from '../src/components/ReportSheet';
import { colors, radius, spacing, type, PRESSED, NUMERIC, TAB_SPACE } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';

export default function ReviewsScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [session, setSession] = useState(() => getSession());
  useEffect(() => subscribeSession(() => setSession(getSession())), []);

  const [eligible, setEligible] = useState(null);
  const [feed, setFeed] = useState(null);
  const [tab, setTab] = useState('community');   // community | mine
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [composer, setComposer] = useState(null); // { appid, name, existing }
  const [reportTarget, setReportTarget] = useState(null);

  // Topluluk akışı HESAPSIZ okunur — inceleme okumak kayıt gerektirmiyor.
  // Oturumsuzken "yazabileceğin oyunlar" sorulmuyor: o uç jetonlu ve
  // hesapsız kullanıcının zaten yazamayacağı bir liste.
  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [e, f] = await Promise.all([
        session ? getEligibleGames().catch(() => null) : Promise.resolve(null),
        getReviewFeed(session && tab === 'mine').catch(() => null),
      ]);
      setEligible(e);
      setFeed(f?.reviews || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, tab]);

  useEffect(() => { load(); }, [load]);

  // Yazma denemesi oturum ister; hata vermek yerine kayıt ekranına götürüyoruz.
  const requireAccount = useCallback(() => {
    router.push('/account');
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header t={t} onBack={() => router.back()} />

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: TAB_SPACE }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.text2} />
          }
        >
          {/* ── Yazabileceğin oyunlar ──
              Sayfanın boş görünmemesini sağlayan kısım. Steam bağlıysa ilk
              günden dolu; topluluk akışı boş olsa bile sayfa ölü durmuyor. */}
          {eligible?.games?.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>{t('rev.canWrite')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.strip}
              >
                {eligible.games.map((g) => (
                  <Pressable
                    key={g.appid}
                    style={({ pressed }) => [styles.gameCard, pressed && PRESSED]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setComposer({ appid: g.appid, name: g.name, existing: null });
                    }}
                  >
                    <Image source={g.image} style={styles.gameImg} contentFit="cover" transition={140} />
                    <Text style={styles.gameName} numberOfLines={2}>{g.name}</Text>
                    <Text style={[styles.gameHours, NUMERIC]}>
                      {Math.round(g.hours)}{lang === 'tr' ? ' saat' : ' h'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          {eligible?.games?.length === 0 && (
            <Text style={styles.hint}>{t('rev.noEligible')}</Text>
          )}

          {/* ── Topluluk / Benimkiler ──
              Hesapsız kullanıcı topluluğu okuyabiliyor ama "Benimkiler"in
              karşılığı yok; sekmeyi gizlemek yerine kayıt ekranına götürüyoruz
              — özelliğin varlığını göstermek, yokmuş gibi yapmaktan iyi. */}
          <View style={styles.tabs}>
            {['community', 'mine'].map((k) => (
              <Pressable
                key={k}
                style={({ pressed }) => [styles.tab, tab === k && styles.tabOn, pressed && PRESSED]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  if (k === 'mine' && !session) { requireAccount(); return; }
                  setTab(k);
                }}
              >
                <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
                  {k === 'community' ? t('rev.community') : t('rev.mine')}
                </Text>
              </Pressable>
            ))}
          </View>

          {feed?.length === 0 ? (
            <Text style={styles.hint}>
              {tab === 'mine'
                ? t('rev.mineEmpty')
                : (session ? t('rev.communityEmpty') : t('rev.communityEmptyGuest'))}
            </Text>
          ) : (
            feed?.map((r) => (
              <ReviewCard
                key={`${r.appid}:${r.uid}`}
                review={r}
                onPress={() => router.push({
                  pathname: '/game/[id]',
                  params: { id: `rawg_${r.appid}`, appid: r.appid, name: r.gameName || '', image: r.image },
                })}
                onLongPress={() => setReportTarget(r)}
                onEdit={tab === 'mine'
                  ? () => setComposer({ appid: r.appid, name: r.gameName, existing: r })
                  : undefined}
              />
            ))
          )}
        </ScrollView>
      )}

      <ReviewComposer
        visible={!!composer}
        onClose={() => setComposer(null)}
        appid={composer?.appid}
        gameName={composer?.name}
        existing={composer?.existing}
        onSaved={() => { setComposer(null); load(); }}
      />

      <ReportSheet
        visible={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType="review"
        targetId={reportTarget ? `${reportTarget.appid}:${reportTarget.uid}` : ''}
      />
    </SafeAreaView>
  );
}

function Header({ t, onBack }) {
  return (
    <View style={styles.head}>
      <Pressable style={({ pressed }) => [styles.iconBtn, pressed && PRESSED]} onPress={onBack} hitSlop={10}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text style={styles.h1}>{t('rev.section')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  h1: { flex: 1, color: colors.text, fontSize: type.title3, fontWeight: '800', letterSpacing: -0.4 },

  sectionLabel: {
    color: colors.text3, fontSize: type.caption, fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  strip: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.lg },
  gameCard: { width: 132 },
  gameImg:  { width: 132, height: 62, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  gameName: { color: colors.text, fontSize: type.caption, fontWeight: '700', marginTop: 5 },
  gameHours:{ color: colors.text3, fontSize: type.caption2, marginTop: 1 },

  hint: {
    color: colors.text3, fontSize: type.footnote, textAlign: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
  },

  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tab: {
    flex: 1, minHeight: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tabOn:      { backgroundColor: colors.bgInput, borderColor: colors.borderHover },
  tabText:    { color: colors.text3, fontSize: type.footnote, fontWeight: '700' },
  tabTextOn:  { color: colors.text },


});
