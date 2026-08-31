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
//
// HATA KODLARI AYRI TUTULUYOR. Önceden üç ayrı arıza tek mesaja düşüyordu
// ("Expo Go'dasın"): emülatörde de, gerçek cihazda projectId/FCM bozukken
// de aynı şey yazıyordu. Ölçüldü (2026-08-31, Android 16 emülatör): cihaz
// `physical-device-required` dönerken kullanıcı Expo Go mesajı görüyordu.
// Yanlış teşhis, hata ayıklamayı tamamen yanlış yöne sokuyordu.
//
// Expo Go artık BURADA ayrılıyor: `token-failed`e bırakılsaydı gerçek token
// arızasından ayırt edilemezdi — ikisi de aynı catch'e düşüyor.
export async function registerForPushToken() {
  // En özgül kontrol önce: Expo Go gerçek cihazda da çalışır, yani
  // isDevice kontrolüne bırakılırsa yakalanmaz.
  if (Constants.executionEnvironment === 'storeClient') {
    return { error: 'expo-go' };
  }

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
    // Buraya artık GERÇEK token arızaları düşüyor: eksik/yanlış projectId,
    // bozuk google-services.json, FCM'e ulaşamama. Expo Go yukarıda ayrıldı.
    return { error: 'token-failed', detail: e.message };
  }
}

// Hata kodu → i18n anahtarı.
//
// BURADA duruyor çünkü kodları üreten yer burası. Eşleme çağrı yerlerine
// dağılmıştı (settings.jsx ve wishlist.jsx) ve ikisi de aynı eksik ternary'yi
// taşıyordu: yalnız 'permission-denied' ayrılıp geri kalan HER ŞEY
// 'notif.needDevBuild'e düşüyordu. Yeni bir kod eklendiğinde iki dosyayı da
// güncellemeyi hatırlamak gerekiyordu; biri unutulduğunda sessizce yanlış
// mesaj çıkıyordu.
export function pushHataAnahtari(error) {
  switch (error) {
    case 'permission-denied':        return 'notif.permissionError';
    case 'physical-device-required': return 'notif.needRealDevice';
    case 'expo-go':                  return 'notif.needDevBuild';
    case 'token-failed':             return 'notif.tokenFailed';
    // Bilinmeyen kod: Expo Go'yu suçlamak yerine token arızası de — yeni
    // kodların çoğu token yolundan gelir ve bu teşhis en az yanıltıcı olan.
    default:                         return 'notif.tokenFailed';
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
