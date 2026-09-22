import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { Txt, IconButton, Button } from './Primitives';

export function PageHeader({ title, children, back = false }) {
  const router = useRouter();
  const { t } = useLanguage();
  return <View style={s.header}>
    {back && <IconButton icon="back" label={t('common.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />}
    <Txt variant={back ? 'headline' : 'largeTitle'} accessibilityRole="header" style={{ flex: 1 }}>{title}</Txt>
    {children}
  </View>;
}
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
  header: { minHeight: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  state: { padding: 32, gap: 16, alignItems: 'center' },
});
