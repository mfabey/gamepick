// ─────────────────────────────────────────────────────────────────────────────
// Tek seçimli alt sayfa (dil, tema, sıralama…) — 2.0 / G-DS-4 (27 Eyl).
//
// Eski sürüm kendi tutamacını, 900 ağırlıklı başlığını ve Ionicons tikini
// çiziyordu. Artık ortak AltSayfa + ListGroup: satırlar 2.0 liste satırı,
// seçili olanın sağında 2.0 tik, ekran okuyucuda radyo. "Vazgeç" alt çubukta
// ikincil düğme (kit: tek birincil eylem; burada birincil eylem satırın
// kendisi).
// ─────────────────────────────────────────────────────────────────────────────
import { ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AltSayfa } from './ui/AltSayfa';
import { Button, ListGroup, ListRow } from './ui/Primitives';
import { Icon } from './Icon';
import { useDesignTheme } from '../theme/useDesignTheme';
import { useLanguage } from '../context/LanguageContext';
import { space } from '../theme/tokens';

/**
 * @param {boolean}  visible
 * @param {string}   title        Başlık (çevrilmiş metin bekleniyor)
 * @param {Array}    options      [{ key, label, sublabel? }]
 * @param {string}   selectedKey  Seçili olanın key'i
 * @param {Function} onSelect     (key) => void — aynı key'e basılırsa çağrılmaz
 * @param {Function} onClose      () => void
 */
export default function ChoiceSheet({
  visible, title, options = [], selectedKey, onSelect, onClose,
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();

  const sec = (key) => {
    if (key !== selectedKey) {
      Haptics.selectionAsync();
      onSelect(key);
    }
    onClose();
  };

  return (
    <AltSayfa visible={visible} onClose={onClose} title={title}
      footer={<Button title={t('common.cancel')} variant="secondary" onPress={onClose} />}>
      <ScrollView style={styles.liste} contentContainerStyle={styles.listeIc} bounces={false}>
        <ListGroup>
          {options.map((o) => {
            const secili = o.key === selectedKey;
            return (
              <ListRow
                key={o.key}
                title={o.label}
                description={o.sublabel}
                selected={secili}
                onPress={() => sec(o.key)}
                trailing={secili ? <Icon name="check" size={20} color={colors.red} strokeWidth={2.4} /> : false}
              />
            );
          })}
        </ListGroup>
      </ScrollView>
    </AltSayfa>
  );
}

const styles = StyleSheet.create({
  liste: { flexGrow: 0 },
  listeIc: { paddingBottom: space[8] },
});
