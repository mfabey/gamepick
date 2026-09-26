// ─────────────────────────────────────────────────────────────────────────────
// GIF seçici (sohbet) — 2.0 / G-DS-4 (27 Eyl).
//
// Ortak AltSayfa (klavyeli, sabit %68 yükseklik: ızgara boşken de sayfa
// zıplamasın). Üstte 2.0 arama alanı, altında iki sütunlu ızgara, en altta
// sağlayıcı ibaresi. Arama davranışı aynen: açılışta öne çıkanlar, yazınca
// 350 ms bekleme, sağlayıcı kapalıysa açıklama.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { searchGifs } from '../services/klipy';
import { AltSayfa } from './ui/AltSayfa';
import { PressableScale, Txt } from './ui/Primitives';
import { SearchField } from './ui/SearchField';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { motion } from '../theme';
import { layout, radius, space } from '../theme/tokens';

export default function GifPicker({ visible, onClose, onPick }) {
  const { colors } = useDesignTheme();
  const { t, lang } = useLanguage();
  const [q, setQ] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const timer = useRef(null);

  const run = useCallback(async (term) => {
    setLoading(true);
    try {
      const r = await searchGifs(term, lang);
      setGifs(r?.gifs || []);
      setDisabled(false);
    } catch (e) {
      if (e?.code === 'GIFS_DISABLED') setDisabled(true);
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    run('');            // açılışta öne çıkanlar — ızgara boş açılmasın
  }, [visible, run]);

  const onChange = useCallback((v) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(v.trim()), 350);
  }, [run]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <AltSayfa visible={visible} onClose={onClose} klavye sabitOran={0.68} oran={0.68} accessibilityLabel={t('gif.search')}>
      <View style={styles.arama}>
        <SearchField value={q} onChangeText={onChange} placeholder={t('gif.search')} accessibilityLabel={t('gif.search')}
          autoCorrect={false} returnKeyType="search" onClear={() => onChange('')} />
      </View>
      {disabled ? (
        <Txt variant="footnote" style={[styles.ipucu, { color: colors.text2 }]}>{t('gif.disabled')}</Txt>
      ) : loading && gifs.length === 0 ? (
        <View style={styles.merkez}><ActivityIndicator color={colors.text2} /></View>
      ) : gifs.length === 0 ? (
        <Txt variant="footnote" style={[styles.ipucu, { color: colors.text2 }]}>{t('gif.empty')}</Txt>
      ) : (
        <FlatList
          data={gifs}
          keyExtractor={(g) => g.id}
          numColumns={2}
          style={styles.esnek}
          columnWrapperStyle={{ gap: space[8] }}
          contentContainerStyle={styles.izgara}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <PressableScale style={styles.hucre} onPress={() => onPick(item)} accessibilityRole="button" accessibilityLabel="GIF">
              <Image source={item.preview} style={[styles.gif, { backgroundColor: colors.surface2 }]} contentFit="cover" transition={motion.image} />
            </PressableScale>
          )}
        />
      )}
      {/* Sağlayıcının kullanım şartlarının gereği — kaldırılamaz. */}
      <Txt variant="caption2" style={[styles.ibare, { color: colors.text3 }]}>Powered by KLIPY</Txt>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  arama: { paddingHorizontal: layout.gutter, paddingBottom: space[12] },
  esnek: { flex: 1 },
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ipucu: { textAlign: 'center', paddingHorizontal: layout.gutter, paddingVertical: space[24] },
  izgara: { gap: space[8], paddingHorizontal: layout.gutter, paddingBottom: space[12] },
  hucre: { flex: 1 },
  gif: { width: '100%', height: 110, borderRadius: radius.sm },
  ibare: { textAlign: 'center', paddingTop: space[4] },
});
