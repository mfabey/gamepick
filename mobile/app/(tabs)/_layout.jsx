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
        {/* Dördüncü sıra ÖNCE Haberler'di. Mesajlar'la değişti: alt
            navigasyon uygulamanın kendini nasıl tanıttığı yer ve orada
            "Haberler" yazması, bir haber okuyucusu olduğumuzu söylüyordu.
            Haberler kayboldu değil — anasayfanın sağ üstünden /news
            rotasına gidiliyor. */}
        <Tabs.Screen name="index"    options={{ title: t('nav.home') }} />
        <Tabs.Screen name="games"    options={{ title: t('nav.games') }} />
        <Tabs.Screen name="videos"   options={{ title: t('nav.videos') }} />
        <Tabs.Screen name="messages" options={{ title: t('nav.messages') }} />
        <Tabs.Screen name="profile"  options={{ title: t('nav.profile') }} />
      </Tabs>
    </TabBarProvider>
  );
}
