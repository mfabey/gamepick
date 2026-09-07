# Gamerisen — Mağaza Gönderim Notları

Kod incelemesiyle çıkarılmış gerçek veri akışı. App Store Connect / Play Console
formlarını doldururken bunu esas al. **Kod değişirse burayı güncelle.**

**2.6.x için yenilendi.** v1'deki tablo (fiyat karşılaştırma uygulaması, "User
Content = yalnızca takip listesi", "Location = Hayır") sosyal katmanla birlikte
tümüyle geçersiz kaldı.

## Uygulamanın işlediği veriler

| Veri | Nereye gider | Amaç |
|---|---|---|
| **Ad + e-posta (hesap)** | **Sunucuya** (Firebase Auth) | Hesap oluşturma/giriş, cihazlar arası senkron |
| **Kullanıcı adı, bio, avatar** | **Sunucuya** (`user_profile:{uid}`) | Herkese açık profil |
| **Profil fotoğrafı** | **Sunucuya** (Vercel Blob, önce Vision denetimi) | Avatar |
| **Sohbet mesajları** | **Sunucuya** (`dm_msgs:{cid}`, Redis, son 500 mesaj) | Mesajlaşma |
| **Sohbet fotoğrafları** | **Sunucuya** (Vercel Blob, önce Vision denetimi) | Mesajlaşma |
| **İnceleme / gönderi / liste** | **Sunucuya** | Topluluk içeriği |
| **Arkadaş grafiği, Steam arkadaşları** | **Sunucuya** | Arkadaşlık, ortak kütüphane |
| **Çevrimiçi durumu (presence)** | **Sunucuya** (45 sn nabız, yalnızca arkadaşa açık) | Sohbet |
| **Şehir adı** (isteğe bağlı) | **Sunucuya** — koordinat DEĞİL | Paylaşılan karta şehir etiketi |
| Expo push token | **Sunucuya** (`registerPush`) | Fiyat düşüşü + mesaj bildirimi |
| Takip listesi (wishlist) | **Sunucuya** | Fiyat düşüş bildirimi + hesap senkronu |
| Zevk profili (tür ağırlıkları) | **Sunucuya** (yalnızca hesap açıksa) | Cihazlar arası senkron |
| Steam ID / Xbox oturumu | **Sunucuya** | Kütüphane gösterimi |
| Doğal dil arama sorgusu | **Groq'a** (anlık, saklanmıyor) | Filtre çıkarımı |
| Görülenler, "ilgilenmiyorum" | **Sadece cihazda** (AsyncStorage) | Öneri kişiselleştirme |

Konum: ters coğrafi çözümleme **cihazda** yapılıyor, sunucuya yalnızca şehir
adı gidiyor. Arka plan konumu yok, varsayılan kapalı.

Cihazdan çıkmayan yerel anahtarlar: `gr_seen`, `gr_dismissed`, `gr_notif_enabled`.
Oturum ve hesap token'ları (`gr_account_session`) **SecureStore**'da. Şifre
bizde saklanmaz — Firebase Auth yönetir, sunucumuz yalnızca doğrulanmış
token'ı görür.

## Veri alan üçüncü taraflar

| Servis | Ne alıyor |
|---|---|
| Firebase Auth (Google) | E-posta, şifre doğrulaması |
| Upstash Redis | Profil, mesaj, liste, arkadaş verisi |
| Vercel Blob | Sohbet ve profil fotoğrafları |
| Pusher | Anlık mesaj teslimi |
| **Google Cloud Vision** | Yüklenen her görsel (SafeSearch denetimi) |
| **Groq** | Doğal dil arama cümlesi (anlık) |
| Steam / Xbox / RAWG / ITAD | Oyun ve kütüphane verisi |
| Expo Push | Bildirim token'ı |

> ⚠️ **Gizlilik politikasında eksik:** `app/privacy/page.jsx` Pusher ve Blob'u
> anlatıyor ama **Vision** ile **Groq** geçmiyor. Gönderimden önce eklenmeli —
> Apple veri alan üçüncü tarafların politikada yazmasını bekliyor.

## App Store Connect — Gizlilik etiketleri (App Privacy)

**Takip (Tracking): HAYIR.** Reklam ağı, veri simsarı, üçüncü taraf analitik
yok; `mobile/package.json` içinde hiçbir analytics/crash SDK'sı yok →
**ATT izin ekranı gerekmez.**

| Kategori | Veri | Amaç | Kullanıcıya bağlı |
|---|---|---|---|
| **Contact Info** | E-posta, Ad | App Functionality | Evet |
| **User Content → Emails or Text Messages** | Sohbet mesajları (gönderen, alıcı, içerik) | App Functionality | Evet |
| **User Content → Photos or Videos** | Sohbet fotoğrafı + profil fotoğrafı | App Functionality | Evet |
| **User Content → Other User Content** | İncelemeler, gönderiler, listeler, kullanıcı adı, bio, takip listesi | App Functionality | Evet |
| **Identifiers** | Kullanıcı ID (UID, kullanıcı adı, Steam ID, Xbox), Cihaz ID (push token) | App Functionality | Evet |
| **Location** | **Coarse Location** — yalnızca şehir adı, isteğe bağlı | App Functionality | Evet |
| **Usage Data** | Product Interaction — zevk profili senkronu, çevrimiçi durumu | App Functionality + Product Personalization | Evet |
| Purchases / Financial / Health / Contacts / Browsing History / Diagnostics / Sensitive Info | — | — | **Hayır** |

