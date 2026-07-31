# Gamerisen v2.0 — Yol Haritası

> Hazırlanma: 2026-07-31 · Temel: kod tabanı ve canlı API'ler üzerinde doğrulanmış bulgular

## Özellik listesi ve referans ürünler (benchmark)

| # | Özellik | Referans ürün | Kalite çıtası |
|---|---------|---------------|----------------|
| 1 | Swipe sistemi | Tinder | 60fps jest, anında geri bildirim, geri alma |
| 2 | Oyun koleksiyonları | Letterboxd listeleri, Steam koleksiyonları | Sınırsız liste, sürükle-sırala, kapak görseli |
| 3 | Reels video feed | Instagram Reels, TikTok | Siyah ekran yok, anında oynatma, kesintisiz kaydırma |
| 4 | Oyuncu istatistikleri | Spotify Wrapped | Paylaşılabilir görsel, haftalık ritim |
| 5 | Arkadaş sistemi | Instagram aktivite akışı | Gerçek zamanlı hissi, gizlilik kontrolü |
| 6 | Topluluk listeleri | Letterboxd, IMDb listeleri | Keşfedilebilir, sıralanabilir, moderasyonlu |

**Letterboxd, 2 ve 6 için en doğru referans** — film alanında birebir aynı modeli (kişisel liste → topluluk listesi → keşif) olgunlaştırmış durumda.

---

## Mevcut altyapı (doğrulanmış)

| Katman | Durum |
|--------|-------|
| Backend | Next.js API routes, Vercel |
| Kimlik | Firebase Auth (REST), `verifyMobileToken` |
| Kalıcı veri | **Upstash Redis** (REST), sadece `GET`/`SET` JSON sarmalayıcı |
| Sunucuda tutulan | Yalnızca `user_taste:{uid}` ve `user_wishlist:{uid}` |
| Cihazda tutulan | Zevk profili, görülenler, elenenler, takip listesi, onboarding |
| Kullanıcı adı / handle | **Yok** — kimlik sadece uid + e-posta + displayName |
| Rate limit / moderasyon / raporlama / engelleme | **Hiçbiri yok** |

### Kurulu native modüller
`expo-video` · `@shopify/flash-list` · `expo-haptics` · `expo-image` · `expo-notifications` · `expo-secure-store` · `AsyncStorage`

