import { useEffect, useCallback, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { ThemeProvider } from '../src/context/ThemeContext';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { loadSession } from '../src/services/session';
import { loadProfile } from '../src/services/tasteProfile';
import { loadSeen } from '../src/services/seenStore';
import { loadDismissed } from '../src/services/dismissStore';
import { loadLiked } from '../src/services/likeStore';
import { loadCollections } from '../src/services/collectionsStore';
import { loadPerde } from '../src/services/perde';
import { initQueryCache } from '../src/services/queryCache';
import { startSharedLinkWatcher } from '../src/services/sharedLink';
import { startDmPushSync } from '../src/services/dmPush';
import { useLastNotificationResponse } from 'expo-notifications';
import FpsMeter from '../src/dev/FpsMeter';
import { useTheme } from '../src/context/ThemeContext';

// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ PERDESİ ELDE TUTULUYOR.
//
// MODÜL KAPSAMINDA, bileşenin içinde DEĞİL — SDK 57 belgesinin şartı: bir
// efektten çağrılırsa perde çoktan inmiş olabiliyor ve çağrı boşa gidiyor.
// `await` de edilmiyor, aynı sebeple.
//
// Neden gerekti: perde ilk kare çizilir çizilmez kendiliğinden kalkıyordu ve
// o ilk kare, keşif ekranına gidecek kullanıcıda bile ANASAYFAYDI. Kullanıcı
// anasayfa iskeletini bir an görüp oyun seçme ekranına çekiliyordu.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Sert kesme yerine sönümlenerek iniyor — perdenin ardındaki ekran zaten
// çizilmiş durumda, geçişin kendisi görünmüyor.
// YALNIZCA iOS: `fade` Android'de desteklenmiyor, orada sessizce yok sayılıyor.
SplashScreen.setOptions({ fade: true, duration: 220 });

// ─────────────────────────────────────────────────────────────────────────────
// TEMALI YIĞIN — RootLayout'tan AYRI bir bileşen olmak ZORUNDA.
//
// RootLayout, ThemeProvider'ı KENDİSİ render ediyor; kendi gövdesinde
// useTheme() çağıramaz (sağlayıcı henüz üstünde değil). Öncesinde bu yüzden
// modül düzeyindeki donmuş `colors` ve `isDarkTheme` kullanılıyordu, yani
// yığının zemini ve durum çubuğu tema değişince ESKİ temada kalıyordu:
// açık temaya geçildiğinde ekranlar arası geçişte koyu bir bant çakıyordu.
//
// Sağlayıcının ALTINA inince ikisi de canlı palete bağlandı.
// ─────────────────────────────────────────────────────────────────────────────
function TemaliYigin() {
  const { colors, isDark } = useTheme();
  return (
    <>
      {/* Açık temada koyu ikon: "light" sabit kalsaydı beyaz zeminde beyaz saat çıkardı. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
                <Stack.Screen name="(tabs)" />
                {/* ÇİFT ANİMASYON DÜZELTMESİ.
                    Anasayfa kartından gelindiğinde kapak zaten BÜYÜYEREK
                    tam ekrana oturuyor (CardExpand). Ekranın kendi
                    alttan-kayması da çalışınca sayfa ikinci kez açılıyordu:
                    önce büyüme, sonra alttan kayma.

                    Animasyon route parametresine bağlandı — büyümeyle
                    gelindiğinde `none`, öteki yollardan (arama, sohbetteki
                    paylaşım, bildirim) eskisi gibi alttan kayma. */}
                <Stack.Screen
                  name="game/[id]"
                  options={({ route }) => ({
                    animation: route?.params?.buyume === '1' ? 'none' : 'slide_from_bottom',
                  })}
                />
                <Stack.Screen name="wishlist" />
                <Stack.Screen name="discover" />
                <Stack.Screen name="swipe" />
                <Stack.Screen name="library" />
                <Stack.Screen name="collections" />
                <Stack.Screen name="collection/[id]" />
                <Stack.Screen name="stats" />
                {/* "social" KALKTI — üç sekmeli o ekran (akış · arkadaşlar ·
                    istekler) dağıtıldı. Burada bırakılsaydı expo-router var
                    olmayan bir rota için uyarı verirdi (aynı kırılma
                    "messages" taşınırken de yaşandı, aşağıdaki nota bakın).
                    Yerine geçenler: */}
                <Stack.Screen name="friends" />
                <Stack.Screen name="friend-requests" />
                <Stack.Screen name="u/[username]" />
                <Stack.Screen name="profile-edit" />
                <Stack.Screen name="username-setup" />
                {/* Oyunlar BURAYA GELDİ: alt navigasyondaki yerini Topluluk
                    (reviews) aldı. Rota yolu DEĞİŞMEDİ — (tabs) yol taşımayan
                    bir grup olduğu için /games hâlâ /games, mevcut yedi
                    bağlantının hiçbiri elden geçmedi. */}
                <Stack.Screen name="games" />
                <Stack.Screen name="steam-friends" />
                <Stack.Screen name="game-cards" />
                {/* "messages" BURADAN KALKTI: alt navigasyona taşındı, artık
                    (tabs) altında. Burada bırakılsaydı expo-router var
                    olmayan bir çocuk rota için uyarı verirdi.
                    Yerini haberler aldı — o da ters yönde taşındı. */}
                <Stack.Screen name="news" />
                <Stack.Screen name="post/[id]" />
                <Stack.Screen name="chat/[uid]" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="social-settings" />
                <Stack.Screen name="lists" />
                <Stack.Screen name="list/[id]" />
                {/* "onboarding" KALKTI — "Hangilerini sevdin?" ekranı tümden
                    silindi. Rota burada bırakılsaydı expo-router var olmayan
                    bir rota için uyarı verirdi; aynı kırılma "social" ve
                    "messages" taşınırken iki kez yaşandı (yukarıdaki notlar).
                    Tanıtım perdesi kaybolmadı: artık (tabs) düzeninde,
                    anasayfanın üstüne seriliyor. */}
                <Stack.Screen name="account" />
                <Stack.Screen name="delete-account" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // Zevk profilini açılışta belleğe yükle (keşif algoritması için) ve önbelleği geri yükle
  //
  // loadSession ÖNCE: depolar artık hesaba göre kapsanıyor ve sahip
  // çözülmeden okuma yapmıyorlar (ownerReady). Oturumu yüklemeyen bir açılış
  // depoları süresiz bekletirdi.
  useEffect(() => {
    loadSession();
    initQueryCache().finally(() => {
      loadProfile();
      loadSeen();
      loadDismissed();
      loadLiked();
      loadCollections();
    });
  }, []);

  // ── PERDE, TANITIM ÇİZİLDİKTEN SONRA İNİYOR ──────────────────────────────
  //
  // Yerel açılış perdesi, ilk kare çizilir çizilmez kendiliğinden kalkıyordu.
  // Tanıtım perdesinin gösterilip gösterilmeyeceği ise asenkron bir depo
  // okumasına bağlı: elde tutulmasaydı önce anasayfa boyanır, tanıtım ancak
  // ondan SONRA üstüne kapanırdı — görünür bir çakma.
  //
  // Bayrak BURADA okunuyor, (tabs) düzeninde değil: orada okunsaydı aynı
  // asenkron pencere bu kez perdenin altında değil, ÜSTÜNDE açılırdı.
  useEffect(() => {
    let alive = true;

    loadPerde().then(() => {
      if (!alive) return;
      // İKİ KARE BEKLENİYOR. Bayrağın çözüldüğü commit'te (tabs) düzeni
      // tanıtımı çiziyor, ama boyanması bir sonraki karede oluyor. Perde
      // aynı karede kalksaydı arada tek karelik çıplak anasayfa görünürdü.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        SplashScreen.hideAsync().catch(() => {});
      }));
    // Depo okuması `services/perde.js` içinde zaten try/catch'li, yani
    // reddetmiyor. Yine de catch şart: burada patlarsa perde SONSUZA DEK
    // yukarıda kalır ve uygulama açılmaz.
    }).catch(() => { SplashScreen.hideAsync().catch(() => {}); });

    return () => { alive = false; };
  }, []);

  // Share Extension'dan gelen bekleyen bir Steam linki varsa oyuna git
  useEffect(() => { startSharedLinkWatcher(); }, []);

  // Sistem teması değişince (uygulama ön plana döndüğünde) paleti tazele

  // Mesaj bildirimleri icin push token esitlemesi (istek listesinden ayri)
  useEffect(() => { startDmPushSync(); }, []);

  // ── Yön politikası ──
  // app.json'da orientation "default" YAPILMAK ZORUNDAYDI: iOS'ta Info.plist
  // yatayı listelemiyorsa lockAsync(LANDSCAPE) hiç çalışmıyor. Ama bu, tüm
  // uygulamanın serbestçe dönmesi demek — istenen bu değil.
  //
  // Çözüm: uygulamayı açılışta dikeye KİLİTLE, yalnızca video ekranı geçici
  // olarak yatayı açsın. Böylece Info.plist izin veriyor ama davranış
  // eskisiyle aynı kalıyor.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  // ── Bildirime dokunma ──
  //
  // Yönlendirme TEK BİR YERDE toplandı: hem uygulama açıkken gelen yanıt
  // hem de KAPALIYKEN dokunulup açılan yanıt aynı işleve gidiyor.
  //
  // Önce yalnızca `data.slug` (istek listesi fiyat uyarısı) ele alınıyordu;
  // mesaj bildirimleri `{ type: "dm", from }` gönderdiği için hiçbir şey
  // yapmıyordu — dokunulunca uygulama açılıyor ama sohbete gitmiyordu.
  const handleResponse = useCallback((resp) => {
    const data = resp?.notification?.request?.content?.data;
    if (!data) return;
    if (data.type === 'dm' && data.from) {
      router.push('/chat/' + String(data.from));
      return;
    }
    if (data.slug) {
      router.push({ pathname: '/game/[id]', params: { id: String(data.slug), name: data.name || '', slug: String(data.slug) } });
    }
  }, [router]);

  // Uygulama AÇIKKEN dokunulan bildirim
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [handleResponse]);

  // Uygulama KAPALIYKEN dokunulan bildirim.
  // Kanca aynı yanıtı vermeye devam ediyor; işlenen kimliği tutmazsak
  // her çizimde yeniden yönlendirir ve kullanıcı ekrandan çıkamaz.
  const sonYanit = useLastNotificationResponse();
  const islenenRef = useRef(null);
  useEffect(() => {
    const id = sonYanit?.notification?.request?.identifier;
    if (!id || islenenRef.current === id) return;
    islenenRef.current = id;
    handleResponse(sonYanit);
  }, [sonYanit, handleResponse]);

  return (
    // Jest sistemi kökten sarmalanmalı — swipe (Faz 1) ve diğer jest tabanlı
    // etkileşimler bu sağlayıcı olmadan sessizce çalışmaz.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* ThemeProvider EN DIŞTA (SafeArea'dan sonra): alt sağlayıcılar ve
            tüm ekranlar useTheme'e erişebilsin. */}
        <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <WishlistProvider>
              <TemaliYigin />
              {__DEV__ && <FpsMeter />}
            </WishlistProvider>
          </AuthProvider>
        </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
