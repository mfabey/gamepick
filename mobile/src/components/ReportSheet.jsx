// ─────────────────────────────────────────────────────────────────────────────
// Şikâyet — 2.0 / G-DS-4 (27 Eyl). Guideline 1.2: kullanıcı içeriğinin
// gösterildiği her yüzeyden açılabilmeli.
//
// Ortak AltSayfa (klavyeli, ekranın %85'i): başlık + neyin şikâyet edildiği,
// nedenler tek seçimli 2.0 listesi (radyo), isteğe bağlı not, alt çubukta
// birincil düğme. Eski sürümde düğme kırmızı dolguydu; 2.0'da birincil eylem
// nötr. Gönderim, hata ve onSent davranışı AYNEN.
//
// Not alanı listenin EN ALTINDA: klavye açılınca liste küçülüyor, odaktaki
// alan görünür kalsın diye liste o an sona kaydırılıyor (26 Eyl ölçümü).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { reportContent } from '../api/social';
import { AltSayfa } from './ui/AltSayfa';
import { Button, ListGroup, ListRow, TextField } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { layout, space } from '../theme/tokens';

// Sunucudaki REPORT_REASONS ile birebir aynı sıra ve anahtarlar.
const REASONS = [
  'spam', 'harassment', 'hate', 'sexual', 'violence', 'impersonation', 'illegal', 'other',
];

/**
 * @param {func} onSent  şikayet KABUL EDİLDİKTEN sonra çağrılıyor. Çağıran
 *   içeriği ekrandan kaldırmak için kullanıyor: "bunu uygunsuz buldum" deyip
 *   aynı içeriği okumaya devam etmek, şikayetin bir şey yaptığına dair hiçbir
 *   kanıt vermiyordu. `onClose`tan ayrı, çünkü iptal de kapanış.
 */
export default function ReportSheet({ visible, onClose, onSent, targetType, targetId, targetLabel }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const listeRef = useRef(null);
  const notOdakta = useRef(false);
  const listeYerlesti = useCallback(() => {
    if (notOdakta.current) listeRef.current?.scrollToEnd({ animated: true });
  }, []);

  const close = useCallback(() => {
    setReason(null);
    setNote('');
    setSending(false);
    onClose();
  }, [onClose]);

  const submit = useCallback(async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      await reportContent({ targetType, targetId, reason, note });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('soc.reportSent'));
      close();
      onSent?.();
    } catch (e) {
      Alert.alert(t(`soc.err.${e?.code}`) !== `soc.err.${e?.code}` ? t(`soc.err.${e.code}`) : t('soc.err.generic'));
      setSending(false);
    }
  }, [reason, note, sending, targetType, targetId, close, onSent, t]);

  return (
    <AltSayfa visible={visible} onClose={close} title={t('soc.reportTitle')} subtitle={targetLabel || undefined} klavye oran={0.85}
      footer={<Button title={t('soc.reportSubmit')} height={52} onPress={submit} disabled={!reason} loading={sending} />}>
      <ScrollView ref={listeRef} onLayout={listeYerlesti} style={styles.liste} contentContainerStyle={styles.listeIc} keyboardShouldPersistTaps="handled">
        <ListGroup>
          {REASONS.map((r) => {
            const on = reason === r;
            return (
              <ListRow key={r} title={t(`soc.reason.${r}`)} selected={on}
                onPress={() => { Haptics.selectionAsync(); setReason(r); }}
                trailing={<View style={[styles.radyo, { borderColor: on ? colors.red : colors.lineStrong, backgroundColor: on ? colors.red : 'transparent' }]}>
                  {on ? <View style={[styles.radyoIc, { backgroundColor: colors.white }]} /> : null}
                </View>} />
            );
          })}
        </ListGroup>
        <View style={styles.not}>
          <TextField label={t('soc.reportNote')} value={note} onChangeText={setNote} maxLength={500} multiline
            onFocus={() => { notOdakta.current = true; }} onBlur={() => { notOdakta.current = false; }} />
        </View>
      </ScrollView>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  liste: { flexGrow: 0 },
  listeIc: { paddingBottom: space[8] },
  radyo: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radyoIc: { width: 8, height: 8, borderRadius: 4 },
  not: { paddingHorizontal: layout.gutter, paddingTop: space[16] },
});
