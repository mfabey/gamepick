# Gamerisen — Mağaza Gönderim Notları

Kod incelemesiyle çıkarılmış gerçek veri akışı. App Store Connect / Play Console
formlarını doldururken bunu esas al. **Kod değişirse burayı güncelle.**

## Uygulamanın işlediği veriler

| Veri | Nereye gider | Amaç |
|---|---|---|
| Expo push token | **Sunucuya** (`registerPush`) | Fiyat düşüş bildirimi |
| Takip listesi (wishlist) | **Sunucuya** (token ile birlikte) | Fiyat düşüş bildirimi |
| Steam ID / Xbox oturumu | **Sunucuya** (kütüphane çekmek için) | Kütüphane gösterimi |
| Zevk profili, görülenler, "ilgilenmiyorum" | **Sadece cihazda** (AsyncStorage) | Öneri kişiselleştirme |

Cihazdan çıkmayan yerel anahtarlar: `gr_taste_profile`, `gr_seen`, `gr_dismissed`,
`gr_wishlist`, `gr_notif_enabled`. Steam/Xbox oturumu SecureStore'da tutulur.

## App Store Connect — Gizlilik etiketleri (App Privacy)

**Takip (Tracking): HAYIR.** Uygulama kullanıcıyı başka uygulama/sitelerde takip
etmiyor, reklam ağı yok, üçüncü taraf analitik yok → **ATT izin ekranı gerekmez.**

| Kategori | Toplanıyor mu | Not |
|---|---|---|
| Identifiers (Cihaz/Kullanıcı ID) | ✅ Evet | Push token, Steam ID — **App Functionality**, kullanıcıya bağlı |
| User Content | ✅ Evet | Takip listesi — **App Functionality** |
| Purchases | ❌ Hayır | Satın alma işlemi yapılmıyor, yalnızca mağazalara yönlendirme |
| Usage Data | ❌ Hayır | Zevk profili cihazda kalıyor, sunucuya gitmiyor |
| Location / Contacts / Health / Financial | ❌ Hayır | — |
| Diagnostics / Crash Data | ❌ Hayır | Crash SDK'sı yok |

## Gerekli bağlantılar
- Gizlilik politikası: https://www.gamerisen.com/privacy ✅ canlı
- Kullanım şartları: https://www.gamerisen.com/terms ✅ canlı
- Destek: https://www.gamerisen.com/support ✅ canlı

## İnceleme notları (App Review'a yazılacak)
- **Giriş zorunlu değil.** Uygulamanın tamamı (keşif, oyun detayı, fiyat
  karşılaştırma, haberler) hesapsız kullanılabilir. Yalnızca "Kütüphane" sekmesi
  Steam/Xbox bağlantısı ister → **demo hesap gerekmiyor**, incelemeci diğer
  sekmelerden tüm işlevi görebilir.
- **Hesap bağlantısı kaldırma:** Profil sekmesinde her Steam/Xbox hesabının
  yanında bağlantıyı kaldırma butonu var (onay diyaloglu).
- **Harici linkler:** Oyun satın alma linkleri Steam/Epic/GOG'a yönlendirir.
  Uygulama içi dijital satış yoktur; fiyat karşılaştırma/katalog uygulamasıdır.

## Teknik yapılandırma (v1)
- iPad desteği **kapalı** (`ios.supportsTablet: false`) — arayüz telefon için
  tasarlandı. iPad'i ileride düzgün tasarlayıp açacağız.
- Uzak push kullanılıyor → APNs anahtarı gerekir (EAS build sırasında üretir).
- İkon `assets/icon.png`: 1024×1024, alpha kanalı yok ✅ (Apple şartı).
- OTA: `runtimeVersion.policy = "fingerprint"`, kanallar `eas.json` içinde.
