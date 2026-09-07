# App Review Information — 2.6.1

App Store Connect → sürüm sayfası → **en alt** → *App Review Information*.
Buradaki her iddia koddan doğrulandı (2026-09-07). **Kod değişirse burayı güncelle.**

`APPEAL_4.2.2.md` bu belgeyle **geçersiz kaldı**: orada anlatılan "ilk açılışta
oyun seçme ekranı" `8d48ec3` ile kaldırıldı.

---

## 1. Form alanları

| Alan | Değer |
|---|---|
| Sign-In required | **Evet** — demo hesap veriliyor (sosyal katman hesapsız görülemiyor) |
| User name | *(hazırlanacak demo hesabın e-postası)* |
| Password | *(demo hesabın şifresi)* |
| Contact — First/Last name | *(senin adın)* |
| Contact — Phone | *(telefon)* |
| Contact — Email | `support@gamerisen.com` ya da kendi adresin |
| Notes | Aşağıdaki İngilizce metin |
| Attachment | Gerekmiyor |

> "Sign-In required" kutusunu işaretlemek uygulamanın hesapsız çalışmadığı
> anlamına gelmiyor; incelemeciye giriş bilgisi verilebilmesinin tek yolu bu.
> Notta hesapsız kullanımın açık olduğu ayrıca yazıyor.

---

## 2. Demo hesap — gönderimden ÖNCE hazırlanacak

Sosyal özelliklerin hiçbiri tek ve boş bir hesapla görünmüyor. İncelemeci
arkadaşı olmayan bir hesapla girerse Mesajlar sekmesi boş açılır ve
"özellik çalışmıyor" sonucuna varır. Bu yüzden **iki hesap** gerekiyor.

- [ ] **A hesabı** (incelemeciye verilecek) ve **B hesabı** (karşı taraf) oluştur
- [ ] B'den A'ya arkadaşlık isteği gönder, A'dan kabul et
- [ ] B'den A'ya **3-5 mesaj** yaz — sohbet dolu açılsın, bir de fotoğraf gönder
- [ ] A ile bir **inceleme** yaz, bir **gönderi** paylaş, bir **koleksiyon/liste** oluştur
- [ ] A'nın takip listesine birkaç oyun ekle (fiyat karşılaştırma ve widget dolsun)
- [ ] A'ya bir **Steam hesabı bağla** — kütüphane, Steam arkadaşları, oyun
      kartları ve haftalık rapor ancak böyle doluyor

⚠️ **Steam bağlama kararı senin.** Bağlarsan o Steam hesabının kütüphanesi ve
arkadaş listesi incelemeciye görünür. Kendi hesabını vermek istemiyorsan
oyunları herkese açık, birkaç oyunlu ayrı bir Steam hesabı yeterli — ama
tamamen bağlamazsan 4.2.2 argümanının en güçlü maddelerinden biri (kütüphane
senkronu + ortak oyun hesabı) ekranda boş görünür.

---

## 3. Notes — App Store Connect'e yapıştırılacak metin

