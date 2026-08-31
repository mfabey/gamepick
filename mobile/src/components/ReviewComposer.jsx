import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { writeReview, removeReview } from '../api/social';
import { radius, spacing, type, PRESSED, NUMERIC } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// İnceleme yazma penceresi.
//
// KAPI SUNUCUDA. İstemci "yazabilir mi" diye tahmin etmiyor; deniyor ve
// sunucunun döndürdüğü kodu (NOT_IN_LIBRARY / NOT_ENOUGH_HOURS) kullanıcı
// diline çeviriyor. Tek doğruluk kaynağı sunucu — istemcide ikinci bir kural
// kümesi tutmak, iki kuralın zamanla ayrışması demek.
//
// ÖNERİ SEÇİMİ İKİLİ, yıldız değil. Yıldızda her şey 4 çıkıyor ve bilgi
// taşımıyor; oyuncular Steam'den bu dili zaten biliyor.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TEXT = 2000;
// Sayaç eşiği gönderi bestecisiyle AYNI (40): iki yerde farklı olsaydı
// kullanıcı hangi noktada uyarılacağını öğrenemezdi.
const ESIK = 40;

export default function ReviewComposer({ visible, onClose, appid, gameName, existing, onSaved }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [rec, setRec] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(existing?.text || '');
    setRec(existing ? !!existing.recommended : true);
  }, [visible, existing]);

  // FAZ 6 — GÖRÜNMEYEN SINIR BİR TUZAK. MAX_TEXT 2000 ve bir TEXT_TOO_LONG
  // hata yolu vardı ama kullanıcı sınırı hiç görmüyordu: yazı bir yerde
  // SESSİZCE duruyor ve kullanıcı klavyeyi ya da uygulamayı suçluyor.
  // Gönderi bestecisinin deseni aynen taşındı (kalan sayı, eşik 40).
  const [hata, setHata] = useState(null);
  const kalan = MAX_TEXT - text.length;

  const save = useCallback(async () => {
    if (!text.trim() || busy) return;
    setHata(null);
    setBusy(true);
    try {
      await writeReview(appid, text.trim(), rec);
      onSaved?.();
    } catch (e) {
      // FAZ 6 — HATA SATIR İÇİNE İNDİ. Aynı sınıf hatayı gönderi bestecisi
      // zaten sayfanın İÇİNDE gösteriyor: metin ekranda kalıyor ve
      // düzeltilebiliyor. Burada `Alert` vardı — düzeltilebilir bir sorun
      // için akışı kesen modal, kullanıcıyı metninden koparıyor.
      // `Alert` yalnızca SİLME onayında kalıyor: geri alınamaz tek eylem.
      const c = e?.code;
      setHata(
        c === 'NOT_IN_LIBRARY'       ? t('rev.notInLibrary')
          : c === 'NOT_ENOUGH_HOURS'   ? t('rev.notEnoughHours')
          : c === 'TEXT_INAPPROPRIATE' ? t('msg.inappropriate')
          : c === 'TEXT_TOO_LONG'      ? t('msg.tooLong')
          : t('rev.saveFailed')
      );
    } finally {
      setBusy(false);
    }
  }, [text, rec, busy, appid, onSaved, t]);

  const del = useCallback(() => {
    Alert.alert(t('rev.deleteTitle'), t('rev.deleteText'), [
      { text: t('msg.cancel'), style: 'cancel' },
      {
        text: t('rev.delete'),
        style: 'destructive',
        onPress: async () => {
          try { await removeReview(appid); onSaved?.(); }
          catch { Alert.alert(t('rev.saveFailed')); }
        },
      },
    ]);
  }, [appid, onSaved, t]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <Text style={styles.title} numberOfLines={1}>{gameName || ''}</Text>

          <View style={styles.recRow}>
            <Pressable
              style={({ pressed }) => [styles.recBtn, rec && styles.recOn, pressed && PRESSED]}
              onPress={() => setRec(true)}
            >
              <Ionicons name="thumbs-up" size={16} color={rec ? colors.green : colors.text3} />
              <Text style={[styles.recText, rec && { color: colors.text }]}>{t('rev.yes')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.recBtn, !rec && styles.recOff, pressed && PRESSED]}
              onPress={() => setRec(false)}
            >
              <Ionicons name="thumbs-down" size={16} color={!rec ? colors.danger : colors.text3} />
              <Text style={[styles.recText, !rec && { color: colors.text }]}>{t('rev.no')}</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('rev.placeholder')}
              placeholderTextColor={colors.text3}
              maxLength={MAX_TEXT}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Hata SOLDA, sayaç SAĞDA — gönderi bestecisiyle aynı düzen. */}
          <View style={styles.altSatir}>
            {hata ? <Text style={styles.hata}>{hata}</Text> : <View style={{ flex: 1 }} />}
            <Text style={[styles.sayac, kalan <= ESIK && styles.sayacYakin, NUMERIC]}>
              {kalan <= ESIK ? kalan : text.length}
            </Text>
          </View>

          <View style={styles.actions}>
            {existing
              ? (
                <Pressable style={({ pressed }) => [styles.delBtn, pressed && PRESSED]} onPress={del}>
                  <Text style={styles.delText}>{t('rev.delete')}</Text>
                </Pressable>
              )
              : <View style={{ flex: 1 }} />}

            <Pressable
              style={({ pressed }) => [styles.saveBtn, (!text.trim() || busy) && styles.saveOff, pressed && PRESSED]}
              onPress={save}
              disabled={!text.trim() || busy}
            >
              {busy
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={[styles.saveText, (!text.trim() || busy) && styles.saveTextOff]}>{t('rev.save')}</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: colors.overlay },
  sheetWrap: { justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '82%', backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl,
  },
  grab: {
    width: 38, height: 4, borderRadius: 2, alignSelf: 'center',
    backgroundColor: colors.cardBorder, marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: type.subhead, fontWeight: '800', marginBottom: spacing.md },

  recRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  recBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, minHeight: 44, borderRadius: radius.md,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: 'transparent',
  },
  // Seçim yalnızca 1px kenarlıkla anlatılıyordu. Renk burada DEĞERE bağlı
  // (öneri/önermeme), o yüzden kalıyor — sadece güçleniyor: %12 yumuşak
  // dolgu ekleniyor, kenarlık tek sinyal olmaktan çıkıyor.
  // tema-bagimsiz: deger renginin yumusak dolgusu, iki temada da ayni okunur
  // tema-bagimsiz: deger renginin yumusak dolgusu, iki temada da ayni okunur
  recOn:   { borderColor: colors.green,  backgroundColor: 'rgba(0,210,110,0.12)' },
  // tema-bagimsiz: deger renginin yumusak dolgusu, iki temada da ayni okunur
  recOff:  { borderColor: colors.danger, backgroundColor: 'rgba(239,73,73,0.12)' },
  recText: { color: colors.text3, fontSize: type.footnote, fontWeight: '700' },

  input: {
    minHeight: 140, color: colors.text, fontSize: type.subhead, lineHeight: 21,
    backgroundColor: colors.bgInput, borderRadius: radius.md, padding: spacing.md,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  delBtn:  { flex: 1, minHeight: 44, justifyContent: 'center' },
  delText: { color: colors.danger, fontSize: type.footnote, fontWeight: '700' },
  // FAZ 6 — TEK GÖNDER DİLİ: 44pt · radius.md · subhead 15/600 ·
  // accentFillStrong. Üç bestecide aynı. `accent` dolgu + beyaz 13/800
  // tam 4.45:1 veriyordu (bu deponun ÜÇÜNCÜ kez gördüğü aynı ölçüm);
  // yeni ton 5.45:1.
  saveBtn: {
    paddingHorizontal: spacing.s24, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accentFillStrong, alignItems: 'center', justifyContent: 'center',
  },
  // DEVRE DIŞI = YÜZEY DEĞİŞİMİ, OPAKLIK DEĞİL. Ölçüldü: opacity 0.4'te
  // beyaz etiket koyu zeminde 1.9:1'e iniyor — okunmuyor. Ayrıca PRESSED
  // de opaklıkla çalışıyor, yani devre dışı ile basılı hâl aynı dili
  // konuşuyordu. Nötr yüzey ikisini de çözüyor.
  saveOff:  { backgroundColor: colors.bgInput },
  // tema-bagimsiz: dolu marka dugmesinin uzerinde
  saveText: { color: '#fff', fontSize: type.subhead, fontWeight: '600' },
  saveTextOff: { color: colors.text3 },

  altSatir: { flexDirection: 'row', alignItems: 'center', gap: spacing.s12, marginTop: spacing.s8 },
  hata: { flex: 1, color: colors.accentText, fontSize: type.caption },
  sayac: { color: colors.text3, fontSize: type.caption, fontWeight: '600' },
  sayacYakin: { color: colors.accentText },
});
