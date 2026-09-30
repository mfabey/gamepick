// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyon seçim sayfası — bir oyunu listelere ekle/çıkar.
// Detay ekranından açılır; tek sorumluluğu seçim, veri yazımı store'da.
//
// 2.0: DS 4 Bottom Sheet (FilterSheet'le aynı yüzey — bg2, köşe 24, üst
// gölge, 36×5 tutamaç). Koleksiyonlar tek bir gruplu kutuda (kit paylaş
// sayfasının satır kutusu), sonda "Yeni koleksiyon" satırı. Seçim dairesi
// seçiliyken kırmızı dolu + tik — TextField odağıyla aynı vurgu.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  View, Pressable, StyleSheet, Modal, ScrollView, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Icon } from './Icon';
import { Button, ListGroup, ListRow, PressableScale, TextField, Txt } from './ui/Primitives';
import { SHEET_LAYOUT } from '../theme';
import { component as K, control as C, layout, radius as dsRadius, shadow, space } from '../theme/tokens';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useStyles } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useAltSayfaSiniri } from '../hooks/useAltSayfaSiniri';

const F = K.filterSheet;
const P = K.collectionPicker;

export default function CollectionPicker({
  visible, onClose, collections, selectedIds, game, onToggle, onCreate,
}) {
  const styles = useStyles(makeStyles);
  const { colors } = useDesignTheme();
  const { t, tSay } = useLanguage();
  const insets = useSafeAreaInsets();
  const sinir = useAltSayfaSiniri(0.82);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submitNew = useCallback(async () => {
    const clean = name.trim();
    if (!clean) return;
    const id = await onCreate(clean);
    if (!id) { Alert.alert(t('col.limitReached')); return; }
    // Yeni koleksiyon oluşturulunca oyunu doğrudan içine koy — beklenen davranış
    await onToggle(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setName('');
    setAdding(false);
  }, [name, onCreate, onToggle, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior="padding" style={[styles.kav, sinir.kav]}>
          {/* İç yüzeyde onPress var ama HİÇBİR ŞEY YAPMIYOR: sayfanın boş bir
              yerine dokunmak arkadaki Pressable'a ulaşıp sayfayı kapatırdı. */}
          <Pressable style={[styles.sheet, sinir.sayfa, { backgroundColor: colors.bg2, paddingBottom: insets.bottom + space[12] }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.grabber, { backgroundColor: colors.text3 }]} />
            <View style={styles.head}>
              <Txt variant="headline" accessibilityRole="header">{t('col.addTo')}</Txt>
              <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{game?.name}</Txt>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
              {collections.length === 0 && !adding ? (
                <Txt variant="footnote" style={[styles.emptyText, { color: colors.text2 }]}>{t('col.emptyText')}</Txt>
              ) : null}

              {/* Koleksiyon yokken form açıldıysa grup hiç çizilmiyor: satırsız
                  bir kutu boşluk bırakırdı. */}
              {collections.length > 0 || !adding ? (
              <ListGroup>
                {collections.map((c) => {
                  const on = selectedIds.has(c.id);
                  return (
                    <PressableScale
                      key={c.id}
                      style={styles.row}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={c.name}
                      onPress={async () => {
                        Haptics.selectionAsync();
                        await onToggle(c.id);
                      }}
                    >
                      <Txt variant="headline">{c.emoji}</Txt>
                      <View style={styles.rowBody}>
                        <Txt variant="input" numberOfLines={1}>{c.name}</Txt>
                        <Txt variant="footnote" style={{ color: colors.text2 }}>{tSay((c.games || []).length, 'col.gameCountOne', 'col.gameCount')}</Txt>
                      </View>
                      <View style={[styles.check, on
                        ? { backgroundColor: colors.red, borderColor: colors.red }
                        : { borderColor: colors.text3 }]}>
                        {on ? <Icon name="check" size={P.checkGlyph} color={colors.white} strokeWidth={C.iconStroke} /> : null}
                      </View>
                    </PressableScale>
                  );
                })}
                {!adding ? (
                  <ListRow icon="plus" title={t('col.new')} onPress={() => setAdding(true)} trailing={false} />
                ) : null}
              </ListGroup>
              ) : null}

              {adding ? (
                <View style={styles.newForm}>
                  <TextField
                    label={t('col.namePlaceholder')}
                    value={name}
                    onChangeText={setName}
                    maxLength={60}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={submitNew}
                  />
                  <Button title={t('col.create')} height={44} onPress={submitNew} disabled={!name.trim()} />
                </View>
              ) : null}
            </ScrollView>

            <Button title={t('col.save')} height={F.cta} onPress={onClose} style={styles.done} />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// Karartma eski temadan (`colors.overlay`) — FilterSheet'le aynı kaynak.
const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  kav: { width: '100%' },
  sheet: {
    ...SHEET_LAYOUT,
    borderTopLeftRadius: dsRadius.sheet, borderTopRightRadius: dsRadius.sheet,
    boxShadow: shadow.sheet,
    // maxHeight BURADA DEĞİL: KAV içinde yüzde yanlış çözülüyor (useAltSayfaSiniri).
  },
  grabber: {
    alignSelf: 'center', width: F.grabberWidth, height: F.grabberHeight,
    borderRadius: F.grabberRadius, marginTop: F.grabberTop,
  },
  head: { paddingHorizontal: layout.gutter, paddingTop: space[12], gap: space[2] },

  list: { flexGrow: 0 },
  listContent: { paddingTop: space[16], gap: space[12] },
  emptyText: { paddingHorizontal: layout.gutter },

  // ListRow ölçüsü (52 / 16 / 14); emoji ikon kutusunun yerinde.
  row: {
    minHeight: C.listHeight, paddingHorizontal: C.listPadding, paddingVertical: space[8],
    flexDirection: 'row', alignItems: 'center', gap: C.listGap,
  },
  rowBody: { flex: 1, minWidth: 0 },
  check: {
    width: P.check, height: P.check, borderRadius: P.check / 2, borderWidth: C.fieldFocusWidth,
    alignItems: 'center', justifyContent: 'center',
  },

  newForm: { paddingHorizontal: layout.gutter, gap: space[8] },

  done: { marginHorizontal: layout.gutter, marginTop: space[16] },
});
