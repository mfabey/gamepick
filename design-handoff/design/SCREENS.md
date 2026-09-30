# Ekran haritası

25 ekran var. Her birinin kaynağı `source/<dosya>.dc.html`, görüntüsü `reference/<dosya>.png` (2x). Önerilen route'lar expo-router içindir. **Eski tasarımla yazılmış bir ekran varsa onun route'unu koru**, yalnızca eşleştir.

**Öncelik sırası:** Ana Sayfa → Oyun Detayı → Fiyat Karşılaştırma → Topluluk → diğerleri.

**Sekme çubuğu** (yalnızca ikon) şu ekranlarda var: 04, 10, 11, 14, 16, 18, 21. Referans görüntülerde iOS görünümü; Android görünümü DS 7'de (`reference/G-DS-7-TabBar.png`).

| # | Ekran | Tasarım yüksekliği | Önerilen route | Sekme |
|---|---|---|---|---|
| 01 | Açılış | 844 | `app/index.tsx` | — |
| 02 | Tanıtım | 844 | `app/(onboarding)/index.tsx` | — |
| 02b | İlgi Alanları | 844 | `app/(onboarding)/interests.tsx` | — |
| 03 | Giriş | 844 | `app/(auth)/login.tsx` | — |
| 04 | Ana Sayfa | 3824 | `app/(tabs)/index.tsx` | Ana Sayfa |
| 05 | Arama | 1034 | `app/search/index.tsx` | — |
| 06 | Arama Sonuçları | 1033 | `app/search/results.tsx` | — |
| 06b | Keşif Filtreleri | 844 | `app/search/filters.tsx` | — |
| 07 | Oyun Detayı | 3869 | `app/game/[id]/index.tsx` | — |
| 08 | Fiyat Karşılaştırma | 1726 | `app/game/[id]/prices.tsx` | — |
| 09 | İstek Listesi | 950 | `app/wishlist.tsx` | — |
| 10 | Topluluk | 1969 | `app/(tabs)/community.tsx` | Topluluk |
| 11 | Oyun Topluluğu | 1635 | `app/community/[gameId].tsx` | Topluluk |
| 12 | Gönderi Oluştur | 844 | `app/post/new.tsx` | — |
| 13 | Gönderi Detayı | 1225 | `app/post/[id].tsx` | — |
| 14 | Videolar | 2099 | `app/(tabs)/videos.tsx` | Videolar |
| 15 | Video Oynatıcı | 1231 | `app/video/[id].tsx` | — |
| 16 | Oyun Haberleri | 1585 | `app/news/index.tsx` | — |
| 17 | Haber Detayı | 2150 | `app/news/[id].tsx` | — |
| 18 | Mesajlar | 949 | `app/(tabs)/messages.tsx` | Mesajlar |
| 19 | Sohbet | 1412 | `app/chat/[id].tsx` | Mesajlar |
| 20 | Bildirimler | 1048 | `app/notifications.tsx` | — |
| 21 | Profil | 1735 | `app/(tabs)/profile.tsx` | Profil |
| 22 | Profili Düzenle | 1356 | `app/profile/edit.tsx` | — |
| 23 | Ayarlar | 1676 | `app/settings.tsx` | — |

---

## 01 · Açılış

