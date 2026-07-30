import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { loadProfile } from '../src/services/tasteProfile';
import { loadSeen } from '../src/services/seenStore';
import { loadDismissed } from '../src/services/dismissStore';
import { loadOnboarding } from '../src/services/onboarding';
import FpsMeter from '../src/dev/FpsMeter';
import { colors } from '../src/theme';

export default function RootLayout() {
  // Zevk profilini açılışta belleğe yükle (keşif algoritması için)
  useEffect(() => { loadProfile(); loadSeen(); loadDismissed(); }, []);

  // İlk açılışta oyun seçimi ekranını göster — kişiselleştirme hemen devreye girsin
  useEffect(() => {
    let alive = true;
    loadOnboarding().then((done) => {
      if (alive && !done) router.replace('/onboarding');
    });
    return () => { alive = false; };
  }, []);

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
              <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
            </Stack>
            {__DEV__ && <FpsMeter />}
          </WishlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
