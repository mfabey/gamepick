# Gamerisen 2.0 — uygulama günlüğü

## 22 Eylül 2026 — temel bileşen grubu

Kullanıcı kararları: **açık/koyu/sistem tercihi korunacak**; video kataloğu ve ayrı oynatıcı eklenirken **Reels, Kısa klipler üzerinden korunacak**. Tasarımda eksik olan ürün bölümlerinin kodlanması da uygulama kapsamına alındı. Bu kayıt bütün geçişin tamamlandığı anlamına gelmez.

### Uygulananlar

- Teslim paketi `design-handoff/` altında, orijinal içerikleri korunarak eklendi.
- `mobile/src/theme/tokens.ts`: yeni tasarım token'ları; animasyon eğrileri Reanimated'in UI-thread uyumlu Easing kaynağını kullanıyor.
- `palettes.ts` ve `useDesignTheme.ts`: canlı koyu/açık palet. Açık palet, paket açık tema içermediği için semantik uyarlamadır; tasarımın birebir açık varyantı olarak sunulmuyor.
- `theme.js` / ThemeContext: eski renk adları yeni değerlere bağlandı; ortak APP_PALETTES ile başlangıç ve canlı palet tek kaynaktan geliyor. Mevcut ayar anahtarı ve sistem tema aboneliği korundu.
- Hazır SVG ikonları, Mark/Wordmark/Lockup eklendi; varsayılan renkler canlı temayı izliyor.
- `GamerisenTabBar` + `AppTabBar`: mevcut beş sekmeye bağlandı. iOS 62pt cam kapsül, Android 64pt + sistem alanı Material görünümü; ikonlar, profil avatarı, uzun basma etiketi ve okunmamış rozeti. Mevcut tabPress/tabLongPress, unread ve video gizlenme bağlantıları korundu. DS7 sabit geometrisi uygulandı; eski kaydırmada daralma yeni çubuğa uygulanmıyor.
- İki platformda çubuk overlay. `tabGeometry` ile çubuk, liste alt dolguları ve Reels yatay kontrollerinin hesabı eşlendi; Android'de navigator payı + liste dolgusu iki kez uygulanmıyor.
- `ui/Primitives.tsx`: Txt, PressableScale, Button, IconButton, Chip, Segmented, TextField, Switch, CoverImage, SectionHeader, ListGroup, ListRow. Bu ilk ortak kontrol grubudur; bütün COMPONENTS envanteri henüz tamamlanmadı.
- `/design-system`: geliştirme sürümüne özel etkileşimli galeri; üretimde ana sayfaya yönlenir. Gerçek ekranlara örnek içerik eklenmedi.
- Inter 400/500/600/700, font hazırlığını bekleyen splash, yeni iOS açık/koyu/tonlu simgeler ve Android uyarlanabilir/tek renk simgeler. Açık splash koyu logo varyantını kullanır. Inter'in yalnız dört kullanılan dosyası import edilir.
- `expo-blur` ve Inter eklendi. Expo denetiminin talep ettiği SDK54 yama güncellemeleri uygulandı: Expo ~54.0.37, constants ~18.0.14, updates ~29.0.20.

### Doğrulama

- Değişiklik öncesi mevcut `npm run check` zinciri geçti.
- Değişiklik sonrası mevcut denetimler, yeni `check:design-v2` ve TypeScript kontrolü geçti.
- Yeni doğrulama gerçek token modüllerini okuyarak semantik anahtar paritesi, temel metin/zemin kontrastı, marka/primary ayrımı, alias çıktıları ve altı safe-area düzenini denetler. Native animasyon motorunu çalıştıran test değildir.
- Tema sabit renk ve donuk stil denetimleri TS/TSX dosyalarını da kapsayacak şekilde genişletildi.
- `expo install --check`: uyumlu; `expo-doctor`: **18/18** geçti.
- iOS ve Android üretim JS paketleri export edildi. Bu işlem imzalı native uygulama derlemesi veya cihaz testi değildir.
- Bu ortamda Android SDK yolunda adb bulunmuyor; iOS simülatörü de yok. Native cam/ripple, gerçek dokunma, ekran okuyucu, klavye ve piksel karşılaştırması **henüz doğrulanmadı**. Yeni native bağımlılık ve ikon/splash için yeni development/release build gerekli.

### Sıradaki uygulama işleri

1. Ortak kart ailelerinin kalanları ve durum bileşenleri; ana sayfanın hero, fırsat, haber/video bölümleri.
2. Oyun detayı ve fiyat karşılaştırma; fiyat geçmişi/hedef alarm için gerçek veri sözleşmesi.
3. Topluluk ve oluşturma/detay akışları; takip ve oyun toplulukları için sunucu desteği.
4. Arama, bildirim merkezi, haber detayı, profil ve ayarlar; yeni işlevler için kalıcı veri ve yetki kontrolleri.
5. Video kataloğu + ayrı oynatıcı + korunmuş Reels.
6. iOS/Android gerçek görsel/etkileşim doğrulaması; tasarım farklarının kapatılması.

Mevcut API'ler ve iş mantığı bu grupta değiştirilmedi. Fotoğraf yükleme, mikrofon/kamera izinleri, iPad desteği ve PiP gibi bilerek kapalı özellikler açılmadı. Kalan ekranlar ve yeni veri özellikleri tamamlanmış sayılmıyor.

### 22 Eylül — Ana sayfa başlığı ve oyun kartları

- Yeni logo kilidi, 44 pt arama/haber girişleri ve ortak bölüm başlıkları bağlandı. Bildirim merkezi henüz olmadığından haber girişi çalışır durumda korundu; sahte bildirim noktası eklenmedi.
- Ana sayfanın katalog rayları DS 3 `GameCard` kullanıyor: 148×198 kapak, 14 pt köşe, başlık/bilgi/fiyat satırları, indirim etiketi ve istek listesi kalbi. Ray aralığı 12, bölüm aralığı 32.
- Fiyatlar `usePrice` önbelleğinden; kalp `WishlistContext` kimlik eşleştirme ve kalıcılığından besleniyor. Veri yokken fiyat uydurulmuyor. Öneri eleme düğmesi ve kapaktan detay geçişi korundu; düz gezinmede de Steam appid taşınıyor.
- Öneri sıralaması, sosyal akış, engelleme/moderasyon ve widget güncellemesi değiştirilmedi.
- `npm run check` ve iki platform export başarılı. Native cihazda görsel eşleme henüz yapılmadı. Bu bölüm ana sayfanın tamamının birebir bittiği anlamına gelmez; mağaza rozeti ve kalan kart aileleri de sırada.
