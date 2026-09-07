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

Alan sınırı **4000 karakter**. Aşağıdaki metin **2642** — ilk taslak 4226 idi
ve sığmıyordu. İncelemeci dakikalarla çalışıyor: her madde bir yer tarif
ediyor, açıklama değil.

```
Gamerisen is a PC game discovery app with a social layer. Build 2.6.1 is a
substantial rewrite of 1.0 (build 8), which was rejected under 4.2.2 on 30 July
2026.

SIGN-IN IS OPTIONAL
Discovery, game details, price comparison, news and reading reviews and posts
all work without an account. The demo account is needed only for the social
features. It already has a friend, an open conversation, a review, a post, a
collection and a linked Steam library, so nothing is empty.

NO WEBVIEW
Every screen is native. Store links open in the system browser only when the
user taps one.

NATIVE FUNCTIONALITY (4.2.2) - WHERE TO FIND IT
1. Home Screen widget (WidgetKit): price drop, library stats, wishlist. Add it
   from the iOS widget gallery.
2. Share Extension: share a game link from Safari into the app via App Group.
3. On-device recommendation engine: time-decayed genre weights, works offline.
4. Swipe deck: Home tab > "For You". Native gestures on the UI thread, haptics.
5. Vertical trailer feed: Videos tab, three-player pool for gapless paging.
6. Steam library and friend graph: Profile tab > gear icon > connect Steam.
   Computes which games you and each friend can play together. Friends do not
   need to use Gamerisen.
7. Game cards: Settings > "Cards". Signed images showing your hours in a game
   and your rank among your friends.
8. Push notifications, Sign in with Apple, native photo picker with on-device
   resizing, and on-device reverse geocoding (only a city name is sent).

The "pick the games you like" first-launch screen from 1.0 has been removed;
personalisation now starts from the first interaction.

USER-GENERATED CONTENT (1.2)
- Filtering: prohibited-terms filter on text, Google Cloud Vision SafeSearch on
  every uploaded image. Video upload is disabled: we cannot moderate it yet.
- Reporting: "..." on any person, or long-press a post, review, list or message.
  Reports are reviewed within 24 hours.
- Blocking: same "..." menu. Mutual - no messages, content hidden both ways.
- Contact: https://www.gamerisen.com/support and support@gamerisen.com
- Community rules: section 4 of https://www.gamerisen.com/terms. Users agree on
  the sign-up screen, where both links sit directly under the button.
- Only friends can message each other. No random or anonymous chat.

ACCOUNT DELETION
Profile tab > gear icon > Delete Account. Password is re-verified, then the
account and all server-side data are permanently deleted.

NO DIGITAL SALES
Prices are shown for information only. There is no purchase flow in the app.

If anything is hard to find, write to support@gamerisen.com and we will reply
the same day.
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
