# Telefon ve tablet yerleşimi — 13 Eylül 2026

## Temel hata ve düzeltme

`useYanBosluk()` yalnız geniş ekran kolonunu ortalar; telefonda sıfır verir.
Ekranın `styles.body` veya `styles.list` dolgusu bu sıfırla ezilince içerik
kenarlara yapışıyordu. Doğru toplam `yan + ekranın mevcut kenar payı`.
Ortak kancanın anlamı değiştirilmedi: bazı akışlar kendi satır dolgularını taşır.

| Alan | Tespit / sonuç |
| --- | --- |
| Profil düzenleme | 20 birimlik telefon dolgusu korundu. |
| Topluluk listeleri / liste detayı | 12 / 20 birimlik dolgu korundu; liste sekmeleri tablette başlıkla aynı kolona alındı. |
| Koleksiyonlar / koleksiyon detayı | 12 / 20 birimlik dolgu korundu. |
| Arkadaşlar / arkadaşlık istekleri | 20 birimlik dolgu korundu. |
| İstatistik | 16 birimlik dolgu korundu. |
| Ayarlar / gizlilik / giriş | Önceki düzeltmeler korundu ve yerleşim kontrolüne dahil edildi. |
| Kullanıcı adı oluşturma / hesap silme | Tablet kolon sınırı eklendi, telefonun mevcut dolgusu korundu. |
| Avatar seçimi | Tablet genişliği sınırlandı; kısa ekranda içerik kaydırılabilir, alt güvenli alan korunur. |
| Seçim, filtre, GIF, kişi, koleksiyon, paylaşım, şikâyet ve yazma pencereleri | Ortak `SHEET_LAYOUT`: telefon genişliğine sığar, tablette en fazla 640 birim. |
| Ana akış oyun görseli | Yükseklik ekran genişliğinden değil, kartın gerçek genişliğinden `aspectRatio` ile türetilir. |
| Başka kullanıcının profil ızgarası | Sütun sayısı değişince satırlar yeniden hesaplanır. Kendi profilindeki mevcut düzeltme korunur. |
| Kaydırarak keşif | Kart genişliği telefon kenar paylarına uyar; tablette 420 × 560 sınırı vardır. Jest ölçüsü pencere değişimini izler. |
| Oyun ekran görüntüsü görüntüleyicisi | Pencere genişliği değişince ölçü yeniden okunur. |

## İncelenip mevcut geometrisi korunan alanlar

- Ana sayfa ve topluluk akışı: satır/bileşenler kendi kenar paylarını taşıyor.
- Mesajlar, haberler, oyun kartları ve Steam arkadaşları: satırların kendi
  dolgu veya kenar payı var; listeye ikinci telefon dolgusu eklenmedi.
- Oyunlar, kütüphane ve keşif: sütun sayısı pencere genişliğine göre artıyor.
- Kendi profilinin kapak ızgarası: üçten başlayan sütun sayısı ekranla artıyor.
- Video, sohbet, kapak geçişi ve konuma bağlı menüler: tam ekran koordinatları
  korunuyor. Ekran kökünü daraltmak ölçülen konumlarla görünümü ayırırdı.
- Genel yazı ölçeği, erişilebilirlik yazı büyütmesi, sekme çubuğu ölçüleri,
  API çağrıları ve oturum işleyişi değiştirilmedi.

## Doğrulama

- `npm run check`: mevcut kontroller ve yeni `check:layout`.
- `check:layout`: 12 form/liste ekranında 320, 360, 375, 390, 430, 600, 640,
  768, 820, 1024 ve 1366 birim genişlikte gerçek dolgu ifadeleri; pencere
  sınırları, kapak ızgarasının genişliği, sütun bağımlılıkları ve görsel oranı.
- Expo export: iOS ve Android Hermes paketleri başarıyla üretildi.
- Fiziksel cihaz/emülatör üzerinde görsel kontrol yapılmadı. Yayın öncesi
  dar telefon, normal telefon ve tablette profil düzenleme, listeler, avatar
  seçimi, büyük sistem yazısı ve ekran döndürme kontrol edilmeli.

## Dağıtım

Değişiklikler JavaScript/yerleşim kapsamındadır. Native paket, izin veya runtime
değişmedi. Uyumlu runtime ve kanaldaki mevcut build'e EAS Update ile gönderilebilir.
GitHub push işlemi tek başına OTA yayınlamaz.
