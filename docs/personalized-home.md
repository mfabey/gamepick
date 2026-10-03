# Senin için — web ve mobil

Ana sayfalardaki “Bu hafta trend” bölümü kaldırıldı. Mobilde ilk oyun şeridi her zaman “Senin İçin”; arkadaş etkinliği onun altında. Webde aynı bölüm ve başlangıç için tür seçimi var. Tercih geçmişi olmayan kullanıcıya başlangıç önerisi olduğu açıkça söylenir.

## Ortak veri akışı

- `mobile/src/services/recommend.js`: iki istemcinin kullandığı saf sıralama motoru. Tür ilgisi, kalite, yeni çıkışlar ve sahip olunan oyunları dikkate alır; farklı kaynaklardan gelen aynı oyunu tekilleştirir. Mobilde mevcut görüldü/ilgilenmiyorum sinyalleri korunur.
- `mobile/src/services/recommendProfile.js`: iki istemci ve API için profil birleştirme, tür normalizasyonu ve kütüphane/etkileşim ağırlıkları. Dosyalar mobil proje içinde kalır; EAS dış klasör bağımlılığı gerektirmez.
- `/api/for-you`: tür katalogları + yeni/popüler oyun havuzu. Günlük katalog sayfası değişir, sunucu önbelleği 10 dakikadır. Kişisel profil bu ortak önbelleğe girmez; sıralama istemcide yapılır.
- `/api/user/data`: aynı Firebase UID, mobil Bearer token veya web imzalı oturum çereziyle aynı tercih kaydına erişir. GET kişiye özel ve önbelleksizdir.
- Mobil görüntüleme, beğenme, takip ve ilk seçim sinyalleri; web görüntüleme, takip ve tür seçimi sinyalleri kullanılır. Steam kütüphanesinin en çok oynanan 25 oyunu da tür profiline katkı verir. Kütüphane anlık görüntüsü hesaba eşitlenir.
- Mobil yerel tercih değişiklikleri kısa gecikmeyle, uygulama açılışı/ön plana gelişi de mevcut senkronla gönderilir. Web ana sayfa açılışı, pencereye dönüş ve yenilemede profili okur. Misafir web tercihleri yalnız o tarayıcıda kalır; hesaba karıştırılmaz.
- Mobil şerit detaydan geri dönüşte sabit kalır. Sayfayı aşağı çekerek yenileme, yeni gün veya beş dakikadan uzun ayrılık önerileri yeniden hesaplar. İki platform aynı tercihleri kullanır; mobildeki yerel görüldü/eleme geçmişi nedeniyle birebir aynı kart sırası vaat edilmez.

Önceki senkron, zaten birikmiş tür puanlarını her yüklemede tekrar topluyordu. Artık mobil anlık görüntüleri maksimum değerle birleştirilir; web yeni etkileşimi ayrı sinyal olarak gönderir. Tercih yazıları istek listesini ve koleksiyonları yeniden yazmaz. Hesap değişiminde bekleyen web yüklemeleri ve mobil eski akış yanıtları iptal edilir/elenir.

`/api/trending` eski yayımlanmış istemciler için korunur; güncel ana sayfalar ve öneri havuzu bu ucu kullanmaz. Yeni mobil arayüzün telefona gelmesi için uyumlu Expo Update veya uygulama sürümü yayımlanmalıdır; GitHub push tek başına kurulu uygulamayı güncellemez. Bu değişiklik yerel modül veya izin eklemez.

## Doğrulama

`node --test --test-isolation=none scripts/recommendations.test.cjs`

Farklı kullanıcı sıralaması, eşit kütüphane ağırlığı, tekrar eşitlemede puan şişmemesi, tekilleştirme/eleme, trendden bağımsız adaylar, ağ hatası, web/mobil ortak hesap ve hesap geçişindeki bekleyen yükleme kontrol edilir.
