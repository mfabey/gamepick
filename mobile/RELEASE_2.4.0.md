# Gamerisen 2.4.0

Sosyal katman sürümü. Uygulamanın ağırlık merkezi oyun katalogundan
**oyuncunun kendi kütüphanesine** kayıyor — Apple'ın 4.2.2 gerekçesine
("content aggregated from the Internet") doğrudan cevap veren değişiklik bu.

## Yenilikler

### Steam arkadaşları ve ortak kütüphane
Steam arkadaş grafiği içeri alınıyor. Arkadaşın Gamerisen'i **kurmuş olması
gerekmiyor** — kütüphane kesişimi Steam'in herkese açık verisinden hesaplanıyor.

Ölçüm (13 arkadaşlı gerçek hesap): kütüphanelerin %92,3'ü okunabilir, arkadaş
başına ortalama **13,1 ortak oyun**, bunların 8,3'ü birlikte oynanabilir.

Sıralama co-op önceliklidir. Saate göre sıralandığında her arkadaşta aynı oyun
(Counter-Strike 2) tepeye çıkıyordu; co-op süzgeciyle liste çeşitleniyor.

### Oyun kartları
Kütüphaneden hesaplanan, paylaşılabilir istatistik kartları.

> Counter-Strike 2 — 2614 saat — arkadaşların arasında 2/9

Sıralama **on üç ayrı özel kütüphanenin** karşılaştırılmasıyla çıkıyor; Steam
bu sayıyı göstermiyor. Kart görseli sunucuda üretiliyor ve HMAC ile imzalanıyor.

### Mesajlaşma
Arkadaşlar arasında birebir sohbet. Anlık teslim (Pusher), fotoğraf ve
15 saniyeye kadar video, push bildirimi.

Yalnızca arkadaşlar yazışabiliyor — yabancıdan spam gelmiyor. Mesajlar
raporlanabiliyor, engelleme her durumda kazanıyor.

### Şehir etiketi (isteğe bağlı)
Paylaşılan karta şehir eklenebiliyor. **Koordinat telefondan çıkmıyor:** ters
coğrafi çözümleme cihazda yapılıyor, sunucuya yalnızca şehir adı gidiyor.
Varsayılan kapalı, arka plan takibi yok.

## Bu sürüm neden OTA değil

Dört yeni native modül var: `@react-native-community/netinfo` (Pusher),
`expo-image-picker`, `expo-image-manipulator`, `expo-location`.

`runtimeVersion` politikası `appVersion` olduğu için 2.4.0'a çıkmak, 2.3.0
kurulumlarına giden OTA yolunu kesiyor. Bu kaçınılmaz — yeni native kod eski
ikili dosyada yok.

## Sunucu tarafı gereksinimleri

Bu sürüm çalışmadan önce Vercel'de tanımlı olmalı:

| Değişken | Olmazsa ne olur |
|---|---|
| `CARD_SECRET` | Kart paylaşımı kapalı (düğme görünmez) |
| `PUSHER_*` (4 adet) | Sohbet çalışır ama anlık değil; ekran açılışında yükler |
| `BLOB_READ_WRITE_TOKEN` | Medya gönderimi kapalı |
| `MODERATION_PROVIDER` | Medya gönderimi kapalı — **bilinçli** |
| `STEAM_API_KEY` | Steam arkadaşları ve kartlar çalışmaz |

`MODERATION_PROVIDER` tanımlı değilken medya yüklemesi reddediliyor. Bu bir
eksiklik değil, karar: kullanıcıların birbirine görsel gönderebildiği bir
sistemi denetim olmadan işletmek, tespit ve bildirim yükümlülüğünü hiçbir
kontrol olmadan üstlenmek demek.

## Doğrulama durumu

Sunucu tarafı **77 birim testiyle** kapsandı: kart hesabı ve sıralama (22),
imzalama (16), sohbet veri katmanı (27), medya adres koruması (12).

**Mobil ekranların hiçbiri çizilerek doğrulanmadı** — geliştirme Windows'ta
yapıldı. Klavye davranışı, ters sohbet listesi, konum izni akışı, paylaşım
sayfası ve anlık teslim ilk kez bu build'de görülecek.