- **Kaynak:** `source/G-01-Splash.dc.html` · **Görüntü:** `reference/G-01-Splash.png` · **Yükseklik:** 844 pt
- **Route:** `app/index.tsx` (açılış) ya da kök layout içinde splash katmanı
- **İçerik:** Yerel splash (yalnızca işaret, #0A0A0B) → JS splash: ortada işaret 104, "gamerisen" yazısı, "Oyun dünyasında olan her şey, tek yerde."; altta ince kırmızı yükleme çizgisi ve "Senin için hazırlanıyor…". Veri hazır olunca Tanıtım ya da Ana Sayfa.
- **Bileşenler:** `Mark`, `Wordmark`
- **Gittiği ekranlar:** 02-Onboarding
- **Durumlu etkileşimler:** —

## 02 · Tanıtım

- **Kaynak:** `source/G-02-Onboarding.dc.html` · **Görüntü:** `reference/G-02-Onboarding.png` · **Yükseklik:** 844 pt
- **Route:** `app/(onboarding)/index.tsx`
- **İçerik:** "Atla"; oyun kapaklarından oluşan kolaj (indirim etiketleri ve "Hades II fiyatı düştü" bildirimi) + alttan degrade (`gradients.onboardingFade`); başlık "Oyunlarını keşfet, en ucuz fiyatı yakala." ve açıklama; sayfa noktaları; "Devam et" (birincil) ve "Zaten hesabım var" (kırmızı metin buton).
- **Bileşenler:** `Button`, `DiscountTag`
- **Gittiği ekranlar:** 03-Login, 02b-Interests
- **Durumlu etkileşimler:** —

## 02b · İlgi Alanları

- **Kaynak:** `source/G-02b-Interests.dc.html` · **Görüntü:** `reference/G-02b-Interests.png` · **Yükseklik:** 844 pt
- **Route:** `app/(onboarding)/interests.tsx`
- **İçerik:** Üstte geri, 3 adımlı ilerleme çizgisi ve "Atla"; başlık "Neler oynuyorsun?" ve açıklama; çoklu seçim çipleri: Platformların, Sevdiğin türler, Takip ettiğin mağazalar (mağaza çiplerinde StoreBadge); altta "Devam et".
- **Bileşenler:** `Button`
- **Gittiği ekranlar:** 02-Onboarding, 03-Login
- **Durumlu etkileşimler:** seçim

## 03 · Giriş

- **Kaynak:** `source/G-03-Login.dc.html` · **Görüntü:** `reference/G-03-Login.png` · **Yükseklik:** 844 pt
- **Route:** `app/(auth)/login.tsx`
- **İçerik:** İşaret 52, "Tekrar hoş geldin" (30/36) ve alt yazı; Apple (birincil) / Google / Steam ile devam et (50 pt); "veya e-postayla" ayracı; E-posta ve Şifre alanları (odak halkası, göster/gizle); "Şifreni mi unuttun?"; "Giriş yap" (52 pt); altta "Hesabın yok mu? Kayıt ol" ve yasal metin.
- **Bileşenler:** `Button`, `Mark`, `TextField`
- **Gittiği ekranlar:** 04-Home, 02-Onboarding
- **Durumlu etkileşimler:** —

## 04 · Ana Sayfa

- **Kaynak:** `source/G-04-Home.dc.html` · **Görüntü:** `reference/G-04-Home.png` · **Yükseklik:** 3824 pt
- **Route:** `app/(tabs)/index.tsx`
- **İçerik:** Sırasıyla: HomeHeader → selamlama → HeroCard rayı + PageDots → Senin İçin (GameCard rayı) → Fiyatı Düşenler (PriceDropCard rayı) → Arkadaşların Ne Oynuyor? → Gamerisen'da Gündem (TrendCard) → Toplulukta Popüler (Post) → Kaçırılmayacak Fırsatlar (DealCard rayı) → Oyun Dünyasından (NewsFeature + 3 NewsRow) → İzlemeye Değer (VideoCard rayı) → Belki Bunu Seversin (3'lü GameCardSmall ızgarası). Bölümler arası 32, başlık → içerik 12.
- **Bileşenler:** `Avatar`, `Badge`, `DealCard`, `FriendActivity`, `GameCard`, `GameCardSmall`, `HeroCard`, `IconButton`, `Mark`, `MediaImage`, `NewsFeature`, `NewsRow`, `Post`, `PostHeader`, `PriceDropCard`, `SectionHeader`, `TabBar`, `TrendCard`, `VideoCard`, `Wordmark`
- **Gittiği ekranlar:** 05-Search, 20-Notifications, 21-Profile, 07-GameDetail, 09-Wishlist, 18-Messages, 10-Community, 13-PostDetail, 08-Prices, 16-News, 17-NewsDetail, 14-Videos, 15-VideoPlayer
- **Durumlu etkileşimler:** kaydet, beğeni, istek listesi kalbi

## 05 · Arama

