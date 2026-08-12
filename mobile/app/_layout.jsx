import { useEffect, useCallback, useRef } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { loadSession } from '../src/services/session';
import { loadProfile } from '../src/services/tasteProfile';
import { loadSeen } from '../src/services/seenStore';
import { loadDismissed } from '../src/services/dismissStore';
import { loadLiked } from '../src/services/likeStore';
import { loadCollections } from '../src/services/collectionsStore';
import { loadOnboarding } from '../src/services/onboarding';
import { initQueryCache } from '../src/services/queryCache';
import { startSharedLinkWatcher } from '../src/services/sharedLink';
import { startDmPushSync } from '../src/services/dmPush';
import { useLastNotificationResponse } from 'expo-notifications';
import FpsMeter from '../src/dev/FpsMeter';
import { colors } from '../src/theme';

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

  // İlk açılışta oyun seçimi ekranını göster — kişiselleştirme hemen devreye girsin
  useEffect(() => {
    let alive = true;
    loadOnboarding().then((done) => {
      if (alive && !done) router.replace('/onboarding');
    });
    return () => { alive = false; };
  }, []);

  // Share Extension'dan gelen bekleyen bir Steam linki varsa oyuna git
  useEffect(() => { startSharedLinkWatcher(); }, []);

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
        <LanguageProvider>
          <AuthProvider>
            <WishlistProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bg },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="game/[id]" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="wishlist" />
                <Stack.Screen name="discover" />
                <Stack.Screen name="swipe" />
                <Stack.Screen name="library" />
                <Stack.Screen name="collections" />
                <Stack.Screen name="collection/[id]" />
                <Stack.Screen name="stats" />
                <Stack.Screen name="social" />
                <Stack.Screen name="steam-friends" />
                <Stack.Screen name="game-cards" />
                {/* "messages" BURADAN KALKTI: alt navigasyona taşındı, artık
                    (tabs) altında. Burada bırakılsaydı expo-router var
                    olmayan bir çocuk rota için uyarı verirdi.
                    Yerini haberler aldı — o da ters yönde taşındı. */}
                <Stack.Screen name="news" />
                <Stack.Screen name="reviews" />
                <Stack.Screen name="chat/[uid]" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="social-settings" />
                <Stack.Screen name="lists" />
                <Stack.Screen name="list/[id]" />
                <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
                <Stack.Screen name="account" />
                <Stack.Screen name="delete-account" />
              </Stack>
              {__DEV__ && <FpsMeter />}
            </WishlistProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
