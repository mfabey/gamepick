import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fetchGames } from '../src/api/games';
import { useQuery } from '../src/hooks/useQuery';
import { recordSignal } from '../src/services/tasteProfile';
import { completeOnboarding } from '../src/services/onboarding';
import { colors, radius, spacing, PRESSED, type } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import GameCover from '../src/components/GameCover';

const MIN_PICKS = 3;

// Tanınırlığı yüksek, tür olarak çeşitli bir havuz gerekiyor: kullanıcı
// bildiği oyunları görebilmeli, aksi halde seçim yapamaz.
const fetchPool = () => fetchGames({ section: 'popular', num: 40 });

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const { data, loading } = useQuery('onboarding:pool', fetchPool, { ttl: 60 * 60 * 1000 });
  const [picked, setPicked] = useState({});   // id -> game
  const [saving, setSaving] = useState(false);

  const games = useMemo(
    () => (data?.results || []).filter(g => g?.image && g?.genres?.length),
    [data]
  );
  const count = Object.keys(picked).length;
  const enough = count >= MIN_PICKS;

  const toggle = useCallback((game) => {
    Haptics.selectionAsync();
    setPicked(prev => {
      const next = { ...prev };
      if (next[game.id]) delete next[game.id];
      else next[game.id] = game;
      return next;
    });
  }, []);

  const finish = useCallback(async (skip = false) => {
    if (saving) return;
    setSaving(true);
    try {
      if (!skip) {
        // Her seçim ayrı bir sinyal → tür ağırlıkları birikir
        for (const g of Object.values(picked)) {
          await recordSignal({ genres: g.genres, type: 'pick' });
        }
      }
      await completeOnboarding();
    } finally {
      router.replace('/(tabs)');
    }
  }, [picked, saving, router]);

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(({ item }) => (
    <PickCard game={item} selected={!!picked[item.id]} onPress={() => toggle(item)} />
  ), [picked, toggle]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>{t('onb.title')}</Text>
        <Text style={styles.subtitle}>{t('onb.subtitle')}</Text>

        {/* Doğal dil ile keşif — anasayfadan buraya taşındı.
            Oyun seçmek istemeyene ikinci bir yol: ne aradığını yazsın. */}
        <Pressable
          style={({ pressed }) => [styles.discover, pressed && PRESSED]}
          onPress={() => router.push('/discover')}
        >
          <Ionicons name="sparkles" size={17} color={colors.accent} />
          <Text style={styles.discoverText}>{t('discover.entry')}</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.text3} />
        </Pressable>
      </View>

      {loading && games.length === 0 ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <FlashList
          data={games}
          numColumns={3}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Alt aksiyon çubuğu */}
      <View style={styles.bar}>
        <Pressable onPress={() => finish(true)} hitSlop={8} disabled={saving}>
          <Text style={styles.skip}>{t('onb.skip')}</Text>
        </Pressable>

        <Pressable
          onPress={() => finish(false)}
          disabled={!enough || saving}
          style={({ pressed }) => [
            styles.cta,
            (!enough || saving) && styles.ctaOff,
            pressed && { opacity: 0.85 },
          ]}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : (
              <Text style={styles.ctaText}>
                {enough ? `${t('onb.continue')} · ${count}` : t('onb.need')}
              </Text>
            )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PickCard({ game, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.cell, pressed && PRESSED]}>
      <GameCover uri={game.image} name={game.name} style={[styles.cover, selected && styles.coverOn]}>
        <Text numberOfLines={2} style={styles.name}>{game.name}</Text>

        {selected && (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={15} color="#fff" />
          </View>
        )}
      </GameCover>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  head: { paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 14 },
  title: { fontSize: type.title1, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: type.subhead, color: colors.text2, lineHeight: 21, marginTop: spacing.sm },

  // Doğal dil ile keşif girişi — anasayfadaki satırın aynısı
  discover: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14,
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 13,
  },
  discoverText: { flex: 1, color: colors.text, fontSize: type.subhead, fontWeight: '600' },

  list: { paddingHorizontal: spacing.sm },
  cell: { flex: 1, paddingHorizontal: 5, paddingBottom: 10 },
  cover: {
    width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, overflow: 'hidden',
    backgroundColor: colors.card, borderWidth: 2, borderColor: 'transparent',
  },
  coverOn: { borderColor: colors.accent },
  name: { position: 'absolute', left: 8, right: 8, bottom: 7, color: '#fff', fontSize: type.caption, fontWeight: '700', lineHeight: 14 },
  check: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },

  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl,
    borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: colors.bg,
  },
  skip: { color: colors.text3, fontSize: type.subhead, fontWeight: '600' },
  cta: {
    minWidth: 170, height: 50, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },
});
