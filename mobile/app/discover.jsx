import { useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Keyboard } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { smartSearch } from '../src/api/games';
import GameCard from '../src/components/ui/GameCard';
import { Button, Chip, TextField, Txt } from '../src/components/ui/Primitives';
import { NavBar } from '../src/components/ui/Navigation';
import { Badge } from '../src/components/ui/Social';
import { useDesignGrid } from '../src/hooks/useDesignGrid';
import { useDesignTheme } from '../src/theme/useDesignTheme';
import { useLanguage } from '../src/context/LanguageContext';
import { useOwnedGames } from '../src/hooks/useOwnedGames';
import { useDismissed } from '../src/hooks/useDismissed';
import { normalizeName } from '../src/services/recommend';
import { layout, space } from '../src/theme/tokens';

// Kullanıcıya ne yazabileceğini gösteren hazır istemler — boş ekranı doldurur.
// BEŞ DİL: önceden yalnız tr/en vardı; de/es/pt kullanıcı Türkçe örnek görüyordu.
const EXAMPLES = {
  tr: ['Sakin, kafa dağıtacak bir oyun', 'Arkadaşımla oynayabileceğim', 'Dying Light gibi', 'Sürükleyici hikayesi olan', 'Çok zor, meydan okuyan'],
  en: ['Something relaxing to unwind', 'A game to play with a friend', 'Something like Dying Light', 'With a gripping story', 'Really hard and challenging'],
  de: ['Etwas Entspannendes zum Abschalten', 'Ein Spiel für mich und einen Freund', 'So etwas wie Dying Light', 'Mit einer packenden Geschichte', 'Richtig schwer und fordernd'],
  es: ['Algo relajante para desconectar', 'Un juego para jugar con un amigo', 'Algo como Dying Light', 'Con una historia absorbente', 'Muy difícil y desafiante'],
  pt: ['Algo relaxante para desestressar', 'Um jogo para jogar com um amigo', 'Algo como Dying Light', 'Com uma história envolvente', 'Muito difícil e desafiador'],
};

// Sunucu etiketlerinden mod ya da tür çevirisi zaten olanlar.
const ESDES = {
  singleplayer: 'mode.singleplayer', multiplayer: 'mode.multiplayer', 'co-op': 'mode.coop',
  horror: 'genre.horror', racing: 'genre.racing', simulation: 'genre.simulation',
};

// 2.0 (27 Eyl): NavBar, 2.0 TextField, nötr birincil "Bul", örnekler Chip,
// "anladığım" etiketleri Badge. Davranış (akıllı arama, sahip olunan ve
// elenen oyunların süzülmesi) aynen. Alt dolgu TAB_SPACE değil: bu ekranda
// sekme çubuğu yok (design-migration §4.1).
export default function DiscoverScreen() {
  // Telefonda ölçülen hücre genişliği: 185 pt. Geniş ekranda sütun artar.
  const { columns: sutun, padding: gridPadding } = useDesignGrid();
  const { colors } = useDesignTheme();
  const insets = useSafeAreaInsets();
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
  // Sunucu etiketleri RAWG slug'ı olarak veriyor ("great-soundtrack"): ekranda
  // arayüz dilinde. Mod ve tür karşılığı olanlar o çeviriyi kullanıyor.
  const etiketAdi = (slug) => {
    const anahtar = ESDES[slug] || `tag.${slug}`;
    const ceviri = t(anahtar);
    return ceviri === anahtar ? slug.replace(/-/g, ' ') : ceviri;
  };
  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(({ item }) => (
    <View style={styles.cell}><GameCard game={item} /></View>
  ), []);

  const header = (
    <View style={styles.headerWrap}>
      {/* Açıklama alanın etiketi: ayrı bir paragraf + etiketsiz alan iki kez
          aynı şeyi söylüyordu. Örnek cümle yer tutucuda kalıyor. */}
      <TextField
        label={t('discover.subtitle')}
        placeholder={t('discover.placeholder')}
        value={query}
        onChangeText={setQuery}
        multiline
        maxLength={500}
        returnKeyType="search"
        onSubmitEditing={() => run()}
      />

      <Button title={t('discover.button')} height={52} icon="spark" onPress={() => run()}
        disabled={!query.trim()} loading={loading} style={styles.cta} />

      {/* Örnek istemler — yalnızca henüz arama yapılmadıysa */}
      {!data && !loading && (
        // Kaydırılan şerit ekran kenarına kadar uzanıyor; kesik çip "daha var" der.
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -(gridPadding + BASLIK_PAY) }}
          contentContainerStyle={[styles.examples, { paddingHorizontal: gridPadding + BASLIK_PAY }]}>
          {(EXAMPLES[lang] || EXAMPLES.en).map((ex) => (
            <Chip key={ex} title={ex} onPress={() => useExample(ex)} />
          ))}
        </ScrollView>
      )}

      {/* Sistemin ne anladığı — şeffaflık, kullanıcı güveni */}
      {tags.length > 0 && (
        <View style={styles.understood}>
          <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{t('discover.understood')}</Txt>
          <View style={styles.tagRow}>
            {tags.map(tg => <Badge key={tg} label={etiketAdi(tg)} />)}
          </View>
        </View>
      )}

      {error && <Txt variant="subhead" style={[styles.msg, { color: colors.text3 }]}>{t('discover.error')}</Txt>}
      {data && !error && results.length === 0 && (
        <Txt variant="subhead" style={[styles.msg, { color: colors.text3 }]}>{t('discover.empty')}</Txt>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <NavBar title={t('discover.title')} />
      <FlashList
        data={results}
        numColumns={sutun}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: gridPadding }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={<View style={{ height: insets.bottom + space[40] }} />}
      />
    </SafeAreaView>
  );
}

const BASLIK_PAY = layout.gutter - space[8];

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerWrap: { paddingHorizontal: BASLIK_PAY, paddingTop: space[8], paddingBottom: space[16], gap: space[12] },
  cell: { flex: 1, alignItems: 'center', paddingBottom: space[16] },
  cta: { marginTop: space[4] },
  examples: { gap: space[8], paddingVertical: space[4] },
  understood: { gap: space[8] },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  msg: { marginTop: space[8] },
});
