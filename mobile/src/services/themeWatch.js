import { Appearance, AppState } from 'react-native';
import { activeScheme } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Sistem teması değiştiğinde paketi yeniden yükler.
//
// NEDEN GEREKİYOR: palet `theme.js` içinde AÇILIŞTA seçiliyor ve
// `StyleSheet.create` o anki değerleri yakalıyor. Uygulama açıkken kullanıcı
// cihaz temasını değiştirirse ekran eski paletle kalır.
//
// NEDEN ANINDA DEĞİL: tema değişir değişmez yeniden yüklemek, kullanıcı
// uygulamayı KULLANIRKEN ekranı sıfırlamak demek — yazdığı gönderi, kaydırdığı
// akış gider. Oysa tema genelde uygulamanın DIŞINDA değiştiriliyor (Ayarlar,
// Kontrol Merkezi, gün batımı otomatiği). O yüzden yeniden yükleme uygulama ÖN
// PLANA DÖNDÜĞÜNDE yapılıyor: kullanıcı zaten uygulamadan çıkmıştı, geri
// geldiğinde doğru temayı görüyor.
//
// expo-updates zaten bağımlı (OTA için). reloadAsync yalnızca JS paketini
// yeniden başlatıyor, uygulama kapanıp açılmıyor.
// ─────────────────────────────────────────────────────────────────────────────

let started = false;

export function startThemeWatch() {
  if (started) return () => {};
  started = true;

  const check = async () => {
    const now = Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
    if (now === activeScheme) return;
    try {
      const Updates = await import('expo-updates');
      await Updates.reloadAsync();
    } catch {
      // Yeniden yükleme başarısızsa uygulama eski temayla çalışmaya devam
      // ediyor — kullanıcıyı engellemektense yanlış temada bırakmak yeğ.
    }
  };

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') check();
  });

  return () => {
    sub.remove();
    started = false;
  };
}