- **Kaynak:** `source/G-05-Search.dc.html` · **Görüntü:** `reference/G-05-Search.png` · **Yükseklik:** 1034 pt
- **Route:** `app/search/index.tsx` (modal ya da stack)
- **İçerik:** SearchField + "Vazgeç"; kapsam çipleri (Tümü / Oyunlar / Kişiler / Topluluklar / Haberler); Son aramalar ("Temizle", satır başına sil); Trend aramalar (6 çip, 3 satır); Önerilen oyunlar (GameCardSmall rayı); Önerilen kişiler (UserRow + FollowButton).
- **Bileşenler:** `Avatar`, `Button`, `Chip`, `GameCardSmall`, `SectionHeader`, `UserRow`
- **Gittiği ekranlar:** 04-Home, 06-Results, 07-GameDetail, 21-Profile
- **Durumlu etkileşimler:** takip

## 06 · Arama Sonuçları

- **Kaynak:** `source/G-06-Results.dc.html` · **Görüntü:** `reference/G-06-Results.png` · **Yükseklik:** 1033 pt
- **Route:** `app/search/results.tsx`
- **İçerik:** Segmented (Tümü / Oyunlar / Kişiler / Haberler / Videolar) + filtre butonu; gruplu sonuçlar: oyun satırları (kalp), kişiler, topluluklar ("Katıl"), haberler, videolar.
- **Bileşenler:** `Avatar`, `Button`, `CommunityRow`, `NewsRow`, `OverlayTag`, `SectionHeader`, `Segmented`, `UserRow`
- **Gittiği ekranlar:** 04-Home, 06b-Filters, 07-GameDetail, 21-Profile, 11-GameCommunity, 16-News, 17-NewsDetail, 14-Videos, 15-VideoPlayer
- **Durumlu etkileşimler:** takip, istek listesi kalbi

## 06b · Keşif Filtreleri

- **Kaynak:** `source/G-06b-Filters.dc.html` · **Görüntü:** `reference/G-06b-Filters.png` · **Yükseklik:** 844 pt
- **Route:** `app/search/filters.tsx` (formSheet)
- **İçerik:** Alt sayfa (tutamaç, köşe 20): üstte "Sıfırla" / "Filtreler" / kapat; Platform ve Tür çipleri; Fiyat aralığı kaydırıcısı (₺0 – ₺2.500+); İndirim (Segmented: Tümü / %25+ / %50+ / %75+); Diğer filtreler satırları (Oyun modu, Çıkış tarihi, Puan); "128 oyunu göster" birincil butonu.
- **Bileşenler:** `Button`, `Chip`, `IconButton`, `ListRow`, `Segmented`
- **Gittiği ekranlar:** 04-Home, 06-Results
- **Durumlu etkileşimler:** seçim

## 07 · Oyun Detayı

- **Kaynak:** `source/G-07-GameDetail.dc.html` · **Görüntü:** `reference/G-07-GameDetail.png` · **Yükseklik:** 3869 pt
- **Route:** `app/game/[id]/index.tsx`
- **İçerik:** Tam genişlik görsel + `gradients.gameDetailHeader`, cam geri / paylaş / kalp; başlık (28), yıl · geliştirici, puan · inceleme sayısı · PEGI, tür çipleri, platformlar; "En Ucuz Fiyatı Gör" (birincil) + "İstek Listesine Ekle" (ikincil); En İyi Fiyat kartı (StoreRow, fiyat, indirim, rekor düşük notu, "Mağazaya Git") ve diğer mağazalar, "6 mağazanın tümünü karşılaştır"; Fragman ve Görseller; Oyun Hakkında (Devamını oku); Sistem Gereksinimleri (Segmented Minimum / Önerilen); Oyuncu İncelemeleri; Topluluk Tartışmaları; İlgili Haberler; İlgili Videolar; Benzer Oyunlar. Altta StickyBottomBar: ₺599 · "Steam'de en ucuz · -%50" · "Mağazaya Git".
- **Bileşenler:** `Avatar`, `Button`, `DiscountTag`, `GameCardSmall`, `HeartButton`, `IconButton`, `NewsRow`, `PlayButton`, `SectionHeader`, `Segmented`, `StatusPill`, `VideoCard`
- **Gittiği ekranlar:** 04-Home, 08-Prices, 15-VideoPlayer, 11-GameCommunity, 13-PostDetail, 16-News, 17-NewsDetail, 14-Videos
- **Durumlu etkileşimler:** istek listesi kalbi

## 08 · Fiyat Karşılaştırma

