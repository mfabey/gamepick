import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchTrending } from '../../src/api/games';
import { colors, radius, spacing } from '../../src/theme';
import { useLanguage } from '../../src/context/LanguageContext';

export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchTrending()
      .then(d => { if (alive) setTrending((d.results || d.games || []).slice(0, 12)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero */}
        <LinearGradient
          colors={['#14102a', '#0b0d10']}
          style={styles.hero}
        >
          <Text style={styles.brand}>GAMERISEN</Text>
          <Text style={styles.tagline}>{t('home.tagline')}</Text>
          <Pressable style={styles.cta} onPress={() => router.push('/games')}>
            <Ionicons name="game-controller" size={18} color="#0b0d10" />
            <Text style={styles.ctaText}>{t('home.exploreGames')}</Text>
          </Pressable>
        </LinearGradient>

        {/* Trend */}
        {trending.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>🔥 {t('section.popular')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
              {trending.map(g => (
                <Pressable
                  key={g.id}
                  style={styles.trendCard}
                  onPress={() => router.push({ pathname: '/game/[id]', params: { id: String(g.id), name: g.name, image: g.image || '', slug: g.rawgSlug || '' } })}
                >
                  <Image source={g.image} style={styles.trendImg} contentFit="cover" transition={250} />
                  <LinearGradient colors={['transparent', 'rgba(6,7,9,0.95)']} style={StyleSheet.absoluteFill} />
                  <Text numberOfLines={2} style={styles.trendName}>{g.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { paddingHorizontal: spacing.xl, paddingTop: 40, paddingBottom: 36 },
  brand: { fontSize: 34, fontWeight: '900', color: colors.accent, letterSpacing: 1 },
  tagline: { fontSize: 15, color: colors.text2, marginTop: 10, lineHeight: 22, maxWidth: 320 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 13, marginTop: 22,
  },
  ctaText: { color: '#0b0d10', fontWeight: '800', fontSize: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, paddingHorizontal: spacing.lg, marginBottom: 12 },
  hRow: { paddingHorizontal: spacing.lg, gap: 12 },
  trendCard: { width: 130, height: 174, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  trendImg: { ...StyleSheet.absoluteFillObject },
  trendName: { position: 'absolute', left: 10, right: 10, bottom: 10, color: '#fff', fontSize: 13, fontWeight: '700' },
});
