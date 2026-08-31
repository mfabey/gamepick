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

## Android sekme çubuğu — ŞİMDİLİK YAZILMIYOR

Faz 2 Android için ayrı bir çubuk tarif ediyor (r20, opak yüzey + elevation
18, 72×48 köşeli vurgu, ikon 22, basınca şekil morfu). Projede `android/`
dizini ve `google-services.json` yok; kod yazılsa **doğrulanamaz**.

Bu deponun kuralı: doğrulayamadığın işi tamamlanmış gibi raporlama.
Ölçüler Faz 2 belgesinde duruyor — Android hedefi derlenince tek oturumda
uygulanabilir.

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
