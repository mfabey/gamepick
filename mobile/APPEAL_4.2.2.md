# App Review yanıtı — Guideline 4.2.2

**Submission ID:** 94eca83f-306e-4648-9d2e-6dfc44a94854
**Reddedilen sürüm:** 1.0 (8) · inceleme 30 Temmuz 2026
**Gönderilecek sürüm:** 2.2.0

> Bu metni **App Store Connect → Resolution Center**'a yapıştırın.
> 4.2.2 redlerinde belirleyici olan şey, incelemeciye native işlevselliğin
> **nerede** olduğunu tek tek göstermektir — inceleme birkaç dakika sürüyor ve
> özellikler bulunamazsa aynı sonuç tekrarlanıyor.

---

## Yanıt metni (İngilizce — olduğu gibi kopyalayın)

Hello,

Thank you for the detailed feedback. We have substantially expanded the app's
native functionality since the reviewed build (1.0 build 8). The version now
submitted is **2.2.0**, and we would like to point out specifically where the
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

**9. Personalized discovery feed**
The home screen feed is generated from the user's own on-device signals — games
viewed, games added to their follow list, and the genre distribution of their
connected Steam library, weighted by hours played. Each entry shows an in-game
screenshot with the game's description. The ranking runs on the device.

**10. Friends and shared lists**
Users can find each other by username, send friend requests, see friends'
recent activity, and publish a collection as a public list. All of it is native.

**11. System integrations**
Sign in with Apple, push notifications for price drops on followed games,
haptic feedback throughout, and OAuth-based Steam and Xbox library import that
marks which games the user already owns.

### On the aggregation concern

Game metadata and pricing come from public APIs, but the app's value is not the
data — it is what the app does with it on the device: personal taste modeling,
ownership matching against the user's connected libraries, price-drop alerts,
personal collections, and the weekly report. None of this is available by
browsing those sources on the web.

### User-generated content safeguards (Guideline 1.2)

This version introduces social features, so we have implemented all four
required precautions:

- **Content filtering.** Usernames, list titles and descriptions pass through a
  server-side filter before they are stored. Reserved names are blocked.
- **Reporting.** Every user profile and published list has a report action; the
  report reaches us immediately and we act within 24 hours.
- **Blocking.** Users can block another user from that user's profile. A blocked
  user disappears from search, activity and lists in both directions.
- **Published contact.** Our support address is public at
  https://www.gamerisen.com/support (support@gamerisen.com).

We would be glad to walk through any specific screen if that would help. Thank
you for your time.

---

## Göndermeden önce yapılacaklar

1. **2.2.0 build'ini App Store Connect'e yükleyin** — red build 8'e verildi,
   yeni build yüklenmeden yanıtın karşılığı olmaz.
2. **App Review Information → Notes** alanına yukarıdaki listenin kısa bir
   özetini yazın. İncelemeci önce oraya bakıyor.
3. **Demo hesabı verin.** 2.2.0 ile koleksiyonlar, istek listesi, haftalık rapor
   ve Steam/Xbox bağlama **profil oluşturmadan görünmüyor**. İncelemeci hesap
   açmazsa uygulamanın yarısını göremez — bu, 4.2.2 açısından doğrudan risk.
   Hazır bir e-posta/şifre girin ve kullanıcı adının önceden alınmış olmasına
   dikkat edin.
4. **Mağaza görsellerini güncelleyin.** Mevcut ekran görüntüleri v1 ekranlarını
   gösteriyor. Swipe, video akışı, gönderi akışı ve haftalık rapor ekranlarını
   eklemek "native deneyim" izlenimini daha listeleme sayfasında veriyor.
5. **Widget ve Share Extension'ı cihazda test edin.** İkisi de hâlâ cihazda
   doğrulanmadı; incelemeci deneyip çalışmazsa durum daha kötü olur.
6. **App Privacy bölümünü güncelleyin.** Sosyal özelliklerle birlikte artık
   kullanıcı adı, arkadaş listesi ve etkinlik verisi topluyorsunuz. Beyan
   eksikse bu ayrı bir ret sebebi (Guideline 5.1.1).

## Dürüst risk notu

Yanıt metni güçlü ama tek başına yeterli olmayabilir: 4.2.2 öznel bir
değerlendirme ve aynı incelemeciye denk gelmeyebilirsiniz. En güçlü kanıt
metin değil, **incelemecinin uygulamayı açtığında ilk ekranda kişiselleştirme ve
native etkileşim görmesi.**

Bu sürümde iki yeni risk var:

- **Guideline 5.1.1(v).** Koleksiyon ve istek listesi artık profil arkasında
  kilitli, oysa ikisi de tamamen cihazda çalışıyor ve hesap gerektirmiyor.
  Apple hesap gerektirmeyen özellikler için kayıt zorunluluğuna itiraz
  edebiliyor. Bu maddeden ret gelirse çözüm basit: o iki karonun kilidini
  kaldırıp Steam/Xbox bağlamayı kilitli bırakmak yeterli.
- **Sign in with Apple çalışmıyor.** Firebase `INVALID_IDP_RESPONSE` dönüyor.
  Guideline 4.8 gereği e-posta girişi sunulduğunda Apple girişi de çalışmak
  zorunda. **Gönderimden önce mutlaka düzeltilmeli** — incelemeci bunu
  deneyecektir.
