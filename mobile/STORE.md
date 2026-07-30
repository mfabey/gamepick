# Gamerisen — Mağaza Gönderim Notları

Kod incelemesiyle çıkarılmış gerçek veri akışı. App Store Connect / Play Console
formlarını doldururken bunu esas al. **Kod değişirse burayı güncelle.**

## Uygulamanın işlediği veriler

| Veri | Nereye gider | Amaç |
|---|---|---|
| **Ad + e-posta (hesap)** | **Sunucuya** (Firebase Auth) | Hesap oluşturma/giriş, cihazlar arası senkron |
| Expo push token | **Sunucuya** (`registerPush`) | Fiyat düşüş bildirimi |
| Takip listesi (wishlist) | **Sunucuya** (token ile birlikte) | Fiyat düşüş bildirimi + hesap senkronu |
| Zevk profili (tür ağırlıkları) | **Sunucuya** (yalnızca hesap açıksa, `/api/user/data`) | Cihazlar arası senkron |
| Steam ID / Xbox oturumu | **Sunucuya** (kütüphane çekmek için) | Kütüphane gösterimi |
| Görülenler, "ilgilenmiyorum" | **Sadece cihazda** (AsyncStorage) | Öneri kişiselleştirme |

Cihazdan çıkmayan yerel anahtarlar: `gr_seen`, `gr_dismissed`, `gr_notif_enabled`.
Steam/Xbox oturumu ve hesap token'ları (`gr_account_session`) **SecureStore**'da
tutulur. Şifre bizde saklanmaz — Firebase Auth doğrudan yönetir, sunucumuz
yalnızca doğrulanmış token'ı görür.

**v1.1 ile eklenen hesap sistemi:** e-posta/şifre ile kayıt-giriş (web ile ortak
Firebase kullanıcı havuzu), token tabanlı mobil oturum (`/api/auth/mobile-login`,
`/api/auth/mobile-refresh`), hesaba bağlı zevk+takip senkronu (`/api/user/data`,
sunucu ve cihaz verisini BİRLEŞTİRİR, üzerine yazmaz), ve uygulama içi hesap
silme (`/api/auth/mobile-delete` — şifre tekrar doğrulanır, Firebase hesabı +
tüm `user_*` Redis anahtarları silinir). Hesap **opsiyoneldir**; hesapsız kullanım
tamamen aynı şekilde çalışmaya devam eder.

## App Store Connect — Gizlilik etiketleri (App Privacy)

**Takip (Tracking): HAYIR.** Uygulama kullanıcıyı başka uygulama/sitelerde takip
etmiyor, reklam ağı yok, üçüncü taraf analitik yok → **ATT izin ekranı gerekmez.**

| Kategori | Toplanıyor mu | Not |
|---|---|---|
| **Contact Info (Ad, E-posta)** | ✅ **Evet — v1.1 ile YENİ** | Hesap oluşturma/giriş — **App Functionality**, kullanıcıya bağlı, takip amaçlı değil |
| Identifiers (Cihaz/Kullanıcı ID) | ✅ Evet | Push token, Steam ID, Firebase UID — **App Functionality**, kullanıcıya bağlı |
| User Content | ✅ Evet | Takip listesi — **App Functionality** |
| Purchases | ❌ Hayır | Satın alma işlemi yapılmıyor, yalnızca mağazalara yönlendirme |
| Usage Data | ❌ Hayır | Zevk profili yalnızca hesap açıksa senkronlanır; ne olursa olsun reklam/analiz için kullanılmaz |
| Location / Contacts / Health / Financial | ❌ Hayır | — |
| Diagnostics / Crash Data | ❌ Hayır | Crash SDK'sı yok |

> ⚠️ v1.1 gönderiminde App Store Connect → App Privacy formunu **Contact Info: Evet**
> olacak şekilde güncellemeyi unutma (v1'de bu "Hayır" işaretlenmişti — artık geçersiz).

## Gerekli bağlantılar
- Gizlilik politikası: https://www.gamerisen.com/privacy ✅ canlı
- Kullanım şartları: https://www.gamerisen.com/terms ✅ canlı
- Destek: https://www.gamerisen.com/support ✅ canlı

## İnceleme notları (App Review'a yazılacak)
- **Giriş zorunlu değil.** Uygulamanın tamamı (keşif, oyun detayı, fiyat
  karşılaştırma, haberler) hesapsız kullanılabilir. Profil sekmesinden isteğe
  bağlı e-posta/şifre hesabı oluşturulabilir (cihazlar arası senkron için) veya
  Steam/Xbox bağlanabilir → **demo hesap gerekmiyor**, incelemeci hesapsız da
  tüm işlevi görebilir.
- **Uygulama içi hesap silme (v1.1):** Profil → Hesap → "Hesabı Sil". Şifre
  tekrar istenir, onay sonrası hesap ve sunucudaki tüm veriler kalıcı silinir.
- **Hesap bağlantısı kaldırma:** Profil sekmesinde her Steam/Xbox hesabının
  yanında bağlantıyı kaldırma butonu var (onay diyaloglu).
- **Harici linkler:** Oyun satın alma linkleri Steam/Epic/GOG'a yönlendirir.
  Uygulama içi dijital satış yoktur; fiyat karşılaştırma/katalog uygulamasıdır.
- **4.2.2 (v1 ret gerekçesi) için:** İlk açılışta kullanıcı birkaç oyun seçer
  → kişiselleştirilmiş öneri motoru **hiçbir gezinme olmadan** anında aktif
  olur (Ana Sayfa → "Senin İçin"). Ayrıca: native paylaşım (oyun detayında ↗
  ikonu), haptik geri bildirim (seçim/takip), Steam/Xbox kütüphane senkronu
  (oynama saatine göre kişiselleştirme), doğal dil ile oyun arama (Keşfet
  sekmesi) — bunların hiçbiri bir web sayfasında bulunmaz.

## Teknik yapılandırma (v1)
- iPad desteği **kapalı** (`ios.supportsTablet: false`) — arayüz telefon için
  tasarlandı. iPad'i ileride düzgün tasarlayıp açacağız.
- Uzak push kullanılıyor → APNs anahtarı gerekir (EAS build sırasında üretir).
- İkon `assets/icon.png`: 1024×1024, alpha kanalı yok ✅ (Apple şartı).
- OTA: `runtimeVersion.policy = "appVersion"` (fingerprint'ten değiştirildi —
  monorepo yerleşiminde EAS build'lerinde uyuşmazlığa yol açıyordu). **Kural:**
  yalnızca JS güncellemesi gönderirken `expo.version`'ı ARTIRMA — artırırsan
  mevcut kullanıcılar OTA almayı keser. Yalnızca yeni mağaza sürümünde artır.
