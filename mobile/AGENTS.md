# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Kapatılan kararlar — yeniden açma

Aşağıdakiler tartışıldı ve **bilerek yapılmadı**. Tasarım belgelerinde
istendikleri için "eksik" gibi görünürler; değiller.

## "Sıra sende" bölümü — YAPILMIYOR

Faz 1 anasayfada, Faz 3 oyun detayında istiyor. İki sebeple yok:

1. **Anasayfadan kullanıcı kaldırttı.** Eski adı "Bunları oynadın, ne
   düşünüyorsun". Tasarım belgesi bir kullanıcı talimatını ezmez.
2. **Detay ekranında verisi yok.** Oynama süresi (`g.hours`)
   `getEligibleGames()` → `/api/social` üzerinden geliyor; detay ekranı o
   çağrıyı yapmıyor. Kararlar.dc.html'in 4. kararı da "detaya yeni çağrı
   ekleme, iddiayı verinin olduğu yere taşı" diyor — taşındı: saat yalnızca
   Topluluk'taki davet şeridinde.

## Ölçek dışı boşluk borcu (328) — TOPLU DÜZELTİLMİYOR

`npm run check:spacing` bunu taban olarak tutuyor: büyüyemez, sekiz fazda
395 → 328 indi. Kalanlar 40 dosyaya yayılmış 11/9/22 gibi değerler; hepsini
ölçeğe çekmek 328 yerleşim sayısını değiştirmek demek — görsel gerileme
riski kazancından büyük. Dokunulan dosyada fırsat varsa azaltılır, kampanya
yapılmaz.

## expo-video PiP (`ExpoVideo: ... does not support picture-in-picture`) — AÇILMIYOR