- **Kaynak:** `source/G-08-Prices.dc.html` · **Görüntü:** `reference/G-08-Prices.png` · **Yükseklik:** 1726 pt
- **Route:** `app/game/[id]/prices.tsx`
- **İçerik:** NavBar "Fiyat Karşılaştırma" + fiyat alarmı ikonu; oyun + sürüm seçici; platform Segmented; "En İyi Fiyat" kartı (yeşil rozet, fiyat 40, indirim, "Mağazaya Git"); "Rekor düşük fiyat" / "12 aylık ortalama" StatTile'ları; Fiyat Geçmişi (PriceChart + 3A/6A/1Y/Tümü); Fiyat alarmı (Switch + hedef fiyat adımlayıcı); Tüm Mağazalar (StoreRow listesi). Altta StickyBottomBar.
- **Bileşenler:** `Button`, `Chip`, `DiscountTag`, `IconButton`, `NavBar`, `PriceChart`, `PriceDrop`, `SectionHeader`, `Segmented`, `StoreRow`, `Switch`
- **Gittiği ekranlar:** 07-GameDetail
- **Durumlu etkileşimler:** anahtarlar

## 09 · İstek Listesi

- **Kaynak:** `source/G-09-Wishlist.dc.html` · **Görüntü:** `reference/G-09-Wishlist.png` · **Yükseklik:** 950 pt
- **Route:** `app/wishlist.tsx`
- **İçerik:** NavBar "İstek Listesi" + "27 oyun" alt başlığı ve filtre ikonu; yeşil özet bandı ("Bu hafta 4 oyunun fiyatı düştü"); sıralama çipleri (Son eklenen / Fiyat / İndirim / Çıkış tarihi); satırlar: kapak 62×84, ad, mağaza, fiyat + eski fiyat + indirim, değişim notu (yeşil düşüş / turuncu artış / "Fiyat değişmedi" / çıkış tarihi), sağda fiyat alarmı zili (açıksa dolu kırmızı).
- **Bileşenler:** `Chip`, `DiscountTag`, `IconButton`, `NavBar`, `PriceDrop`, `StoreBadge`
- **Gittiği ekranlar:** 21-Profile, 08-Prices
- **Durumlu etkileşimler:** —

## 10 · Topluluk

- **Kaynak:** `source/G-10-Community.dc.html` · **Görüntü:** `reference/G-10-Community.png` · **Yükseklik:** 1969 pt
- **Route:** `app/(tabs)/community.tsx`
- **İçerik:** PageHeader "Topluluk" (ara, gönderi oluştur); Segmented (Senin İçin / Takip / Trend / Topluluklar); "Ne düşünüyorsun?" oluşturucu kartı (Görsel / Oyun / Video / Anket); Toplulukların (yuvarlak küçük resimler + yeni sayısı); gönderi akışı (Post; anketli, medyalı, oyun etiketli varyantlar).
- **Bileşenler:** `Avatar`, `Badge`, `IconButton`, `MediaImage`, `OverlayTag`, `PageHeader`, `PlayButton`, `Post`, `PostHeader`, `SectionHeader`, `Segmented`, `TabBar`
- **Gittiği ekranlar:** 05-Search, 12-CreatePost, 11-GameCommunity, 13-PostDetail, 07-GameDetail, 15-VideoPlayer, 04-Home, 14-Videos, 18-Messages, 21-Profile
- **Durumlu etkileşimler:** kaydet, beğeni

## 11 · Oyun Topluluğu

- **Kaynak:** `source/G-11-GameCommunity.dc.html` · **Görüntü:** `reference/G-11-GameCommunity.png` · **Yükseklik:** 1635 pt
- **Route:** `app/community/[gameId].tsx`
- **İçerik:** Oyun görselli başlık (`gradients.gameCommunityHeader`), cam geri / paylaş / daha fazla; topluluk küçük resmi, "Katıl" + bildirim zili; "Elden Ring Topluluğu", üye · çevrimiçi sayısı, açıklama, kural etiketleri (Moderatörlü / Türkçe / Spoiler etiketi zorunlu); Segmented (Gönderiler / Medya / Rehberler / Sorular); sabitlenmiş gönderi; Popüler tartışmalar (etiketli liste); Son gönderiler.
- **Bileşenler:** `Avatar`, `Badge`, `Button`, `IconButton`, `MediaImage`, `Post`, `PostHeader`, `SectionHeader`, `Segmented`, `TabBar`
- **Gittiği ekranlar:** 10-Community, 13-PostDetail, 07-GameDetail, 12-CreatePost, 04-Home, 14-Videos, 18-Messages, 21-Profile
- **Durumlu etkileşimler:** kaydet, beğeni

