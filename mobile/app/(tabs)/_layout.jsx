import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useLanguage } from '../../src/context/LanguageContext';
import { TabBarProvider } from '../../src/context/TabBarContext';
import { loadPerde, perdeGorulduMu, perdeyiGorulduYaz } from '../../src/services/perde';
import FloatingTabBar from '../../src/components/FloatingTabBar';
import IpucuSeridi from '../../src/components/IpucuSeridi';
import AcilisPerdesi from '../../src/components/AcilisPerdesi';

export default function TabLayout() {
  const { t } = useLanguage();

  // ── İLK AÇILIŞ KAPISI KALKTI ─────────────────────────────────────────────
  //
  // Burada bir `<Redirect href="/onboarding">` duruyordu ve işi şuydu:
  // keşif ekranına GİDECEK kullanıcıda anasayfanın hiç mount olmaması
  // (ölçülmüştü: taze kurulumda boşa giden altı ağ isteği).
  //
  // "Hangilerini sevdin?" ekranı silinince o kapının konusu kalmadı —
  // yönlendirilecek bir yer yok, anasayfa artık ilk ve tek ekran, istekleri
  // de İSTENEN istekler. Kapıyla birlikte `useOnboarding` kancası ve
  // `gr_onboarded` deposu da gitti.
  //
  // ── TANITIM PERDESİ BURAYA TAŞINDI ──
  // Perde eskiden onboarding ekranının üstüne seriliyordu ve gerekçesi
  // "o ekranın ölü spinner penceresini kapla, süre EKLEME"ydi. Ekran gidince
  // gerekçe kaybolmadı, adres değişti: anasayfanın kendi ilk yükleme
  // penceresini kaplıyor. Hâlâ ayrı bir rota değil, hâlâ süre eklemiyor.
  //
  // ── BAYRAK İKİ AŞAMALI OKUNUYOR ──
  // Başlatıcı YETMİYOR. Eskiden bu düzen, kapı çözülene kadar `null`
  // döndürüyordu; kapı kalkınca ilk render AÇILIŞLA BİRLİKTE oluyor ve o an
  // depo okuması henüz bitmemiş oluyor. Başlatıcı `null` yakalayınca
  // `null === false` yanlış çıkıyor ve TANITIM HİÇ GÖSTERİLMİYORDU —
  // ölçüldü: ekran görüntüsü dizisinde perde tek karede bile durmuyordu.
  //
  // Efekt, okuma bitince açıyor. Çakma olmuyor çünkü yerel açılış perdesi
  // aynı okumaya bağlı ve iki kare SONRA iniyor (bkz. _layout.jsx): tanıtım
  // perde kalkmadan önce boyanmış oluyor.
  const [perdeAcik, setPerdeAcik] = useState(() => perdeGorulduMu() === false);

  useEffect(() => {
    let alive = true;
    loadPerde().then((gorulduMu) => {
      if (alive && !gorulduMu) setPerdeAcik(true);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const perdeBitti = useCallback(() => {
    setPerdeAcik(false);
    // "Geç"e basan da görmüş sayılıyor: tanıtımı istemediğini söylemiştir.
    perdeyiGorulduYaz();
  }, []);

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

      {/* PERDE EN SONA: sekme çubuğunun ve şeridin de ÜSTÜNDE durmalı.
          İlk açılışta ekranın tamamını o sahipleniyor. */}
      {perdeAcik && <AcilisPerdesi onDone={perdeBitti} />}
     </View>
    </TabBarProvider>
  );
}