Release build'de logcat'te bu satır her video yerleşiminde bir kez düşüyor.
Ölçüldü (2026-08-31, Android 16 emülatörde R8'li release APK):

- Uygulama kodunda PiP çağrısı **yok** — `allowsPictureInPicture`,
  `startPictureInPicture`, hiçbiri geçmiyor.
- Kaynak `VideoView.kt:328` → `applyRectHint()`. Video görünümü her
  yerleştiğinde KOŞULSUZ çalışıyor, `setPictureInPictureParams` deniyor,
  manifest izin vermeyince `IllegalStateException` alıyor. Kütüphane bunu
  `runWithPiPMisconfigurationSoftHandling` ile yakalıyor — **çökme yok**.
- Kaybedilen tek şey `sourceRectHint`: PiP'e geçiş animasyonunu yumuşatan
  ipucu. PiP kullanılmadığı için kaybedilen bir şey yok.

AÇMAMA GEREKÇESİ. `expo-video` plugin'ini `supportsPictureInPicture: true`
ile eklemek hata düzeltmek değil, ÖZELLİK EKLEMEK:

- Android'e "PiP destekliyorum" dedirtir; sistem video oynarken ana ekran
  tuşunda PiP penceresi teklif edebilir. PiP yaşam döngüsü kodda
  yönetilmiyor — sonuç bozuk pencere olur.
- Plugin kaynağında (`plugin/build/withExpoVideo.js`) aynı bayrak iOS'ta
  `UIBackgroundModes`'a `audio` EKLİYOR. `infoPlist`'imizde şu an yalnız
  `ITSAppUsesNonExemptEncryption` var. Kullanılmayan bir arka plan yetkisi
  App Store incelemesinde açıklama ister — `APPEAL_4.2.2.md` ortada.

Yani log zararsız, açmanın bedeli değil. PiP gerçekten istenirse ayrı bir
özellik işi olarak planlanmalı, log susturmak için değil.

---

# Android sekme çubuğu — YAZILDI (Faz 2)

Bu madde bir zamanlar "kapatılan kararlar" altındaydı: Faz 2 Android için
ayrı bir çubuk tarif ediyordu ama projede `android/` dizini yoktu, yani
**doğrulanamıyordu**. Artık var (yerel Android zinciri + Android 16
emülatörü); çubuk `src/components/FloatingTabBar.jsx` içinde
`Platform.OS === 'android'` dallanmasıyla yazıldı.

|                | iOS            | Android                       |
| -------------- | -------------- | ----------------------------- |
| çubuk yarıçapı | 29 (tam hap)   | 20 (`radius.xl`)              |
| yüzey          | cam / düz dolgu| düz dolgu + **elevation 18**  |
| vurgu          | 52×42, r21     | 72×48, r16 → basılıyken r24   |
| ikon           | 25             | 22                            |

Yükseklik (58), kenar payı (20) ve alt boşluk (24) İKİ PLATFORMDA DA aynı:
Faz 2 Android için ayrı bir yükseklik vermiyor ve 58, `TAB_SPACE` /
`useTabBosluk` aritmetiğinin girdisi — orayı oynatmak sekiz ekranın liste
dolgusunu sessizce kaydırırdı.

Faz 2 belgesinde olmayan iki sayı koda gerekçesiyle yazıldı: vurgunun köşe
yarıçapı ölçekten seçildi (`radius.lg` = 16) ve elevation açık temada da 18
(`shadows.floating` orada 10 veriyor; Android'de yüzeyi ayıran tek kanal
gölge).

**Doğrulandı** (Android 16 emülatör, Pixel 8 = 411dp, release APK, ekran
görüntüsü üstünde piksel ölçümü):

- vurgu 189×126 px = **72.0 × 48.0 dp** — Faz 2'nin sayısı birebir.
- basılıyken sol kenar girintisi üst kenardan +2/+12/+30 px'te 46/26/9 px;
  r=24dp'nin (63px) beklediği 47.3/26.0/9.3. Bırakınca +2 px'te 28 px, yani
  r=16dp (42px → 29.2). **Şekil morfu çalışıyor.**
- gölge açık temada çubuğun 20 px solunda 239 → 242, 34 px solunda 254 → 251:
  kenarda yumuşuyor, dışarı daha uzağa taşıyor. elevation 10 → 18'in beklenen
  davranışı.

## Bu işin düzelttiği İKİ YANLIŞ BEKLENTİ

1. **`src/design/tokens.json → blur.$fallback`** hâlâ "Android'de
   glassFallback düz dolgu + aynı gölge, **geometri asla değişmez**" diyor.
   O not cam YOKKEN yedeğe düşmeyi anlatıyordu; Faz 2 Android'i yedek
   olmaktan çıkarıp kendi ölçüsünü veriyor. Çelişki bilerek bırakıldı:
   tokens.json tasarım paketinin kendisi, ondaki satırı kod değiştirmez.
   Geometri sorusunda **Faz 2 geçerli**.
2. "Zemini olmayan bir görünümde `elevation` gölge çizmez" — bu ağaçta
   **yanlış**. Gölgeyi taşıyan sarmalayıcının rengi yok ama `borderRadius`ı
   var; RN o görünüme zaten bir arka plan çizimi (dolayısıyla outline)
   takıyor ve gölge zeminsiz de çiziliyor. İki release APK yan yana ölçülerek
   görüldü — önce "Android'de gölge hiç çizilmiyordu" diye yazılmıştı,
   ölçüm bunu çürüttü. Dolguyu katman değiştirmek GEREKMİYOR.

---

# İzin metinleri — KAMERA, MİKROFON, FACE ID, "ALWAYS" KONUM KAPALI

`app.json`'da bu dört alan bilerek `false`. JSON yorum kabul etmediği için
gerekçe burada.

Üç Expo eklentisi, prop verilmezse İNGİLİZCE VARSAYILAN bir kullanım metni
yazıyor — `applyPermissions` (@expo/config-plugins/ios/Permissions.js):

    infoPlist[permission] = permissions[permission] || infoPlist[permission] || description;

`false` verilince anahtar SİLİNİYOR; tek kapatma yolu bu.

Ölçüldü (2026-09-05, `expo config --type introspect`). ÖNCE altı kullanım
metni vardı, dördü uygulamanın YAPMADIĞI bir şeyi anlatıyordu:

| anahtar | değer | neden yanlıştı |
| --- | --- | --- |
| `NSMicrophoneUsageDescription` | "Allow $(PRODUCT_NAME) to access your microphone" | ses kaydı YOK; metin İngilizce |
| `NSFaceIDUsageDescription` | "Allow $(PRODUCT_NAME) to access your Face ID…" | `requireAuthentication` hiç kullanılmıyor |
| `NSLocationAlwaysUsageDescription` | "Allow $(PRODUCT_NAME) to access your location" | kod yalnız when-in-use istiyor |
| `NSCameraUsageDescription` | "…sohbette fotoğraf çekip gönderebilmeniz için…" | `launchCameraAsync` hiçbir yerde YOK |

SONRA iki metin kaldı (`NSPhotoLibraryUsageDescription`,
`NSLocationWhenInUseUsageDescription`) — ikisi de Türkçe ve ikisinin de
karşılığı kodda var.

Android tarafı aynı düğmelerden geliyor: `microphonePermission: false`
`RECORD_AUDIO`'yu, `cameraPermission: false` `CAMERA`'yı manifest birleşmesinde
`tools:node="remove"` ile eliyor. İkisi de introspect çıktısında doğrulandı.

## `locationAlwaysAndWhenInUsePermission` YETMİYOR

Bu alan zaten `false`'tu ama `NSLocationAlwaysUsageDescription` yine
yazılıyordu: `expo-location` eklentisinde bunlar İKİ AYRI prop
(`plugin/src/withLocation.ts`). İkisi de kapatılmalı.

## KAMERA GERİ İSTENİRSE

`cameraPermission`'ı geri açmak tek başına yanlış olur — metin "sohbette
fotoğraf çekip gönderebilmeniz için" diyor, o özellik yok. Önce
`launchCameraAsync` yolu yazılsın, izin metni ONDAN SONRA geri gelsin.
