import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Modal,
  ActivityIndicator, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { searchGifs } from '../api/social';
import { colors, radius, spacing, type, PRESSED } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// GIF seçici — Tenor.
//
// ARAMA KUTUSU ŞART, liste değil: insanlar GIF'i arayarak buluyor ("gülme",
// "tamam", "şok"). Kategorilere bölünmüş bir tarama ekranı, aradığını bilen
// kullanıcıyı yavaşlatıyor.
//
// GECİKTİRME (debounce) 350 ms: her tuş vuruşunda istek atmak hem Tenor
// kotasını hem sunucu hız sınırını gereksiz yere tüketiyordu.
//
// ÖNİZLEMEDE `tinygif` KULLANILIYOR, tam boy değil. Izgarada 24 tane tam boy
// GIF oynatmak hem veriyi hem pili bitirir; gönderilen ise tam boy.
//
// TENOR ATIF İSTİYOR — "Powered by Tenor" etiketi kullanım şartlarının
// gereği, kozmetik bir tercih değil.
// ─────────────────────────────────────────────────────────────────────────────

export default function GifPicker({ visible, onClose, onPick }) {
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
      // Tenor anahtarı tanımlı değilse özellik kapalı; kullanıcıya boş bir
      // ızgara yerine sebebini söylüyoruz.
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

  // Ekran kapanınca bekleyen aramayı iptal et — aksi hâlde kapalı sayfa için
  // istek gidiyor.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.grab} />

        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={colors.text3} />
          <TextInput
            style={styles.input}
            value={q}
            onChangeText={onChange}
            placeholder={t('gif.search')}
            placeholderTextColor={colors.text3}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        {disabled ? (
          <Text style={styles.hint}>{t('gif.disabled')}</Text>
        ) : loading && gifs.length === 0 ? (
          <View style={styles.center}><ActivityIndicator color={colors.text3} /></View>
        ) : gifs.length === 0 ? (
          <Text style={styles.hint}>{t('gif.empty')}</Text>
        ) : (
          <FlatList
            data={gifs}
            keyExtractor={(g) => g.id}
            numColumns={2}
            columnWrapperStyle={{ gap: spacing.sm }}
            contentContainerStyle={styles.grid}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.cell, pressed && PRESSED]}
                onPress={() => onPick(item)}
              >
                <Image
                  source={item.preview}
                  style={styles.gif}
                  contentFit="cover"
                  transition={100}
                />
              </Pressable>
            )}
          />
        )}

        {/* Tenor kullanım şartlarının gereği — kaldırılamaz. */}
        <Text style={styles.attribution}>Powered by Tenor</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    height: '68%', backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: colors.cardBorder, marginBottom: spacing.md,
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgInput, borderRadius: radius.md,
    paddingHorizontal: spacing.md, minHeight: 44, marginBottom: spacing.md,
  },
  input: { flex: 1, color: colors.text, fontSize: type.subhead },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    color: colors.text3, fontSize: type.footnote, textAlign: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.xl,
  },

  grid: { gap: spacing.sm, paddingBottom: spacing.md },
  cell: { flex: 1 },
  gif:  { width: '100%', height: 110, borderRadius: radius.sm, backgroundColor: colors.bgInput },

  attribution: {
    color: colors.text3, fontSize: type.caption2,
    textAlign: 'center', paddingTop: spacing.xs,
  },
});
