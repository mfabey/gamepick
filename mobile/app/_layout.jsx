import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { loadProfile } from '../src/services/tasteProfile';
import { loadSeen } from '../src/services/seenStore';
import { loadDismissed } from '../src/services/dismissStore';
import { loadLiked } from '../src/services/likeStore';
import { loadCollections } from '../src/services/collectionsStore';
import { loadOnboarding } from '../src/services/onboarding';
import { initQueryCache } from '../src/services/queryCache';
import { startSharedLinkWatcher } from '../src/services/sharedLink';
import FpsMeter from '../src/dev/FpsMeter';
import { colors } from '../src/theme';

export default function RootLayout() {
  // Zevk profilini açılışta belleğe yükle (keşif algoritması için) ve önbelleği geri yükle
  useEffect(() => {
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

  // Bildirime dokununca ilgili oyuna git
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(resp => {
      const data = resp?.notification?.request?.content?.data;
      if (data?.slug) {
        router.push({ pathname: '/game/[id]', params: { id: String(data.slug), name: data.name || '', slug: String(data.slug) } });
      }
    });
    return () => sub.remove();
  }, []);

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
