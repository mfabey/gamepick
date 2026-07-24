import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import { WishlistProvider } from '../src/context/WishlistContext';
import { colors } from '../src/theme';

export default function RootLayout() {
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
            </Stack>
          </WishlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
