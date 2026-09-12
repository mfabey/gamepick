# App Store listeleme metinleri

App Store Connect'e **kopyala-yapıştır** için hazır. Karakter limitleri
`node` ile ölçüldü, tahmin edilmedi. Türkçe birincil dil, İngilizce ikincil.

> ⚠️ **Apple 3.1.1 notu:** Metinlerde bilinçli olarak "Steam'den satın al" gibi
> **harekete geçirici** ifade yok. Mağaza fiyatları yalnızca *bilgi* olarak
> anlatılıyor. Bunu bozacak cümle eklemeyin — metadata da bu kurala tabidir.

> ⚠️ **Görsel yükleme metinde YOK.** Bu sürümde kullanıcı görsel yüklemesinin
> tamamı kapalı (`app/lib/media-moderation.js` → `USER_UPLOADS_ENABLED`):
> sohbet fotoğrafı, sohbet videosu ve profil fotoğrafı. Sohbet metin +
> oyun kartı, profil avatarı hazır setten. Özellik geri açılmadan metne
> eklemeyin — çalışmayan özelliği yazmak ret sebebi.

**Sürüm 2.6.x için yenilendi.** Uygulama v1'deki fiyat karşılaştırma
uygulamasından çıkıp sosyal katmanlı bir keşif uygulamasına döndü; metinler
buna göre yeniden yazıldı.

---

## 🇹🇷 Türkçe

### Uygulama adı (limit 30) — 28
```
Gamerisen: Oyun & Arkadaşlar
```
*Alternatifler: `Gamerisen: Oyun Keşfi & Sohbet` (30) · `Gamerisen: Oyuncu sosyal ağı` (28)*

### Alt başlık (limit 30) — 29
```
Keşfet, paylaş, birlikte oyna
```
*Alternatifler: `Oyuncu arkadaşlarınla keşfet` (28) · `Sıradaki oyununu birlikte bul` (29)*

### Promosyon metni (limit 170 — inceleme olmadan güncellenebilir) — 155
```
Steam arkadaşlarını bul, ortak oyunlarınızı gör, sohbet et. Fiyatları karşılaştır, indirim düşünce haberin olsun. Hesap açmadan keşfetmeye başlayabilirsin.
```

### Anahtar kelimeler (limit 100) — 97
```
indirim,fiyat,steam,epic,gog,pc,kütüphane,sohbet,inceleme,liste,fragman,oyuncu,takip,fırsat,co-op
```
*Ad ve alt başlıktaki kelimeler (oyun, arkadaş, keşfet, paylaş) bilerek
tekrarlanmadı — Apple onları zaten indeksliyor.*
*`steam,epic,gog` üçüncü taraf markası; Apple bazen çıkartıyor.
**KARAR (2026-09-08): kalıyor.** Apple çıkartırsa yedek:
`oyun keşfi,ortak oyun,indirim takibi`.*

### Açıklama (limit 4000) — 2898
```
Gamerisen, PC oyunlarını keşfetmenin ve oyuncu arkadaşlarınla paylaşmanın yeni yolu. Hesap açmadan gezinmeye başla; sosyal özellikler sen istediğinde devreye girsin.

ARKADAŞLARINLA BİRLİKTE
Kullanıcı adınla bir profil oluştur, arkadaş ekle, kimin ne oynadığını gör. Steam hesabını bağlarsan Steam arkadaşların otomatik bulunur — onların Gamerisen kullanıyor olması gerekmez. Kütüphaneleriniz karşılaştırılır ve birlikte oynayabileceğiniz oyunlar öne çıkarılır.

MESAJLAŞ
Arkadaşlarınla birebir sohbet et: anlık mesajlaşma ve bildirim. Yalnızca arkadaşların sana yazabilir; yabancıdan mesaj gelmez. Her mesaj ve profil raporlanabilir, dilediğin kullanıcıyı engelleyebilirsin.

TOPLULUK
Oynadığın oyunlar hakkında inceleme yaz, başkalarının incelemelerine yanıt ver, tartışma akışında düşünceni paylaş. Okumak için hesaba gerek yok.

OYUN VİDEOLARI
Dikey akışta oyun fragmanlarını kaydırarak izle; ilgini çekeni tek dokunuşla listene ekle.

SANA ÖZEL ÖNERİLER
Uygulama zevkini cihazında öğrenir. İncelediğin oyunlar, kaydırma tercihlerin, listelerin ve bağladığın Steam kütüphanendeki oynama saatlerin birlikte değerlendirilir. Sahip olduğun ve daha önce gördüğün oyunlar geri plana atılır; her açılışta taze içerik bulursun.

FİYATLARI KARŞILAŞTIR
Bir oyunun Steam, Epic Games, GOG ve Humble Bundle fiyatlarını yan yana gör. İndirim oranı ve eski fiyat birlikte gösterilir. Fiyatlar yalnızca bilgi amaçlıdır.

FİYAT DÜŞÜNCE HABERİN OLSUN
Takip listene eklediğin bir oyun indirime girdiğinde bildirim al.

IPHONE'A ÖZEL
Ana ekran widget'ı takip ettiğin oyunların fiyat düşüşlerini uygulamayı açmadan gösterir. Safari'de karşına çıkan bir oyun bağlantısını paylaş menüsünden doğrudan Gamerisen'e ekleyebilirsin.

OYUNU YAKINDAN TANI
Ekran görüntüleri, fragman, açıklama, Metacritic puanı ve Steam topluluk incelemelerinin analizi tek sayfada. "Çok Olumlu · %92 olumlu" gibi net bir özetle oyunun gerçekte nasıl karşılandığını gör.

KÜTÜPHANENİ BAĞLA
Steam ve Xbox hesabını bağla, tüm oyunlarını tek yerde gör; oynama saatlerini ve kütüphanenin değerini öğren. Sahip olduğun oyunlar önerilerden otomatik çıkarılır.

OYUN KARTLARI VE HAFTALIK RAPOR
Kütüphanenden paylaşılabilir kartlar üret: bir oyunda kaç saatin olduğunu ve arkadaşların arasında kaçıncı sırada durduğunu gösteren kartlar. Haftalık raporun ne kadar keşfettiğini özetler.

KOLEKSİYONLAR VE LİSTELER
Oyunları kendi listelerinde topla, koleksiyonlarını profilinde paylaş, başkalarının listelerini keşfet.

GİZLİLİK VE GÜVENLİK
Aktiviteni yalnızca arkadaşların görür; bunu ayarlardan tamamen kapatabilirsin. Konum isteğe bağlıdır ve yalnızca paylaştığın karta şehir adı eklemek için kullanılır — koordinatın cihazından çıkmaz. Engellediğin kullanıcı seni bulamaz, sana yazamaz. Hesabını uygulama içinden kalıcı olarak silebilirsin.

Gamerisen bir keşif ve katalog uygulamasıdır; uygulama içinde dijital satış yapılmaz.
```