## App Store Connect — Yaş sınırı anketi

Yeni sistem: 4+ / 9+ / 13+ / 16+ / 18+.

**In-App Controls:** Parental Controls **Hayır** · Age Assurance **Hayır**

**Capabilities**

| Soru | Cevap |
|---|---|
| User-Generated Content | **Evet** |
| Social Media | **Evet** (tek başına tabanı 13+ yapar) |
| Social Media Disabled for Users Under 13 | Hayır |
| Messaging and Chat | **Evet** |
| Unrestricted Web Access | Hayır (dış bağlantı belirli mağaza sayfasını açar, adres çubuğu yok) |
| Advertising | Hayır |

**İçerik** — hepsi üçüncü taraf oyun materyalinden (fragman, kapak):
Realistic Violence **Infrequent/Mild** · Cartoon Violence Infrequent/Mild ·
Profanity Infrequent/Mild · Horror Infrequent/Mild · Sexual Content
Infrequent/Mild · Mature Themes Infrequent/Mild · Alcohol/Drug Infrequent/Mild ·
Medical **Yok** · Simulated Gambling / Contests / Loot Boxes **Hepsi Hayır**

**Beklenen sonuç: 13+.**

> Realistic Violence "Frequent/Intense" işaretlenirse sonuç **18+** olur.
> Infrequent seçildi; gerekçe: uygulamanın kendi içeriği katalog verisi, şiddet
> kısa üçüncü taraf fragmanlarında. **Risk:** incelemeci Videolar sekmesinde
> kanlı bir fragmana denk gelirse Apple derecelendirmeyi kendisi yükseltebilir.

## Gerekli bağlantılar
- Gizlilik politikası: https://www.gamerisen.com/privacy ✅ canlı
- Kullanım şartları: https://www.gamerisen.com/terms ✅ canlı
- Destek: https://www.gamerisen.com/support ✅ canlı

## İnceleme notları

> ⚠️ **BU BÖLÜM ESKİ — yeniden yazılacak.** Aşağıdaki 4.2.2 maddesi artık
> yanlış: ilk açılıştaki "Hangilerini sevdin?" ekranı `8d48ec3` ile
> **kaldırıldı**. Ayrıca sosyal katman için demo hesap kurgusu ve Guideline 1.2
> anlatımı eksik.

- **Giriş zorunlu değil.** Keşif, oyun detayı, fiyat karşılaştırma, haberler,
  incelemeleri ve gönderileri OKUMA hesapsız çalışıyor. Yazma ve sosyal
  özellikler hesap ister.
- **Uygulama içi hesap silme:** Profil → Hesap → "Hesabı Sil". Şifre tekrar
  istenir, onay sonrası hesap ve sunucudaki tüm veriler kalıcı silinir.
- **Hesap bağlantısı kaldırma:** Profil sekmesinde her Steam/Xbox hesabının
  yanında bağlantıyı kaldırma butonu var (onay diyaloglu).
- **Harici linkler:** Mağaza linkleri sistem tarayıcısında açılır. Uygulama içi
  dijital satış yoktur.

## Guideline 1.2 (UGC) — durum

| Apple'ın şartı | Durum |
|---|---|
| Uygunsuz içeriği süzme | ✅ `content-filter` (metin) + Vision SafeSearch (görsel); video **kapalı** çünkü denetlenemiyor |
| Raporlama | ✅ `app/api/social/report` — kullanıcı, mesaj, inceleme, gönderi, liste |
| Engelleme | ✅ `app/api/social/block` — engelleme her durumda kazanır |
| Yayınlanmış iletişim bilgisi | ✅ destek sayfası |

Guideline 1.2 metninde EULA şartı **yazmıyor** — dört madde bunlar. Ama kural
"bu kuralı, **kendi kullanım şartlarınızı** veya **topluluk standartlarınızı**
ihlal eden içeriği kaldırmak sizin sorumluluğunuz" diyor; yaptırımın dayanağı
olsun diye kural seti yazıldı:

| Ek | Durum |
|---|---|
| Topluluk kuralları + sıfır tolerans maddesi | ✅ `app/terms/page.jsx` madde 4 (TR) / section 4 (EN) — yasak içerik listesi, yaptırım basamakları, 24 saatlik inceleme süresi, içerik lisansı, `support@gamerisen.com` |
| Kayıt ekranında sözleşme kabulü | ✅ `mobile/app/account.jsx` — CTA altında “Devam ederek Kullanım Şartları'nı ve Gizlilik Politikası'nı kabul etmiş olursun” satırı; iki bağlantı da tıklanabilir, sistem tarayıcısında açılıyor. `forgot` dışında her modda görünür — Apple ile giriş de hesap açtığı için yalnızca kayıt moduna konsa o yol kapsam dışı kalırdı. |

## Teknik yapılandırma
- iPad desteği **kapalı** (`ios.supportsTablet: false`) — arayüz telefon için.
- Uzak push kullanılıyor → APNs anahtarı gerekir (EAS build üretir).
- İkon `assets/icon.png`: 1024×1024, alpha kanalı yok ✅ (Apple şartı).
- OTA: `runtimeVersion.policy = "appVersion"`. **Kural:** yalnızca JS
  güncellemesi gönderirken `expo.version`'ı ARTIRMA — artırırsan mevcut
  kullanıcılar OTA almayı keser. Yalnızca yeni mağaza sürümünde artır.