### Eksik native modüller (swipe için zorunlu)
| Paket | SDK 54 sürümü |
|-------|---------------|
| `react-native-gesture-handler` | `~2.28.0` |
| `react-native-reanimated` | `~4.1.1` |
| `react-native-worklets` | `0.5.1` (reanimated 4'ün zorunlu eşi) |
| `react-native-svg` | `15.12.1` (istatistik grafikleri — opsiyonel) |

---

## En kritik bulgu: özellikler iki farklı düzenleyici sınıfta

**A sınıfı — kişisel/yerel** (1 Swipe · 2 Koleksiyon · 3 Reels · 4 İstatistik)
Kullanıcının kendi verisi, başka kullanıcıya görünmüyor. Ek yasal yükümlülük yok.

**B sınıfı — sosyal/UGC** (5 Arkadaş · 6 Topluluk listeleri)
**App Store Guideline 1.2**'yi tetikler. Apple bu durumda **dördünü birden** zorunlu tutuyor:

1. Uygunsuz içeriği süzme yöntemi
2. İçerik raporlama mekanizması + **zamanında yanıt**
3. Kötüye kullanan kullanıcıları **engelleme**
4. **Yayınlanmış iletişim bilgisi**

Guideline 1.2 "kullanıcı üretimi içerik **veya sosyal ağ hizmeti**" diyor — yani arkadaş sistemi tek başına da bunu tetikliyor. Ayrıca Guideline 5.1.2 gereği arkadaşa veri gösterimi için açık rıza gerekir ve mevcut App Privacy etiketlerimiz ("izleme yok, analitik yok") güncellenmek zorunda kalır.

**Beta rozeti bunu çözmez.** Rozet kullanıcıya bilgi verir, Apple'ın 1.2 zorunluluğunu kaldırmaz.

---

## Fazlar

### Faz 0 — Altyapı (kod öncesi zorunlu temel)
- Native paketleri **tek seferde** kur (gesture-handler, reanimated, worklets, svg) → tek build ile doğrula
- **Performans:** `verifyMobileToken` şu an **her istekte Firebase'e ağ çağrısı** yapıyor. Sosyal özelliklerde bu darboğaz olur. Google'ın açık anahtarları önbelleğe alınarak JWT yerel doğrulamaya çevrilmeli.
- Redis sarmalayıcısı: hata durumunda sessizce `null` dönüyor — yazma başarısızlığı fark edilmiyor. Pipeline ve hata yüzeyi eklenmeli.
- Rate limit katmanı (UGC için ön koşul, mevcut uçları da korur)

*Native: EVET · Backend: EVET · Beta: —*

### Faz 1 — Swipe sistemi
Mevcut `tasteProfile.js` zaten `view/wishlist/pick` ağırlıklarıyla çalışıyor; swipe yeni sinyal türü olarak eklenir (`like` / `dislike`). Mevcut `dismissStore` sola kaydırma için hazır altyapı.

*Native: EVET (Faz 0'da kurulur) · Backend: hayır · Beta: hayır (deterministik, yerel)*

### Faz 2 — Oyun koleksiyonları
Takip listesiyle aynı desen: önce cihaz, sonra `/api/user/data` üzerinden senkron. Topluluk listelerinin de temeli.

*Native: hayır · Backend: evet (mevcut deseni genişletir) · Beta: hayır*

### Faz 3 — Reels video feed
Steam HLS (4 kaliteli adaptif akış, Akamai CDN). 3'lü oynatıcı havuzu + poster görseli + FlashList paging.

*Native: hayır (expo-video kurulu) · Backend: evet (yeni feed ucu) · **Beta: EVET***
Gerekçe: dış CDN bağımlılığı, içerik kapsamı oyundan oyuna değişiyor, veri tüketimi yüksek.

### Faz 4 — Oyuncu istatistikleri
Yerel veriden hesaplanır (görülenler, zevk profili, koleksiyonlar, swipe). Faz 1–3'ten sonra gelmeli ki raporlayacak anlamlı veri birikmiş olsun.

*Native: hayır (svg opsiyonel) · Backend: hayır · Beta: hayır*

### Faz 5 — Kimlik + moderasyon altyapısı (B sınıfının ön koşulu)
- Benzersiz kullanıcı adı sistemi (rezervasyon, küfür filtresi)
- Raporlama, engelleme, içerik süzme, iletişim bilgisi → **Guideline 1.2'nin dördü**
- Gizlilik rızası akışı + App Privacy etiketlerinin güncellenmesi

*Native: hayır · Backend: EVET (yeni Redis şeması) · Beta: —*

### Faz 6 — Arkadaş sistemi
Redis set'leri ile sosyal graf. Aktivite akışı **okuma anında toplama** ile (yazma anında dağıtım Upstash'te komut başına ücretlendiği için pahalı).

*Native: hayır · Backend: EVET · **Beta: EVET***

### Faz 7 — Topluluk listeleri
Faz 2'nin paylaşıma açılmış hâli + sıralama/keşif + moderasyon kuyruğu.

*Native: hayır · Backend: EVET · **Beta: EVET***

---

## Sürüm mekaniği

`runtimeVersion` politikası `appVersion`. `version` 1.0.0 → 2.0.0 yapılınca runtime sürümü değişir:
**v2.0 OTA ile 1.0.0 kullanıcılarına gidemez** — yeni native build + App Store incelemesi şart. Bu, "hepsini birlikte çıkaralım" kararıyla uyumlu.

Native bağımlılıklar Faz 0'da toplu kurulup **tek build ile doğrulanmalı**; sonraki fazlar saf JS olduğu için geliştirme sırasında ek native build turu gerekmez.

---

## Öneri: iki dalga

A sınıfı (Faz 0–4) tek başına güçlü bir v2.0 oluşturur ve 4.2.2 reddine doğrudan cevap verir (native jestler, kişiselleştirme, cihazda kalıcı veri, video). B sınıfı ise uygulamayı **sosyal ağ kategorisine** taşır ve sürekli moderasyon yükümlülüğü getirir.

- **v2.0** → Faz 0–4
- **v2.1** → Faz 5–7 (moderasyon altyapısı olgunlaştıktan sonra)

Tek dalgada gidilecekse Faz 5 pazarlık konusu değildir — moderasyon olmadan Faz 6–7 gönderilirse Guideline 1.2'den ret neredeyse kesindir.
