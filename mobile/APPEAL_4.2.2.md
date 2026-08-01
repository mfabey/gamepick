# App Review yanıtı — Guideline 4.2.2

**Submission ID:** 94eca83f-306e-4648-9d2e-6dfc44a94854
**Reddedilen sürüm:** 1.0 (8) · inceleme 30 Temmuz 2026
**Gönderilecek sürüm:** 2.0.0 (build 22)

> Bu metni **App Store Connect → Resolution Center**'a yapıştırın.
> 4.2.2 redlerinde belirleyici olan şey, incelemeciye native işlevselliğin
> **nerede** olduğunu tek tek göstermektir — inceleme birkaç dakika sürüyor ve
> özellikler bulunamazsa aynı sonuç tekrarlanıyor.

---

## Yanıt metni (İngilizce — olduğu gibi kopyalayın)

Hello,

Thank you for the detailed feedback. We have substantially expanded the app's
native functionality since the reviewed build (1.0 build 8). The version now
submitted is **2.0.0**, and we would like to point out specifically where the
native, non-web functionality lives.

**The app contains no WebView.** No part of the interface renders web content.
Every screen is built with native iOS components. Links to external stores open
in the system browser only when the user explicitly chooses to visit a store
page to make a purchase.

### Functionality that cannot exist in a web browsing experience

**1. Home Screen Widget (WidgetKit)**
The app ships a Home Screen widget that shows price drops for the games the user
follows. This is a native iOS extension and has no web equivalent.

**2. Share Extension**
The app registers a Share Extension. When the user shares a Steam store link
from Safari or any other app, our extension captures it, extracts the game, and
adds it to the app through a shared App Group container.

**3. On-device personalization engine**
The app builds a taste profile entirely on the device. Genre interest is stored
with time-decayed weights and recomputed locally on every interaction. This data
never leaves the device and the profile continues to work with no network
connection.

**4. First-launch taste picker**
On first launch the user picks games they enjoy through a native selection
screen. Recommendations are personalized from that moment onward.

**5. Swipe discovery**
A card-deck interface driven by native gestures. The gesture runs entirely on
the UI thread through Reanimated worklets, so the interaction stays at 60fps.
Swiping right or left trains the on-device recommendation model in real time,
with undo support.

**6. Collections**
Users create and manage their own game lists. Collections are stored on the
device first and remain fully usable offline; they sync to the account only when
the user is signed in.

**7. Weekly player report**
A weekly summary (games discovered, decisions made, top genre, average discount
in the user's follow list) computed **entirely from on-device data**. Nothing is
sent to a server to produce it.

**8. Vertical video feed**
A full-screen native video feed using AVPlayer with a fixed player pool and
neighbor pre-buffering for smooth, uninterrupted playback.

**9. System integrations**
Sign in with Apple, push notifications for price drops on followed games,
haptic feedback throughout, and OAuth-based Steam and Xbox library import that
marks which games the user already owns.

### On the aggregation concern

Game metadata and pricing come from public APIs, but the app's value is not the
data — it is what the app does with it on the device: personal taste modeling,
ownership matching against the user's connected libraries, price-drop alerts,
personal collections, and the weekly report. None of this is available by
browsing those sources on the web.

We would be glad to walk through any specific screen if that would help. Thank
you for your time.

---

## Göndermeden önce yapılacaklar

1. **Build 22'yi (2.0.0) App Store Connect'e gönderin** — red build 8'e verildi,
   yeni build yüklenmeden yanıtın karşılığı olmaz.
2. **App Review Information → Notes** alanına yukarıdaki listenin kısa bir
   özetini yazın. İncelemeci önce oraya bakıyor.
3. **Mağaza görsellerini güncelleyin.** Mevcut ekran görüntüleri v1 ekranlarını
   gösteriyor. Swipe, video akışı ve haftalık rapor ekranlarını eklemek, 4.2.2
   açısından "native deneyim" izlenimini daha listeleme sayfasında veriyor.
4. **Widget ve Share Extension'ı cihazda test edin.** İkisi de TestFlight'ta
   doğrulanmadı; incelemeci deneyip çalışmazsa durum daha kötü olur.

## Dürüst risk notu

Yanıt metni güçlü ama tek başına yeterli olmayabilir: 4.2.2 öznel bir
değerlendirme ve aynı incelemeciye denk gelmeyebilirsiniz. En güçlü kanıt
metin değil, **incelemecinin uygulamayı açtığında ilk ekranda kişiselleştirme ve
native etkileşim görmesi.** Onboarding akışının ilk açılışta çalıştığından emin
olun — v1'de "Senin İçin" bölümü soğuk başlangıçta gizleniyordu ve incelemeci
büyük ihtimalle kişiselleştirmeyi hiç görmedi.
