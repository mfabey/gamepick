import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert, Pressable } from 'react-native';
import { writeReview, removeReview } from '../api/social';
import { AltSayfa } from './ui/AltSayfa';
import { Button, TextField, Txt } from './ui/Primitives';
import { Icon } from './Icon';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { PRESSED } from '../theme';
import { layout, radius, space } from '../theme/tokens';

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

// 2.0 (27 Eyl): ortak AltSayfa (klavyeli). Öneri seçimi StatusPill'in
// renkleriyle (öneriyorum: altın yıldız, önermiyorum: nötr ×); metin 2.0
// TextField (sayaç + satır içi hata); alt çubukta "Sil" (yıkıcı, üçüncül) ve
// nötr birincil "Kaydet". Sunucu kapısı ve hata dili aynen.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_TEXT = 2000;
// Sayaç eşiği gönderi bestecisiyle AYNI (40): iki yerde farklı olsaydı
// kullanıcı hangi noktada uyarılacağını öğrenemezdi.
const ESIK = 40;

export default function ReviewComposer({ visible, onClose, appid, gameName, existing, onSaved }) {
  const { colors } = useDesignTheme();
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

  const secenek = (deger) => {
    const secili = rec === deger;
    const ton = deger
      ? { bg: colors.goldTint, fg: colors.gold, ikon: 'star' }
      : { bg: colors.pillNeutral, fg: colors.text, ikon: 'x' };
    return (
      <Pressable
        onPress={() => setRec(deger)}
        accessibilityRole="radio"
        accessibilityState={{ selected: secili }}
        style={({ pressed }) => [styles.secenek, { backgroundColor: secili ? ton.bg : colors.surface1 }, pressed && PRESSED]}
      >
        <Icon name={ton.ikon} size={16} color={secili ? ton.fg : colors.text3}
          fill={deger && secili ? ton.fg : undefined} strokeWidth={2.2} />
        <Txt variant="subhead" style={{ color: secili ? ton.fg : colors.text2, fontWeight: '600' }}>
          {deger ? t('rev.yes') : t('rev.no')}
        </Txt>
      </Pressable>
    );
  };

  return (
    <AltSayfa visible={visible} onClose={onClose} title={gameName || ''} klavye oran={0.85}
      footer={
        <View style={styles.eylemler}>
          {existing ? <Button title={t('rev.delete')} variant="destructive" height={48} onPress={del} /> : null}
          <Button title={t('rev.save')} height={48} onPress={save} disabled={!text.trim()} loading={busy} style={styles.kaydet} />
        </View>
      }>
      <View style={styles.govde}>
        <View style={styles.secenekler} accessibilityRole="radiogroup">
          {secenek(true)}
          {secenek(false)}
        </View>
        <TextField
          label={t('rev.placeholder')}
          value={text}
          onChangeText={setText}
          maxLength={MAX_TEXT}
          multiline
          counter={kalan <= ESIK}
          error={hata || undefined}
        />
      </View>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  govde: { paddingHorizontal: layout.gutter, gap: space[12], paddingBottom: space[4] },
  secenekler: { flexDirection: 'row', gap: space[8] },
  secenek: {
    flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space[8], borderRadius: radius.button,
  },
  eylemler: { flexDirection: 'row', alignItems: 'center', gap: space[12] },
  kaydet: { flex: 1 },
});
