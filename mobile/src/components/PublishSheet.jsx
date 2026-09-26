// ─────────────────────────────────────────────────────────────────────────────
// Koleksiyonu topluluk listesi olarak yayınla — 2.0 / G-DS-4 (27 Eyl).
//
// Ortak AltSayfa (klavyeli): bilgi kutusu (herkese açık olacak), 2.0 metin
// alanları, alt çubukta birincil düğme. Eski CTA kırmızı dolguydu; 2.0'da
// birincil eylem NÖTR (kit: marka kırmızısı logo/seçili sekme/kalp içindir).
// Davranış aynen: başlık zorunlu, açıklama isteğe bağlı, sunucu hata kodu
// `pl.err.*` ile çevriliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { publishList } from '../api/social';
import { AltSayfa } from './ui/AltSayfa';
import { Button, TextField, Txt } from './ui/Primitives';
import { Icon } from './Icon';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { layout, radius, space } from '../theme/tokens';

export default function PublishSheet({ visible, onClose, collection, publishedId, onPublished }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible && collection) {
      setTitle(collection.name || '');
      setDesc('');
    }
  }, [visible, collection]);

  const submit = useCallback(async () => {
    const clean = title.trim();
    if (!clean || busy) return;
    setBusy(true);
    try {
      const r = await publishList({
        id: publishedId || null,
        title: clean,
        description: desc.trim(),
        emoji: collection?.emoji || '🎮',
        games: (collection?.games || []).map((g) => ({
          id: g.id, name: g.name, image: g.image, appid: g.appid || null,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('pl.published'));
      onPublished?.(r?.list);
      onClose();
    } catch (e) {
      const key = `pl.err.${e?.code}`;
      Alert.alert(t(key) !== key ? t(key) : t('soc.err.generic'));
    } finally {
      setBusy(false);
    }
  }, [title, desc, busy, collection, publishedId, onPublished, onClose, t]);

  return (
    <AltSayfa visible={visible} onClose={onClose} title={t('pl.publishTitle')} klavye oran={0.85}
      footer={<Button title={publishedId ? t('pl.update') : t('pl.publishBtn')} height={52}
        onPress={submit} disabled={!title.trim()} loading={busy} />}>
      <View style={styles.govde}>
        <View style={[styles.bilgi, { backgroundColor: colors.surface1 }]}>
          <Icon name="globe" size={18} color={colors.text2} />
          <Txt variant="footnote" style={[styles.bilgiMetni, { color: colors.text2 }]}>{t('pl.publishText')}</Txt>
        </View>
        <TextField label={t('pl.listTitle')} value={title} onChangeText={setTitle} maxLength={80} />
        <TextField label={t('pl.listDesc')} value={desc} onChangeText={setDesc} maxLength={300} multiline counter />
      </View>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  govde: { paddingHorizontal: layout.gutter, gap: space[12], paddingBottom: space[4] },
  bilgi: { flexDirection: 'row', alignItems: 'flex-start', gap: space[8], padding: space[12], borderRadius: radius.card },
  bilgiMetni: { flex: 1 },
});
