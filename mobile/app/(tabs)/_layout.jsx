import { Tabs } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import FloatingTabBar from '../../src/components/FloatingTabBar';

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index"   options={{ title: t('nav.home') }} />
      <Tabs.Screen name="games"   options={{ title: t('nav.games') }} />
      <Tabs.Screen name="news"    options={{ title: t('nav.news') }} />
      <Tabs.Screen name="library" options={{ title: t('nav.library') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}
