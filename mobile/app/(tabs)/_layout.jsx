import { View } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { TabBarProvider } from '../../src/context/TabBarContext';
import FloatingTabBar from '../../src/components/FloatingTabBar';
import IpucuSeridi from '../../src/components/IpucuSeridi';

export default function TabLayout() {
  const { t } = useLanguage();

  // ── İLK AÇILIŞ KAPISI — BURADA, KÖK DÜZENDE DEĞİL ────────────────────────
  //
  // Önceden kök düzen (_layout.jsx) `loadOnboarding().then(...)` içinde
  // emirle `router.replace('/onboarding')` çağırıyordu. Sorun: o okuma
  // asenkron, ilk rota ise `(tabs)/index`. Yani KEŞİF EKRANINA GİDECEK
  // kullanıcıda anasayfa önce mount oluyor, efektlerini çalıştırıyor ve
  // ancak ondan sonra ekrandan atılıyordu.
  //
  // SAYILDI (kod okumasıyla, ağ izi alınarak değil) — taze kurulumda o bir
  // mount'un attığı istek ALTI:
  //   home:trending · home:new · home:sale        (useQuery ×3)
  //   useForYouFeed'in ilk sayfası                (FALLBACK_SLUGS ile)
  //   getReviewFeed · fetchPosts                  (ikisi de hesapsız okunuyor)
  // Hepsi, kullanıcının göremeyeceği bir ekran için.
  //
  // İki çağrı listede YOK, çünkü taze kurulumda kendi koşulları tutmuyor:
  // `foryou-cand:*` (enabled: !isCold — profil boşken kapalı) ve
  // getFriendActivity (oturum yoksa erken dönüyor). Oturumu olup
  // onboarding'i sıfırlanmış kullanıcıda üst sınır sekiz.
  //
  // Kapı düzene taşınınca hiçbiri mount olmuyor — altı istek de atılmıyor.
  // Ekran ekran `enabled` bayrağı dağıtmaya göre de üstün: anasayfaya yarın
  // eklenecek dokuzuncu çağrı bu kapıyı kendiliğinden buluyor.
  const onboarded = useOnboarding();

  // Depo okunana kadar HİÇBİR ŞEY çizilmiyor. Boş kare görünmüyor: açılış
  // perdesi hâlâ yukarıda ve kök düzen onu ancak durum çözülünce indiriyor
  // (bkz. _layout.jsx). expo-splash-screen'in kendi resmi örneği de bu
  // aşamada `return null` diyor.
  if (onboarded === null) return null;

  // Emirle yönlendirme yerine BİLDİRİMSEL: <Redirect> navigasyonun hazır
  // olmasını kendisi bekliyor, "navigate before mounting the Root Layout"
  // yarışı ortadan kalkıyor.
  if (!onboarded) return <Redirect href="/onboarding" />;

  return (
    // Sağlayıcı Tabs'ı SARMALIYOR: hem ekranlar (yazan taraf) hem de
    // tabBar (okuyan taraf) aynı paylaşılan değere erişebilsin.
    <TabBarProvider>
     {/* İPUCU ŞERİDİ BURADA, EKRANLARDA DEĞİL. Beş sekmenin hepsinde tek bir
         örneği olsun isteniyor: ekran başına mount edilseydi sekme
         değiştirmek şeridi sıfırlar, "açılış başına bir tane" bütçesi de
         beş kez sayılırdı. Sarmalayıcı View, mutlak konumlu şeride ölçü
         veren kap. */}
     <View style={{ flex: 1 }}>
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
        {/* Başlıklar tab.* anahtarlarından: sekme etiketi 70pt'lik hücreye
            sığmak zorunda, ekran başlığı değil. İkisi ayrı tutulmasaydı
            Almanca'da ya çubuk taşardı ya da ekran başlığı "Freunde" gibi
            içeriği yanlış anlatan bir kısaltmaya düşerdi. */}
        <Tabs.Screen name="index"    options={{ title: t('tab.home') }} />
        <Tabs.Screen name="reviews"  options={{ title: t('tab.community') }} />
        <Tabs.Screen name="videos"   options={{ title: t('tab.videos') }} />
        <Tabs.Screen name="messages" options={{ title: t('tab.messages') }} />
        <Tabs.Screen name="profile"  options={{ title: t('tab.profile') }} />
      </Tabs>

      <IpucuSeridi />
     </View>
    </TabBarProvider>
  );
}