---

## 🇬🇧 English

### App name (limit 30) — 26
```
Gamerisen: Games & Friends
```
*Alternative: `Gamerisen: Game Deals & Chat` (28)*

### Subtitle (limit 30) — 30
```
Discover, share, play together
```
*Alternative: `Find games, find your squad` (27)*

### Promotional text (limit 170) — 144
```
Find your Steam friends, see the games you both own, and chat about them. Compare prices, get drop alerts. No account needed to start exploring.
```

### Keywords (limit 100) — 99
```
deals,price,steam,epic,gog,pc,library,chat,review,list,trailer,gamer,wishlist,co-op,backlog,tracker
```

### Description (limit 4000) — 2908
```
Gamerisen is a new way to discover PC games and share them with your gaming friends. Start browsing without an account; the social features switch on whenever you want them.

WITH YOUR FRIENDS
Create a profile with a username, add friends, and see what everyone is playing. Connect Steam and your Steam friends are found automatically — they do not need to use Gamerisen. Your libraries are compared and the games you can play together are surfaced first.

MESSAGES
One-to-one chat with your friends: instant messaging and push notifications. Only friends can message you, so nothing arrives from strangers. Every message and profile can be reported, and you can block any user.

COMMUNITY
Write reviews of the games you play, reply to other people's reviews, and post your take in the discussion feed. No account needed to read.

GAME VIDEOS
Swipe through game trailers in a vertical feed and add anything that catches your eye to a list with one tap.

PICKED FOR YOU
The app learns your taste on your device. The games you open, your swipes, your lists and the playtime in your connected Steam library are weighed together. Games you already own or have already seen move down, so there is something fresh every time you open the app.

COMPARE PRICES
See a game's price on Steam, Epic Games, GOG and Humble Bundle side by side, with the discount and the original price shown together. Prices are shown for information only.

KNOW WHEN THE PRICE DROPS
Add a game to your wishlist and get a notification when it goes on sale.

BUILT FOR IPHONE
A Home Screen widget shows price drops for the games you follow without opening the app. Share a game link you find in Safari straight into Gamerisen from the share sheet.

GET TO KNOW THE GAME
Screenshots, trailer, description, Metacritic score and a breakdown of Steam community reviews on a single page — a clear summary like "Very Positive · 92% positive" tells you how the game was really received.

CONNECT YOUR LIBRARY
Link your Steam and Xbox accounts to see every game in one place, along with playtime and the value of your library. Games you own are removed from recommendations automatically.

GAME CARDS AND YOUR WEEKLY REPORT
Generate shareable cards from your library showing your hours in a game and where you rank among your friends. Your weekly report sums up how much you explored.

COLLECTIONS AND LISTS
Group games into your own lists, share your collections on your profile, and discover lists made by others.

PRIVACY AND SAFETY
Only your friends see your activity, and you can turn that off entirely in settings. Location is optional and is used only to add a city name to a card you share — your coordinates never leave the device. A blocked user cannot find you or message you. You can permanently delete your account from inside the app.

Gamerisen is a discovery and catalog app. No digital goods are sold inside the app.
```

---

## Doldurulacak diğer alanlar

| Alan | Değer |
|---|---|
| Birincil kategori | **Entertainment** |
| İkincil kategori | **Social Networking** |
| Gizlilik politikası URL | https://www.gamerisen.com/privacy |
| Destek URL | https://www.gamerisen.com/support |
| Telif | `2026 Gamerisen` |

Yaş sınırı anketi, App Privacy etiketleri ve App Review notları için
`STORE.md`'ye bak — sosyal katmanla birlikte hepsi değişti.
