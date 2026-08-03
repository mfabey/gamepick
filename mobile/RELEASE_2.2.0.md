# 2.2.0 — App Store Connect metinleri

Bu dosya kopyala-yapıştır içindir. App Store Connect'te ilgili alanlara olduğu
gibi yapıştırın.

---

## What's New in This Version — Türkçe

```
Yeni keşif akışı
Anasayfadaki öneriler artık oyun içi görsellerle geliyor; her oyunun ne
olduğunu açıklamasıyla birlikte görüyorsunuz.

Daha sade bir anasayfa
Gereksiz başlıklar kaldırıldı, aradığınız içerik ilk ekranda.

Video akışı iyileştirmeleri
Yeni çıkan oyunlara öncelik verildi ve sıra her açılışta değişiyor.
Videoyu duraklatmak için tek dokunuş ya da basılı tutmak yeterli.

Düzeltmeler
• Oluşturulan koleksiyonların kaybolmasına yol açan hata giderildi
• Video sekmesinden çıkınca ses artık kesiliyor
• Kayıt ekranındaki takılma sorunu düzeltildi
• Sekme simgesine tekrar dokunmak sayfayı başa sarıyor
```

## What's New in This Version — English

```
New discovery feed
Home recommendations now come with in-game screenshots and a description of
what each game actually is.

A cleaner home screen
Removed the clutter so content is visible right away.

Video feed improvements
New releases are prioritised and the order changes each time you open the app.
Tap once or press and hold to pause a video.

Fixes
• Fixed collections disappearing after they were created
• Audio now stops when you leave the video tab
• Fixed sign-up getting stuck
• Tapping a tab icon again scrolls back to the top
```

---

## App Review Information → Notes

```
This build (2.2.0) is a substantial expansion over the previously reviewed
build (1.0 build 8) which was rejected under Guideline 4.2.2.

The app contains no WebView. Every screen is native.

Native functionality with no web equivalent:
1. Home Screen Widget (WidgetKit) — price drops for followed games
2. Share Extension — captures Steam links shared from Safari
3. On-device personalization — taste profile computed and stored locally,
   works offline
4. First-launch taste picker
5. Swipe discovery — Reanimated worklet gestures, trains the on-device model
6. Collections — offline-first, sync only when signed in
7. Weekly player report — computed entirely from on-device data
8. Vertical video feed — AVPlayer with a fixed player pool
9. Personalized discovery feed — ranked on device from the user's own signals
10. Friends and shared lists
11. Sign in with Apple, push notifications, haptics, Steam/Xbox library import

User-generated content safeguards (Guideline 1.2): server-side content
filtering, in-app reporting with response within 24 hours, user blocking, and
a published contact address at https://www.gamerisen.com/support

IMPORTANT: collections, wishlist, the weekly report and Steam/Xbox linking
require a signed-in profile. Please use the demo account below — without it a
large part of the app is not visible.
```

---

## App Review Information → Sign-in required

**İşaretleyin.** Demo hesabı bilgilerini girin.

Hesabın önceden hazırlanmış olması gerekenler:
- Kullanıcı adı alınmış olmalı (kayıt akışı zorunlu tutuyor)
- İçinde en az bir koleksiyon bulunsun
- İstek listesinde birkaç oyun olsun
- Mümkünse bir Steam hesabı bağlı olsun — kütüphane ekranı boş görünmesin

Boş bir demo hesabı, 4.2.2 açısından hiç hesap vermemek kadar riskli:
incelemeci giriş yapar ama yine boş ekranlar görür.

---

## Resolution Center yanıtı

`mobile/APPEAL_4.2.2.md` içindeki İngilizce metni olduğu gibi yapıştırın.
Build yüklendikten SONRA gönderin — red build 8'e verildi, yeni build
görünmeden yanıtın karşılığı olmaz.
