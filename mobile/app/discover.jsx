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
import { radius, spacing, TAB_SPACE, PRESSED, type } from '../src/theme';
import { useStyles, useTheme } from '../src/context/ThemeContext';
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
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
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
  ), [styles]);

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
        <Pressable style={({ pressed }) => [styles.back, pressed && PRESSED]} onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('a11y.back')}>
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

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: type.headline, fontWeight: '800', color: colors.text, textAlign: 'center' },

  listContent: { paddingHorizontal: 10 },
  headerWrap: { marginHorizontal: -10, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  cell: { flex: 1, paddingHorizontal: 6, paddingBottom: spacing.md },

  lead: { fontSize: type.subhead, color: colors.text2, lineHeight: 21, marginBottom: spacing.lg },
  inputBox: {
    backgroundColor: colors.card, borderColor: colors.borderHover, borderWidth: 1.5,
    borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 96,
  },
  input: { color: colors.text, fontSize: type.subhead, lineHeight: 22, textAlignVertical: 'top', minHeight: 72 },

  cta: {
    marginTop: spacing.md, height: 52, borderRadius: radius.lg, backgroundColor: colors.accentFillStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },

  examples: { gap: spacing.sm, paddingVertical: spacing.lg },
  example: {
    backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9,
  },
  exampleText: { color: colors.text2, fontSize: type.footnote },

  understood: { marginTop: 18 },
  understoodLabel: { fontSize: type.footnote, color: colors.text2, fontWeight: '600', marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 5,
  },
  // Tür etiketi — oyun detayındaki genreText ile aynı rol, aynı karar:
  // sabit bilgi, eylem değil. Vurgu rengi burada da gürültüydü.
  tagText: { color: colors.text2, fontSize: type.caption, fontWeight: '700' },

  msg: { color: colors.text3, fontSize: type.subhead, lineHeight: 21, marginTop: 20, marginBottom: spacing.sm },
});