```
Hello,

Gamerisen is a PC game discovery app with a social layer. This build (2.6.1) is
a substantial rewrite of version 1.0 (build 8), which was rejected under
Guideline 4.2.2 on 30 July 2026.

DEMO ACCOUNT
The account we provided already has a friend, an active conversation, a
published review, a post, a collection and a linked Steam library, so every
social feature is populated the moment you sign in.

Signing in is NOT required to use the app. Discovery, game details, price
comparison, news, and reading reviews and posts all work without an account. An
account is required only to post, message or add friends.

NO WEBVIEW
No screen in the app renders web content. Every view is built with native iOS
components. Store links open in the system browser only when the user
explicitly taps one.

WHERE THE NATIVE FUNCTIONALITY IS (Guideline 4.2.2)

1. Home Screen widget (WidgetKit). Three widget types: a price drop for a game
   you follow, your library stats (value, number of games, hours, last played),
   and your wishlist. Add it from the iOS widget gallery on the Home Screen.

2. Share Extension. Share a game link from Safari or any other app; our
   extension captures it and hands it to the app through a shared App Group
   container.

3. On-device recommendation engine. Genre interest is stored with time-decayed
   weights on the device and recomputed locally on every interaction. It keeps
   working with no network connection.

4. Swipe discovery. Home tab > "For You" opens a card deck driven by native
   gestures (Gesture Handler + Reanimated) running on the UI thread, with
   haptic feedback on each decision.

5. Vertical video feed. Videos tab. A native player with a three-player pool so
   paging between trailers is gapless.

6. Steam library and friend graph. Profile tab > gear icon > connect Steam. The
   app reads your library and your Steam friends' libraries and computes which
   games you can play together. Your friends do not need to use Gamerisen.

7. Shareable game cards. Settings > "Cards". Server-generated, HMAC-signed
   images showing your hours in a game and your rank among your friends — a
   number Steam itself does not show.

8. Push notifications for price drops and new messages.

9. Sign in with Apple, native photo picker with on-device image resizing, and
   on-device reverse geocoding for the optional city tag (coordinates never
   leave the device; only a city name is sent).

Please note: version 1.0 had a "pick the games you like" first-launch screen.
It has been removed. Personalisation now begins from the first interaction.

USER-GENERATED CONTENT (Guideline 1.2)

- Filtering. Text is checked against a prohibited-terms filter. Every uploaded
  image passes Google Cloud Vision SafeSearch before it is published. Video
  upload is deliberately disabled because we cannot moderate video yet.

- Reporting. A report option is available on users, posts, reviews, lists and
  individual messages — tap the "..." button on a person, or long-press a piece
  of content. Reports are reviewed within 24 hours.

- Blocking. The same "..." menu on any person row or profile. Blocking is
  mutual: a blocked user cannot message you, and your content is hidden from
  each other in both directions.

- Published contact information. https://www.gamerisen.com/support and
  support@gamerisen.com

- Community rules. Section 4 of https://www.gamerisen.com/terms sets out a
  zero-tolerance policy for objectionable content and abusive behaviour, the
  enforcement steps, and the 24-hour review commitment. Users agree to it on the
  sign-up screen, where the Terms and the Privacy Policy are both linked
  directly under the button.

- Only friends can message each other. There is no random or anonymous chat.

ACCOUNT DELETION
Profile tab > gear icon (top right) > Delete Account. The password is
re-verified, then the Firebase account and all server-side data are permanently
deleted.

NO DIGITAL SALES
Gamerisen does not sell anything. Prices are shown for information only and
there is no purchase flow of any kind inside the app.

Thank you for your time. If anything is hard to find, please write to
support@gamerisen.com and we will reply the same day.
```

---

## 4. Metindeki iddiaların dayanağı

| İddia | Kaynak |
|---|---|
| WebView yok | `mobile/package.json` — `react-native-webview` bağımlılığı yok |
| Widget üç tür | `plugins/ios-widget/GamerisenWidget.swift` — `DealWidgetView`, `StatsWidgetView`, `WishlistWidgetView` |
| Share Extension | `plugins/ios-share-extension/ShareViewController.swift` + `app.json` appExtensions |
| "For You" → deste | `app/(tabs)/index.jsx:338` → `/swipe` |
| Kartlar / Rapor | `app/settings.jsx:204,206` — etiketler `prof.gCards` / `prof.gStats` |
| Rapor yüzeyi | `ReportSheet` altı ekranda: ana sayfa, topluluk, sohbet, arkadaşlar, liste detayı, kullanıcı profili |
| Engelleme menüsü | `src/components/PersonMenu.jsx` — "⋯", uzun basma kısayolu da duruyor |
| Hesap silme yolu | `app/(tabs)/profile.jsx:383` → `/settings` → `app/settings.jsx:291` → `/delete-account` |
| Video yükleme kapalı | `app/api/social/chat/media/route.js:106` → `VIDEO_DISABLED` |
| Zevk seçici kaldırıldı | commit `8d48ec3` |

---

## 5. Gönderimden önce son kontrol

- [ ] Demo hesap hazır ve **giriş yapılabildiği test edildi**
- [ ] `MODERATION_PROVIDER` + `GOOGLE_VISION_API_KEY` Vercel'de tanımlı —
      tanımsızsa fotoğraf gönderimi tamamen kapalı olur ve incelemeci
      "medya çalışmıyor" der
- [ ] `CARD_SECRET`, `PUSHER_*`, `BLOB_READ_WRITE_TOKEN`, `STEAM_API_KEY` tanımlı
- [ ] Gizlilik politikasına Google Vision ve Groq eklendi (bkz. `STORE.md`)
- [ ] App Privacy formu yayınlandı (**Publish** basıldı)
- [ ] Yaş sınırı anketi 13+ çıktı