## 12 · Gönderi Oluştur

- **Kaynak:** `source/G-12-CreatePost.dc.html` · **Görüntü:** `reference/G-12-CreatePost.png` · **Yükseklik:** 844 pt
- **Route:** `app/post/new.tsx` (modal)
- **İçerik:** Üst çubuk (Vazgeç / "Gönderi oluştur" / Paylaş); tür çipleri (Metin / Görsel / Oyun / Video); yazar + topluluk seçici; metin alanı (17/26); görsel eki (kaldır, "Alt metin ekle"); oyun etiketi kartı (kaldır) ve durum Segmented (Oynuyor / Tamamladı / Tavsiye ediyorum); "Spoiler içeriyor" Switch; alt araç çubuğu (görsel, oyun, video, anket, etiket) ve karakter sayacı 142/500.
- **Bileşenler:** `Avatar`, `Button`, `Chip`, `IconButton`, `Segmented`, `Switch`
- **Gittiği ekranlar:** 10-Community, 13-PostDetail
- **Durumlu etkileşimler:** anahtarlar

## 13 · Gönderi Detayı

- **Kaynak:** `source/G-13-PostDetail.dc.html` · **Görüntü:** `reference/G-13-PostDetail.png` · **Yükseklik:** 1225 pt
- **Route:** `app/post/[id].tsx`
- **İçerik:** NavBar "Gönderi" + daha fazla; tam Post; beğeni / yorum / paylaşım sayıları satırı; "Yanıtlar" + sıralama ("En iyi"); Comment listesi (yanıt girintisi 52, "Yazar" rozeti); "3 yanıt daha göster"; altta yanıt giriş çubuğu.
- **Bileşenler:** `Avatar`, `Badge`, `Button`, `Chip`, `Comment`, `IconButton`, `MediaImage`, `NavBar`, `Post`, `PostHeader`
- **Gittiği ekranlar:** 10-Community, 07-GameDetail
- **Durumlu etkileşimler:** kaydet, beğeni

## 14 · Videolar

- **Kaynak:** `source/G-14-Videos.dc.html` · **Görüntü:** `reference/G-14-Videos.png` · **Yükseklik:** 2099 pt
- **Route:** `app/(tabs)/videos.tsx`
- **İçerik:** PageHeader "Videolar" (ara, kaydedilenler); kategori çipleri (Senin İçin / Fragmanlar / Oynanış / İnceleme…); sessiz önizlemeli öne çıkan video (ilerleme çubuğu, süre) ve bilgisi; Kısa Klipler (ShortCard rayı); Takip Ettiğin Yaratıcılar (halkalı avatarlar + yeni video sayısı); Bugün İzleniyor (VideoCard listesi).
- **Bileşenler:** `Avatar`, `Chip`, `IconButton`, `Mark`, `OverlayTag`, `PageHeader`, `SectionHeader`, `ShortCard`, `TabBar`, `VideoCard`
- **Gittiği ekranlar:** 05-Search, 15-VideoPlayer, 04-Home, 10-Community, 18-Messages, 21-Profile
- **Durumlu etkileşimler:** —

## 15 · Video Oynatıcı

- **Kaynak:** `source/G-15-VideoPlayer.dc.html` · **Görüntü:** `reference/G-15-VideoPlayer.png` · **Yükseklik:** 1231 pt
- **Route:** `app/video/[id].tsx`
- **İçerik:** Oynatıcı (`gradients.videoPlayer`; küçült, altyazı, ayarlar, duraklat, süre, ilerleme, tam ekran); başlık, izlenme · tarih · etiket; yaratıcı + FollowButton; hap şeklinde eylemler (beğeni, yorum, paylaş, kaydet); "Bu video şu oyunla ilgili" kartı ("Oyunu Gör" renkli buton); yorum önizlemesi; "Sıradaki" + "Otomatik oynat" Switch ve video listesi.
- **Bileşenler:** `Avatar`, `Button`, `DiscountTag`, `FollowButton`, `IconButton`, `OverlayTag`, `SectionHeader`, `StoreBadge`, `Switch`
- **Gittiği ekranlar:** 14-Videos, 07-GameDetail, 13-PostDetail
- **Durumlu etkileşimler:** takip, beğeni

