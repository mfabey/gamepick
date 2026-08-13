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
        {/* Alt navigasyon, uygulamanın kendini tanıttığı yer. Bu yüzden iki
            sıra buradan taşındı:

            Dördüncü sıra ÖNCE Haberler'di, Mesajlar'la değişti — orada
            "Haberler" yazması bir haber okuyucusu olduğumuzu söylüyordu.

            İkinci sıra ÖNCE Oyunlar'dı, Topluluk'la (reviews) değişti.
            Ölçüldü: Topluluk 2 derinlikteydi ve TÜM uygulamada TEK bir
            bağlantısı vardı (profile.jsx). Yani uygulamanın içerik ÜRETME
            yüzeyi — gönderi yazma, tartışma, inceleme — tek bir kapının
            arkasındaydı; katalog ise 7 kapılı bir sekmedeydi.

            NOT — burası `reviews`, `social` DEĞİL. İkisi de "topluluk" gibi
            okunuyor ve bu bir bilgi mimarisi sorunu: `reviews` içerik
            (gönderi + inceleme), `social` ise kişi yönetimi (arkadaşlar,
            istekler). Sekmeye içerik olan girdi.

            İkisi de kaybolmadı: Haberler anasayfanın sağ üstünden, Oyunlar
            anasayfanın arama kutusundan (+5 boş durum bağlantısı) açılıyor.
            Arama, "oyun bul" eyleminin doğal fiili. */}
        <Tabs.Screen name="index"    options={{ title: t('nav.home') }} />
        <Tabs.Screen name="reviews"  options={{ title: t('rev.section') }} />
        <Tabs.Screen name="videos"   options={{ title: t('nav.videos') }} />
        <Tabs.Screen name="messages" options={{ title: t('nav.messages') }} />
        <Tabs.Screen name="profile"  options={{ title: t('nav.profile') }} />
      </Tabs>
    </TabBarProvider>
  );
}
