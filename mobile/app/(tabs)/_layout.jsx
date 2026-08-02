import { Tabs } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { TabBarProvider } from '../../src/context/TabBarContext';
import FloatingTabBar from '../../src/components/FloatingTabBar';

export default function TabLayout() {
  const { t } = useLanguage();
  return (
    // Sağlayıcı Tabs'ı SARMALIYOR: hem ekranlar (yazan taraf) hem de
    // tabBar (okuyan taraf) aynı paylaşılan değere erişebilsin.
    <TabBarProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen name="index"   options={{ title: t('nav.home') }} />
        <Tabs.Screen name="games"   options={{ title: t('nav.games') }} />
        <Tabs.Screen name="videos"  options={{ title: t('nav.videos') }} />
        <Tabs.Screen name="news"    options={{ title: t('nav.news') }} />
        <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
      </Tabs>
    </TabBarProvider>
  );
}
