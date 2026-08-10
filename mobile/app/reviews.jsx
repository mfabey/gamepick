// ─────────────────────────────────────────────────────────────────────────────
// İncelemeler — kullanıcı içeriğinin kendi sayfası.  [BETA]
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
import ReportSheet from '../src/components/ReportSheet';
import EmptyState from '../src/components/EmptyState';
import { getAvatarPreset } from '../src/utils/avatar';
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

  const load = useCallback(async (isRefresh = false) => {
    if (!session) { setLoading(false); return; }
    if (isRefresh) setRefreshing(true);
    try {
      // İkisi PARALEL: biri diğerini beklemek zorunda değil ve sayfa ancak
      // ikisi de gelince tam görünüyor.
      const [e, f] = await Promise.all([
        getEligibleGames().catch(() => null),
        getReviewFeed(tab === 'mine').catch(() => null),
      ]);
      setEligible(e);
      setFeed(f?.reviews || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, tab]);

  useEffect(() => { load(); }, [load]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Header t={t} onBack={() => router.back()} />
        <EmptyState
          icon="person-circle-outline"
          title={t('sf.needAccount')}
          text={t('sf.needAccountText')}
          actionLabel={t('sf.goAccount')}
          onAction={() => router.push('/account')}
        />
      </SafeAreaView>
    );
  }

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

          {/* ── Topluluk / Benimkiler ── */}
          <View style={styles.tabs}>
            {['community', 'mine'].map((k) => (
              <Pressable
                key={k}
                style={({ pressed }) => [styles.tab, tab === k && styles.tabOn, pressed && PRESSED]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(k); }}
              >
                <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
                  {k === 'community' ? t('rev.community') : t('rev.mine')}
                </Text>
              </Pressable>
            ))}
          </View>

          {feed?.length === 0 ? (
            <Text style={styles.hint}>
              {tab === 'mine' ? t('rev.mineEmpty') : t('rev.communityEmpty')}
            </Text>
          ) : (
            feed?.map((r) => (
              <ReviewCard
                key={`${r.appid}:${r.uid}`}
                review={r}
                t={t}
                lang={lang}
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
      <View style={styles.betaChip}><Text style={styles.betaText}>{t('soc.beta')}</Text></View>
    </View>
  );
}

function ReviewCard({ review, t, lang, onPress, onLongPress, onEdit }) {
  const preset = getAvatarPreset(review.author?.avatar);
  const name = review.author?.displayName || review.author?.username || '?';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && PRESSED]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={styles.cardHead}>
        <Image source={review.image} style={styles.cardImg} contentFit="cover" transition={140} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardGame} numberOfLines={1}>{review.gameName || review.appid}</Text>
          <View style={styles.byline}>
            {preset ? (
              <View style={[styles.avatar, { backgroundColor: preset.bg }]}>
                <Ionicons name={preset.icon} size={10} color={preset.iconColor} />
              </View>
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.author} numberOfLines={1}>{name}</Text>
            {/* DOĞRULANMIŞ SAAT — bu sayfanın var oluş sebebi. Sayı
                kullanıcıdan değil Steam'den geliyor; başka hiçbir platform
                bunu gösteremiyor. */}
            <Ionicons name="shield-checkmark" size={11} color={colors.green} />
            <Text style={[styles.hours, NUMERIC]}>
              {Math.round(review.hours)}{lang === 'tr' ? ' saat' : ' h'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={review.recommended ? 'thumbs-up' : 'thumbs-down'}
          size={17}
          color={review.recommended ? colors.green : colors.text3}
        />
      </View>

      <Text style={styles.body} numberOfLines={6}>{review.text}</Text>

      {onEdit && (
        <Pressable style={({ pressed }) => [styles.editBtn, pressed && PRESSED]} onPress={onEdit}>
          <Ionicons name="create-outline" size={14} color={colors.text2} />
          <Text style={styles.editText}>{t('rev.edit')}</Text>
        </Pressable>
      )}
    </Pressable>
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
  betaChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentBorder,
  },
  betaText: { color: colors.accentText, fontSize: type.caption2, fontWeight: '800', letterSpacing: 0.4 },

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

  card: {
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder,
    padding: spacing.md, gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardImg:  { width: 56, height: 26, borderRadius: 4, backgroundColor: colors.bgInput },
  cardGame: { color: colors.text, fontSize: type.footnote, fontWeight: '700' },
  byline:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  avatar: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.text2, fontSize: 9, fontWeight: '800' },
  author: { color: colors.text3, fontSize: type.caption2, maxWidth: 110 },
  hours:  { color: colors.green, fontSize: type.caption2, fontWeight: '700' },
  body:   { color: colors.text2, fontSize: type.footnote, lineHeight: 19 },

  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 },
  editText:{ color: colors.text2, fontSize: type.caption, fontWeight: '700' },
});
