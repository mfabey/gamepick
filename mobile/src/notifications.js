import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Bildirim geldiğinde uygulama açıkken de göster
// ── Açık sohbet ──
//
// Kullanıcı bir sohbetin İÇİNDEYKEN o kişiden gelen mesaj için bildirim
// göstermek anlamsız: mesaj zaten ekranda beliriyor. Banner üstüne düşüp
// okuduğu satırı kapatıyor.
//
// SUNUCUDA DEĞİL İSTEMCİDE çözüldü: sunucunun "şu an hangi ekrandasın"
// bilgisini tutması, her mesajda fazladan bir okuma ve senkron tutulması
// gereken yeni bir durum demekti. Bildirim zaten cihaza ulaşıyor; yalnızca
// GÖSTERİLMİYOR.
let activeChatUid = null;

/** Sohbet ekranı açılırken/kapanırken çağırır. */
export function setActiveChat(uid) { activeChatUid = uid || null; }
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Gelen mesaj, ŞU AN AÇIK olan sohbetten mi? Sunucu bildirim verisine
    // gönderenin uid'sini koyuyor (data: { type: "dm", from }).
    const data = notification?.request?.content?.data || {};
    const sessiz = data.type === 'dm' && data.from && data.from === activeChatUid;

    return {
      shouldShowBanner: !sessiz,
      shouldShowList: !sessiz,
      shouldPlaySound: !sessiz,
      shouldSetBadge: false,
      // eski sürüm uyumu
      shouldShowAlert: !sessiz,
    };
  },
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

// ── Okunan sohbetin bildirimlerini temizle ──
//
// Mesajı ekranda okumak bildirimi merkezden DÜŞÜRMÜYOR: iOS bildirimi
// teslim edildiği anda merkeze koyuyor ve orada kalıyor. Kullanıcı mesajı
// okuduktan sonra bildirimi görmeye devam ediyor — okunmamış bir şey
// varmış gibi.
//
// YALNIZCA O KİŞİNİN bildirimleri düşürülüyor, hepsi değil: başka
// sohbetlerden gelen okunmamış bildirimler durmalı.
export async function dismissChatNotifications(uid) {
  if (!uid) return;
  try {
    const list = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(list
      .filter((x) => {
        const d = x?.request?.content?.data || {};
        return d.type === 'dm' && d.from === uid;
      })
      .map((x) => Notifications.dismissNotificationAsync(x.request.identifier)));
  } catch { /* izin yoksa veya platform desteklemiyorsa sessiz geç */ }
}