## 16 · Oyun Haberleri

- **Kaynak:** `source/G-16-News.dc.html` · **Görüntü:** `reference/G-16-News.png` · **Yükseklik:** 1585 pt
- **Route:** `app/news/index.tsx`
- **İçerik:** Geri / ara / kaydedilenler; büyük başlık "Oyun Haberleri"; kategori çipleri (Gündem / PC / PlayStation / Xbox / Nintendo…); "Son dakika" rozetli manşet NewsFeature; iki sütunlu küçük haber kartları; "Son Gelişmeler" + "Canlı akış" göstergesi, gün başlıklı NewsRow listesi.
- **Bileşenler:** `IconButton`, `LiveTime`, `NewsRow`, `SectionHeader`, `TabBar`
- **Gittiği ekranlar:** 04-Home, 05-Search, 17-NewsDetail, 10-Community, 14-Videos, 18-Messages, 21-Profile
- **Durumlu etkileşimler:** haber kaydet

## 17 · Haber Detayı

- **Kaynak:** `source/G-17-NewsDetail.dc.html` · **Görüntü:** `reference/G-17-NewsDetail.png` · **Yükseklik:** 2150 pt
- **Route:** `app/news/[id].tsx`
- **İçerik:** Görselli başlık (`gradients.newsDetailHeader`) + geri / paylaş / kaydet; kategori çipi, LiveTime, okuma süresi; başlık; yazar ve kaynak; gövde 17/27; ara başlık; altyazılı görsel; ilgili oyun kartı ("Listeye ekle"); Topluluk Tepkileri (Comment); İlgili Haberler.
- **Bileşenler:** `Avatar`, `Button`, `Comment`, `IconButton`, `LiveTime`, `NewsRow`, `SectionHeader`
- **Gittiği ekranlar:** 16-News, 07-GameDetail, 10-Community
- **Durumlu etkileşimler:** —

## 18 · Mesajlar

- **Kaynak:** `source/G-18-Messages.dc.html` · **Görüntü:** `reference/G-18-Messages.png` · **Yükseklik:** 949 pt
- **Route:** `app/(tabs)/messages.tsx`
- **İçerik:** PageHeader "Mesajlar" (yeni mesaj); SearchField; Çevrimiçi (56 pt avatarlar + oyun); filtre çipleri (Tümü / Okunmamış / Gruplar / İstekler); MessageRow listesi (okunmamış sayacı, yazıyor… noktaları).
- **Bileşenler:** `Avatar`, `Chip`, `IconButton`, `MessageRow`, `PageHeader`, `SearchField`, `TabBar`
- **Gittiği ekranlar:** 19-Chat, 04-Home, 10-Community, 14-Videos, 21-Profile
- **Durumlu etkileşimler:** —

## 19 · Sohbet

- **Kaynak:** `source/G-19-Chat.dc.html` · **Görüntü:** `reference/G-19-Chat.png` · **Yükseklik:** 1412 pt
- **Route:** `app/chat/[id].tsx`
- **İçerik:** Üst çubuk (avatar, ad, "çevrimiçi · oynuyor"); baloncuklar (gelen `surface1`, giden `primary`); paylaşılan oyun kartı ("İncele"), haber ve gönderi kartları; yazıyor göstergesi; alt giriş çubuğu (+, metin, gönder).
- **Bileşenler:** `Avatar`, `Button`, `DiscountTag`, `IconButton`, `StoreBadge`
- **Gittiği ekranlar:** 18-Messages, 21-Profile, 07-GameDetail, 17-NewsDetail, 13-PostDetail
- **Durumlu etkileşimler:** —

## 20 · Bildirimler

