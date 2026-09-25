# Gamerisen web tasarımı

## Masaüstü revizyonu — 26 Eylül 2026

Kullanıcının beğendiği mobil görünüm korunarak PC arayüzü Apple'ın sade yüzey
ve tipografi yaklaşımına yaklaştırıldı. Görsel referans:
[Apple Arcade](https://www.apple.com/apple-arcade/). Apple logosu, görselleri
veya özel font dosyaları kopyalanmadı; Gamerisen kırmızısı korundu.

- `app/desktop.css` içindeki **bütün kurallar** `min-width: 1024px` altında.
  1024 pikselden dar görünüm mevcut `redesign.css` ile devam eder.
- Masaüstünde sistem fontları, daha ferah başlıklar, yuvarlatılmış vitrin ve
  kartlar, kapsül düğmeler ve hafif gölgeler kullanılır.
- Üst menüde destekleyen tarayıcılarda buzlu cam; desteklemeyenlerde düz yüzey.
  Başlığın yüksekliği korunur; katalog ve video yerleşimlerinin mevcut
  yükseklik hesapları değişmez.
- Katalog, topluluk, hesap kartları ve altbilgi aynı masaüstü stilini paylaşır.
  Yeni animasyon eklenmedi; geçişler azaltılmış hareket tercihine uyar.
- 390 pikselde menü, başlık, arama, vitrin ve oyun kapağının hesaplanan
  font/renk/köşe/boşluk değerleri önceki sürümle birebir karşılaştırıldı.
  1024 ve 1440 pikselde ana sayfada yatay taşma görülmedi; iki tema incelendi.
- Üretim derlemesi (`npm run build`) başarılı; erişim politikası ve CORS
  denetimleri geçti, 107 sayfa üretildi.
- Değişiklik yalnızca bir CSS katmanı ve layout içindeki import'tur; React
  bileşenlerinin işleyişi, API'ler ve mobil uygulama dosyaları değişmez.

## Tasarım yönü — 25 Eylül 2026

Mevcut Next.js uygulamasının sunum katmanı yenilendi. Referanslar tarayıcıda
incelendi; görselleri veya bileşenleri kopyalanmadı.

| Referans | Gözlem | Gamerisen'deki karşılığı |
| --- | --- | --- |
| [Backloggd](https://backloggd.com/) | Oyun kapakları, koleksiyonlar ve okunaklı içerik sıralaması ön planda. | Kapak altında kalıcı oyun adı/tür/fiyat; daha düzenli yatay koleksiyonlar. |
| [GG.deals](https://gg.deals/) | Arama, filtreler ve fırsatların bilgi hiyerarşisi güçlü. | Görünür arama, katalog başlığı, kompakt filtreler, ayrı fiyat satırları. |
| [GAMES.GG](https://games.gg/) | Gerçek oyun görseliyle büyük vitrin ve yanında içerik seçimleri. | Ana vitrin, yan seçim listesi; telefonda yatay seçici ve önceki/sonraki kontrolleri. |

Renk kaynağı `mobile/src/design/tokens.json`: nötr siyah/gri yüzeyler,
Gamerisen kırmızısı ve kontrollü sınır çizgileri. Web açık teması da nötr
beyaz/griye geçirildi. Kırmızı, temel eylem ve aktif seçimlerde kullanılıyor.

## Uygulama

- Ortak görsel kurallar `app/redesign.css` içinde, mevcut global stillerden
  sonra yükleniyor. Rota ve bileşen klasörleri taşınmadı.
- Masaüstünde iki satırlı üst menü; telefonda sabit alt menü. Haberler ve
  Keşfet masaüstü menüsünden de erişilebilir.
- Büyük tanıtım alanı, animasyonlu arama metni, açılış logosu ve menüye dikkat
  çeken kaplama kaldırıldı. Ana sayfa içeriğe daha erken ulaştırıyor.
- Vitrin sponsor içeriği, bağlantısı ve oyun seçimi korunuyor. Otomatik geçiş
  duraklatılabiliyor, fare/klavye etkileşiminde bekliyor ve azaltılmış hareket
  tercihinde otomatik başlamıyor.
- Oyun kartlarının 3B eğilmesi ve parıltısı kaldırıldı. Fiyat yükleme,
  sahiplik/abonelik rozetleri, detay bağlantıları ve ekran görüntüsü önizlemesi
  korunuyor. Yatay listeler klavyeyle odaklanabilir.
- Katalog, topluluk sekmeleri, haber/keşif başlıkları, giriş/kayıt yüzeyleri,
  profil renk değişkenleri, altbilgi ve asistan düğmesi ortak dile uyarlandı.
- Ana sayfa haberleri yüklenirken iskelet gösteriliyor. API başarısızlığında
  eski örnek haberler güncel haber gibi sunulmuyor; boş durum gösteriliyor.

## Korunan sınırlar

`app/api`, `app/context`, veri modelleri, kimlik doğrulama, OAuth, Steam/Xbox
bağlantıları, güvenlik başlıkları, mobil uygulama ve bağımlılıklar değiştirilmedi.
Mevcut yerel ortam dosyaları Git'e eklenmedi. Bu değişiklik web deploy'u içindir;
Expo OTA veya mobil mağaza build'i gerektirmez.

## Doğrulama

- `npm run build`: başarılı; 107 sayfanın üretimi tamamlandı.
- Build öncesi erişim politikası (92 route) ve CORS denetimleri: başarılı.
- Tarayıcıda 320, 390, 820 ve 1280 piksel genişlikleri; açık/koyu tema, TR/EN değişimi,
  ana sayfadan `Elden Ring` aramasının katalog sorgusuna aktarılması ve oyun
  sonuçlarının görüntülenmesi doğrulandı.
- Topluluk sekmeleri, giriş/kayıt formları, kütüphanenin misafir durumu ve
  Elden Ring detay/fiyat karşılaştırma ekranı incelendi. İncelenen sayfalarda
  yatay sayfa taşması görülmedi. Mobil asistan düğmesi küçültüldü; giriş/kayıtta
  alt menü bulunmadığından düğme ekranın altına alındı.
- Gerçek bir kullanıcıyla OAuth, satın alma, kütüphane bağlantısı veya sosyal
  içerik yazma işlemi yapılmadı. Bu akışların sunucu/iş mantığı değiştirilmedi.
- Yerel derlemede mevcut modül tipi ve edge/static üretim uyarıları bulunuyor;
  derlemeyi engellemediler.
