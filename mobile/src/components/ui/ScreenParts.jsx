import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { Txt, Button } from './Primitives';

// Başlıklar Navigation.tsx'te (PageHeader büyük başlık, NavBar geri + ortalı
// başlık). Eski içe aktarımlar kırılmasın diye buradan da dışa veriliyor.
export { PageHeader, NavBar } from './Navigation';

export function QueryState({ loading, error, empty, retry }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  if (!loading && !error && !empty) return null;
  return <View style={s.state} accessibilityLiveRegion="polite">
    {loading ? <ActivityIndicator color={colors.red} /> : <>
      <Txt style={{ textAlign: 'center', color: colors.text2 }}>{t(error ? 'v2.loadError' : 'v2.empty')}</Txt>
      {retry && <Button title={t('v2.retry')} variant="secondary" onPress={retry} />}
    </>}
  </View>;
}
const s = StyleSheet.create({
  state: { padding: 32, gap: 16, alignItems: 'center' },
});