- **Kaynak:** `source/G-20-Notifications.dc.html` · **Görüntü:** `reference/G-20-Notifications.png` · **Yükseklik:** 1048 pt
- **Route:** `app/notifications.tsx`
- **İçerik:** NavBar "Bildirimler" + tümünü okundu yap; filtre çipleri (Tümü / Fiyatlar (2) / Sosyal / Haberler / Topluluk); "Bugün" ve "Daha önce" grupları; NotificationRow türleri: fiyat düşüşü ("Mağazaları gör" renkli buton), beğeni, istek listesi alarmı, haber, topluluk yanıtı, arkadaş etkinliği, takip ("Takip et"), takvim geri sayımı, video yüklemesi.
- **Bileşenler:** `Avatar`, `Button`, `Chip`, `FollowButton`, `IconButton`, `NavBar`, `NotificationRow`
- **Gittiği ekranlar:** 04-Home, 08-Prices, 13-PostDetail, 09-Wishlist, 17-NewsDetail, 15-VideoPlayer
- **Durumlu etkileşimler:** takip

## 21 · Profil

- **Kaynak:** `source/G-21-Profile.dc.html` · **Görüntü:** `reference/G-21-Profile.png` · **Yükseklik:** 1735 pt
- **Route:** `app/(tabs)/profile.tsx`
- **İçerik:** Kapak görseli (`gradients.profileHeader`) + paylaş / ayarlar; avatar ve Lv rozeti, sağda "Profili Düzenle"; ad (display), kullanıcı adı · bağlı Steam, biyografi; takipçi / takip / arkadaş sayıları; "Şu an oynuyor" kartı (ilerleme çubuğu); 4 StatTile (Tamamlanan / İnceleme / Saat / Başarım); Segmented (Gönderiler / Oyunlar / İncelemeler / Medya); Şu an oynuyor listesi; Tamamlananlar (oynama süresiyle); İstek Listesi; Favoriler.
- **Bileşenler:** `Button`, `GameCardSmall`, `IconButton`, `SectionHeader`, `Segmented`, `StoreBadge`, `TabBar`
- **Gittiği ekranlar:** 23-Settings, 22-EditProfile, 18-Messages, 07-GameDetail, 09-Wishlist, 04-Home, 10-Community, 14-Videos
- **Durumlu etkileşimler:** —

## 22 · Profili Düzenle

- **Kaynak:** `source/G-22-EditProfile.dc.html` · **Görüntü:** `reference/G-22-EditProfile.png` · **Yükseklik:** 1356 pt
- **Route:** `app/profile/edit.tsx`
- **İçerik:** Üst çubuk (Vazgeç / "Profili Düzenle" / Kaydet); kapak ("Kapağı değiştir") ve kamera rozetli avatar; TextField'lar: Görünen ad, Kullanıcı adı ("Kullanılabilir" başarı durumu), Biyografi (86/160 sayaç, odak), Konum; "Oyun hesapları" ListGroup (Steam bağlı, diğerleri "Bağla"); Favori türler çipleri + "Ekle"; "Gizlilik" Switch'leri.
- **Bileşenler:** `Button`, `Chip`, `ListGroup`, `ListRow`, `Switch`, `TextField`
- **Gittiği ekranlar:** 21-Profile
- **Durumlu etkileşimler:** anahtarlar

## 23 · Ayarlar

- **Kaynak:** `source/G-23-Settings.dc.html` · **Görüntü:** `reference/G-23-Settings.png` · **Yükseklik:** 1676 pt
- **Route:** `app/settings.tsx`
- **İçerik:** NavBar "Ayarlar"; profil satırı (avatar 52, "Hesap, güvenlik ve bağlı hesaplar"); ListGroup'lar: Bildirimler (5 Switch + Bildirim sıklığı, alt not), Fiyat tercihleri (Para birimi, Bölge, Platformlarım, Takip ettiğim mağazalar), Görünüm ve erişilebilirlik (Tema, Yazı boyutu, Hareketi azalt, Video önizleme), Gizlilik ve güvenlik, Destek; "Çıkış yap" (kırmızı); sürüm metni.
- **Bileşenler:** `Avatar`, `ListGroup`, `ListRow`, `NavBar`, `Switch`
- **Gittiği ekranlar:** 21-Profile, 22-EditProfile, 03-Login
- **Durumlu etkileşimler:** anahtarlar
