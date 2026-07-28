import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Keyboard,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { smartSearch } from '../src/api/games';
import GameCard from '../src/components/GameCard';
import { colors, radius, spacing, TAB_SPACE } from '../src/theme';
import { useLanguage } from '../src/context/LanguageContext';
import { useOwnedGames } from '../src/hooks/useOwnedGames';
import { useDismissed } from '../src/hooks/useDismissed';
import { normalizeName } from '../src/services/recommend';

// Kullanıcıya ne yazabileceğini gösteren hazır istemler — boş ekranı doldurur
const EXAMPLES = {
  tr: [
    'Sakin, kafa dağıtacak bir oyun',
    'Arkadaşımla oynayabileceğim',
    'Dying Light gibi',
    'Sürükleyici hikayesi olan',
    'Çok zor, meydan okuyan',
  ],
  en: [
    'Something relaxing to unwind',
    'A game to play with a friend',
    'Something like Dying Light',
    'With a gripping story',
    'Really hard and challenging',
  ],
};

export default function DiscoverScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();

  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);
  const [data, setData]       = useState(null);   // { filters, results }

  const ownedNames   = useOwnedGames();
  const dismissedIds = useDismissed();

  const run = useCallback(async (text) => {
    const q = (text ?? query).trim();
    if (!q || loading) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(false);
    setData(null);
    try {
      const res = await smartSearch(q, lang);
      setData(res);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query, loading, lang]);

  const useExample = useCallback((text) => {
    setQuery(text);
    run(text);
  }, [run]);

  // Sahip olunan ve "ilgilenmiyorum" denen oyunlar sonuçlardan çıkarılır
  const results = useMemo(() => {
    const list = data?.results || [];
    return list.filter(g =>
      !dismissedIds.has(String(g.id)) && !ownedNames.has(normalizeName(g.name))
    );
  }, [data, dismissedIds, ownedNames]);

  const tags = data?.filters?.tags || [];
  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(({ item }) => (
    <View style={styles.cell}><GameCard game={item} /></View>
  ), []);

  const header = (
    <View style={styles.headerWrap}>
      <Text style={styles.lead}>{t('discover.subtitle')}</Text>

      <View style={styles.inputBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('discover.placeholder')}
          placeholderTextColor={colors.text3}
          style={styles.input}
          multiline
          maxLength={500}
          returnKeyType="search"
          onSubmitEditing={() => run()}
        />
      </View>

      <Pressable
        onPress={() => run()}
        disabled={!query.trim() || loading}
        style={({ pressed }) => [
          styles.cta,
          (!query.trim() || loading) && styles.ctaOff,
          pressed && { opacity: 0.85 },
        ]}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.ctaText}>{t('discover.button')}</Text>}
      </Pressable>

      {/* Örnek istemler — yalnızca henüz arama yapılmadıysa */}
      {!data && !loading && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examples}>
          {(EXAMPLES[lang] || EXAMPLES.tr).map((ex) => (
            <Pressable key={ex} onPress={() => useExample(ex)} style={styles.example}>
              <Text style={styles.exampleText}>{ex}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Sistemin ne anladığı — şeffaflık, kullanıcı güveni */}
      {tags.length > 0 && (
        <View style={styles.understood}>
          <Text style={styles.understoodLabel}>{t('discover.understood')}</Text>
          <View style={styles.tagRow}>
            {tags.map(tg => (
              <View key={tg} style={styles.tag}><Text style={styles.tagText}>{tg}</Text></View>
            ))}
          </View>
        </View>
      )}

      {error && <Text style={styles.msg}>{t('discover.error')}</Text>}
      {data && !error && results.length === 0 && (
        <Text style={styles.msg}>{t('discover.empty')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Pressable style={styles.back} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>{t('discover.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlashList
        data={results}
        numColumns={2}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={<View style={{ height: TAB_SPACE }} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },

  listContent: { paddingHorizontal: 10 },
  headerWrap: { marginHorizontal: -10, paddingHorizontal: spacing.lg, paddingTop: 8 },
  cell: { flex: 1, paddingHorizontal: 6, paddingBottom: spacing.md },

  lead: { fontSize: 14.5, color: colors.text2, lineHeight: 21, marginBottom: 16 },
  inputBox: {
    backgroundColor: colors.card, borderColor: colors.borderHover, borderWidth: 1.5,
    borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, minHeight: 96,
  },
  input: { color: colors.text, fontSize: 15.5, lineHeight: 22, textAlignVertical: 'top', minHeight: 72 },

  cta: {
    marginTop: 12, height: 52, borderRadius: radius.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: 15.5, fontWeight: '800' },

  examples: { gap: 8, paddingVertical: 16 },
  example: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9,
  },
  exampleText: { color: colors.text2, fontSize: 13 },

  understood: { marginTop: 18 },
  understoodLabel: { fontSize: 11.5, color: colors.text3, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5,
  },
  tagText: { color: '#ff8085', fontSize: 12, fontWeight: '700' },

  msg: { color: colors.text3, fontSize: 14, lineHeight: 21, marginTop: 20, marginBottom: 8 },
});
