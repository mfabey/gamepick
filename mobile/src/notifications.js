import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Bildirim geldiğinde uygulama açıkken de göster
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // eski sürüm uyumu
    shouldShowAlert: true,
  }),
});

// İzin iste + Expo push token al
export async function registerForPushToken() {
  if (!Device.isDevice) {
    return { error: 'physical-device-required' };
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'İndirim Uyarıları',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#e0a72e',
      });
    } catch {}
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    return { error: 'permission-denied' };
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return { token: tokenResp.data };
  } catch (e) {
    // Expo Go (SDK 53+) uzak push desteklemez → dev/store build gerekir
    return { error: 'token-failed', detail: e.message };
  }
}
