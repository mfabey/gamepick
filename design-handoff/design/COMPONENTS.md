# Bileşen envanteri

Her satırda şunlar var:

- **RN adı:** kodda kullanılacak ad.
- **Kit:** tasarımı üreten fonksiyon (`design/kit/`). Kesin değerler orada.
- **Ölçüler:** önemli değerlerin özeti.

Birimler pt. Renk adları `theme/tokens.ts` → `colors` ile aynıdır.

Kırmızı iki tondadır: **red** metin ve ikon kırmızısıdır (`#F34545`), **brand** dolgu kırmızısıdır (`#BC0C0C`).

**Hazır teslim edilenler:**

- `Icon`, `TabIcon` (`code/components/Icon.tsx`)
- `Mark`, `Wordmark`, `Lockup` (`code/components/brand/Logo.tsx`)
- `GamerisenTabBar`, `useTabBarInset` (`code/components/navigation/TabBar.tsx`)
- Tüm değerler (`code/theme/tokens.ts`)

Aşağıdakilerin hepsi senin repoda yazılacak.

## 1. Temel

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `Txt` | `txt()` | `typography.*` varyantları; `numberOfLines`; varsayılan renk `text`. Gövde harf aralığı -0.01em. |
| `PressableScale` | `.press` sınıfı | Basınca `scale 0.97`, `opacity 0.9`, 150 ms ease-out (Reanimated). Tüm kartlar ve butonlar bunun üstüne kurulur. |
| `CoverImage` | `img()` | expo-image. `width`, `height`, `radius` (12 / 14 / 16 / 18 / 22), `contentPosition` (tasarımdaki `object-position`). |
| `GlassView` | `DARKGLASS` | BlurView `tint="dark"`, intensity ≈ 40 ve üstünde `rgba(0,0,0,0.42)` katmanı. Görsel üstü butonlar ve etiketlerde kullanılır. |

## 2. Butonlar ve kontroller

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `Button` | `btn()` | **Türler:** <br>• `primary`: zemin `primary`, metin `onPrimary`. <br>• `secondary`: `surface2` / `text`. <br>• `tertiary`: şeffaf / `red`. <br>• `destructive`: şeffaf / `red`. <br>• `tinted`: `accentTint` / `red`. <br>• `onArt`: `onArtButton` + blur 16 / beyaz. <br>**Yükseklik:** 48 / 44 / 40 / 36. <br>**Yazı boyu:** 48'de 16, 44'te 15, diğerlerinde 14; ağırlık 600. <br>**Köşe:** yükseklik ≥ 40 ise 12, değilse 10. <br>**Yatay boşluk:** yükseklik ≥ 44 ise 18, değilse 14. <br>**İkon:** öndeki ikon yazı boyu + 2, sondaki ikon yazı boyu + 1; çizgi 2.2; aralık 8. <br>**Durumlar:** basılı (0.97 / 0.9), devre dışı (opaklık 0.38), yükleniyor (18 pt dönen yay). DS 2'ye bak. |
| `IconButton` | `iconbtn()` | 44 pt daire; ikon 22 (başlıkta), çizgi 2. <br>**Varyantlar:** düz, dolgulu zemin, `onArt` (GlassView). <br>**Nokta:** 8 pt `red`; üstten 9, sağdan 10; çevresinde 2 pt zemin halkası. <br>**Rozet:** en az 18 × 18; zemin `brand`, yazı 11/700 beyaz; üstten 4, sağdan 2. |
| `HeartButton` | `heart()` | 36 pt GlassView; kalp 18. <br>Seçiliyken dolgu ve çizgi `red`. <br>Dokununca 240 ms pop (1 → 1.28 → 0.92 → 1). Erişilebilirlik etiketi "İstek listesine ekle / çıkar". |
| `Chip` | `chip()` | Yükseklik 34, yatay boşluk 14, hap şekli, 14/600. <br>Seçili: zemin `primary`, yazı `onPrimary`. Seçili değil: zemin `surface2`, yazı `text`. <br>İsteğe bağlı: önde 15 pt ikon, sonda 14 pt aşağı ok. |
| `Segmented` | `segmented()` | Yükseklik 36, iç boşluk 2, köşe 10, zemin `fill`. <br>Kaydırma parçası: köşe 8, `segmentedThumb`, `shadow.segmentedThumb`. <br>Etiketler 13/600. Parça 250 ms `standard` eğrisiyle kayar. |
| `Switch` | `toggle()` | 51 × 31, düğme 27. Açık `green`, kapalı `switchOff`. <br>iOS'ta yerel `Switch` birebir aynı ölçüde: `trackColor={{ true: colors.green }}`. |
| `TextField` | `field()` | **Etiket:** 13/18 600 `text2`, alanla arası 6. <br>**Kutu:** yükseklik 48, köşe 12, zemin `surface1`, iç boşluk 0 14, ikon 18 `text2`, girdi 16. <br>**Çerçeve:** normalde 1 pt `line`, odakta 2 pt `red`, hatada 2 pt `red`. <br>**Alt yardım metni:** 12/16 ve 13 pt ikon. Hatada `alert` ikonu ve `red`, başarıda `checkc` ikonu ve `green`, diğer durumlarda `text3`. |
| `SearchField` | `search_field()` | Yükseklik 40, köşe 12, zemin `fill`, iç boşluk 0 8 0 12. <br>Arama ikonu 18 (çizgi 2.2, `text2`), yer tutucu metin 16 `text3`, mikrofon 17. <br>Temizle butonu: 28 pt alan içinde 18 pt `#8E8E93` daire ve 11 pt çarpı. <br>Odakta içte 1.5 pt `red` halka. |
| `FollowButton` | `follow_btn()` | Yükseklik 34, köşe 10, yatay boşluk 14, 14/600. <br>Takip edilmiyorken: zemin `primary`, metin "Takip et". <br>Takip edilirken: zemin `surface2`, yazı `text2`, 14 pt tik ikonu, metin "Takip ediliyor". <br>Renk 200 ms'de geçer. |
| `Toast` | DS 4 | Genişlik 350, yükseklik 52, köşe 14, zemin `surface3`, `shadow.toast`. <br>İkon 18, metin 14/500, isteğe bağlı `tertiary` eylem butonu (36). |
| `Skeleton` | `.sk` | Degrade `gradients.skeleton`, 1,3 sn doğrusal kayma. Ölçüsü gerçek kartla aynı; içerik gelince düzen kaymaz. |

## 3. Gezinme

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `GamerisenTabBar` (hazır) | `tabbar_ios()` / `tabbar_android()` | **Yalnızca ikon.** Etiketler ekranda yok; `accessibilityLabel` ve uzun basınca çıkan etiket balonu olarak kalır. Ayrıntı: DS 7 panosu, `tokens.ts` → `tabBar`. <br>**iOS · cam kapsül:** 350 × 62, köşe 31; yanlardan 20, alttan 21 (güvenli alan − 13). iOS 26'da `GlassView`, daha eskide BlurView + `rgba(30,30,32,.64)`. Seçili sekmede 60 × 52 cam mercek (beyaz %12), 250 ms kayar. İkon 26: kapalı `#C7C7CC` çizgi 1.9, açık `red` dolu. Profil 28 pt avatar. Rozet 18, 2 pt `#2A2A2D` halka. Basınca ikon %92, seçimde dokunsal geri bildirim. <br>**Android · Material 3:** 64 + sistem alanı, zemin `bg2`. Seçili sekmede 56 × 32 hap gösterge (`rgba(188,12,12,.24)`), ortadan açılarak 250 ms. İkon 24: kapalı `#A1A1A6`, açık `red` dolu. Profil 24 pt avatar. Rozet 16, halkasız. Dokununca dalga efekti. |
| `HomeHeader` | `home()` başlık | Güvenli alan + 44. Solda `Lockup` (işaret 32, yazı 22, aralık 9). <br>Sağda arama, bildirim (noktalı) ve 44 pt dokunma alanı içinde 30 pt avatar. Sağ kenar -6. |
| `PageHeader` | `page_head()` | Güvenli alan + 52; iç boşluk 0 20. Başlık 28/34 700, harf aralığı -0.03em. <br>Sağdaki ikonlar arası 4, sağ kenar -8. |
| `NavBar` | `nav_bar()` | Güvenli alan + 44. Üç sütun: 96 / esnek / 96. <br>Geri butonu 44 pt; ok 24 (çizgi 2.3), sol kenar -10. <br>Başlık 17/22 600; isteğe bağlı alt başlık 12/14 `text2`. <br>Altta isteğe bağlı 0.5 pt `line`. |
| `SectionHeader` | `sec_head()` | Yan boşluk 20, satır yüksekliği 28. Başlık 20/26 700, harf aralığı -0.02em. <br>Bağlantı: "Tümü" 15/500 `text2` + 16 pt ok. <br>İsteğe bağlı alt yazı: 13/18 `text2`, tek satır, üstünde 2 boşluk. |
| `StickyBottomBar` | `sticky_bar()` | Yükseklik 92 (10 + 48 buton + 34), iç boşluk 10 20 34. Zemin `tabBar` + blur. Oyun Detayı ve Fiyat ekranlarında. |
| `PageDots` | `home()` | Seçili nokta 18 × 6 `red`, diğerleri 6 × 6 `pageDotOff`, aralık 6. Karusel ile arası 12. |

## 4. Oyun ve fiyat

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `HeroCard` | `hero()` | 334 × 420, köşe 22, görselin üstünde `gradients.heroCard`. <br>**Sol üst etiket:** yükseklik 28, yatay boşluk 10, köşe 8, GlassView; 12/600 beyaz + 13 pt `spark` ikonu. <br>**Alt blok (kenarlardan 18 içeride):** <br>• Başlık 28/32 700 beyaz, harf aralığı -0.03. <br>• Bilgi satırı 13/18 `onArt`, 12 pt yıldız; üstünde 4. <br>• Fiyat satırı: yükseklik 28, üstünde 12, aralık 8. Fiyat 22 beyaz, eski fiyat 14, indirim (13, yükseklik 24), mağaza 12 `onArt`. <br>• Eylemler: üstünde 14, aralık 10. Birincil "İncele" butonu (44, esnek) + 44 pt kalp (ikon 20). <br>**Kaydırma rayı:** aralık 10, yan boşluk 20, 344'lük adımlarla yapışır. |
| `GameCard` | `game_m()` | Genişlik 148; kapak 198, köşe 14. <br>İndirim etiketi sol altta (8). Kalp sağ üstte (8), 34 pt, ikon 17. <br>**Başlık:** 15/20 600, tek satır, üstünde 8. <br>**Bilgi satırı:** 12 `text2`, "tür · ★ puan", yükseklik 16. <br>**Fiyat satırı:** yükseklik 22, üstünde 6. Fiyat 16, eski fiyat 12, sağda 16 pt mağaza rozeti. |
| `GameCardSmall` | `game_s()` | Genişlik 106; kapak 142, köşe 14. <br>Başlık 14/18 600, tek satır, üstünde 8. <br>Altında 20 yüksekliğinde satır: fiyat 14 + indirim (11, yükseklik 20). |
| `PriceDropCard` | `drop_card()` | Genişlik 264, köşe 16, zemin `surface1`. Görsel 132; indirim etiketi 10, 10'da. <br>**İç boşluk 12:** <br>• Başlık 15/20 600, tek satır. <br>• Fiyat satırı: yükseklik 24, üstünde 6. Eski fiyat 13, 12 pt ok, fiyat 18, sağda mağaza. <br>• Altında (6) düşüş notu: 12/600 `green`, 14 pt `down` ikonu. |
| `DealCard` (bilet) | `deal_card()` | Genişlik 300, köşe 20, zemin `surface1`. <br>**Üst kısım (iç boşluk 16 16 14):** kapak 64 × 84 (köşe 12), başlık 16/21 600 iki satır, mağaza, indirim (14, yükseklik 26). <br>**Ayraç:** 1.5 pt kesikli çizgi `rgba(255,255,255,.14)`. İki yanında 18 pt çentik; çentikler zemin renginde daire, kenardan -26. <br>**Fiyatlar:** iki sütun. Sol "En düşük fiyat" 12/16 `text2` + fiyat 28; sağ "Normal fiyat" + eski fiyat 17. <br>**Buton:** `secondary` 44, tam genişlik, "Mağazaları Karşılaştır". |
| `DiscountTag` | `disc()` | Zemin `green`, yazı `onGreen` 12/700, rakamlar eşit genişlikte. Yükseklik 22, yatay boşluk 7, köşe 6. <br>Diğer boylar: (11, 20), (13, 24), (14, 26). |
| `Price` / `OldPrice` | `price()` / `old()` | Fiyat: `priceStyle(size)`. Eski fiyat: 13 `text3`, üstü çizili. |
| `PriceDrop` | `drop()` | 12/600 `green`, 14 pt `down` ikonu, aralık 4. Artış için `up` ikonu ve `orange`. |
| `StoreBadge` | `mono()` / `store()` | 16 × 16, köşe 5, harf 9/700; renkler `storeBadges`'ta. Mağaza adıyla: 12/500 `text2`, aralık 5. <br>`StoreRow` içinde 40 × 40, köşe 11, harf 16. |
| `StoreRow` | `store_row()` | Yükseklik 64, iç boşluk 0 14 0 16, aralık 12. <br>Solda 40 pt mağaza rozeti. Ortada ad 15/20 600 ve alt satır 12/16 `text2`. Sağda fiyat 16 + ek bilgi ve 16 pt `text3` ok. <br>Ayraç soldan 68'den başlar. |
| `PriceChart` | `chart()` | react-native-svg, 318 × 120. <br>**Çizgi:** basamaklı, 2 pt `text`. **Alan:** `rgba(255,255,255,.06)`. <br>**Izgara:** kesikli 3/5, `rgba(255,255,255,.07)`. <br>**En düşük nokta:** yarıçap 5 `green`, çevresinde 3 pt `surface1`; üstünde 11/700 yeşil etiket. <br>**Son nokta:** 9 pt hale + 5 pt beyaz. |
| `StatTile` | `stat()` | Yükseklik 84, iç boşluk 12, köşe 14, zemin `surface1`. İkon 18, değer 18/24 700, etiket 12/16 `text2`. |
| `StatusPill` | `status()` | Yükseklik 22, yatay boşluk 8, köşe 6, 12/600. <br>• Oynuyor: `greenTint` / `green` + 6 pt nokta. <br>• Tamamladı: `rgba(255,255,255,.1)` + `checkc`. <br>• Tavsiye ediyor: `goldTint` / `gold` + dolu yıldız. |

## 5. Topluluk ve sosyal

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `Avatar` | `avatar()` | Boylar 24 / 30 / 40 / 56. <br>Görsel ya da baş harf; baş harfte yazı boyu × 0.4, ağırlık 600, zemin `avatarPalette`. <br>**Çevrimiçi noktası:** en az 10 (boyun %28'i), `green`; 2.5 pt zemin halkası; sağ alt -1. <br>**Oyun rozeti:** boyun %46'sı, köşe 7, 2.5 pt halka; sağ alt -4. <br>**Halkalı varyant:** 3 pt boşluk + 2 pt `red` çerçeve. |
| `FriendActivity` | `friend()` | Genişlik 96, ortalı. 56 pt avatar ve oyun rozeti. <br>Ad 13/18 600, üstünde 10. Oyun 12/16 `text2`. Durum 11/14: oynuyorsa `green` nokta ve 600 yazı, değilse `text3`. |
| `TrendCard` | `trend_card()` | Köşe 18, zemin `surface1`, iç boşluk 4 0. <br>**Satır:** yükseklik 60, aralık 12. Solda 28 pt `#` kutusu (köşe 8, `surface2`). Etiket 16/21 600, bilgi 12/16 `text2`. <br>**Sağdaki gösterge:** yükselişteyse turuncu hap (`orangeTint`, `flame` ikonu, 11/700), değilse `up` + 12 `text2`. |
| `PostHeader` | `post_head()` | Yükseklik 40, aralık 12. 40 pt avatar. <br>Ad 15/600 + rozet + "· zaman" 13 `text3`. Kullanıcı adı 13/18 `text3`. <br>Sağda 40 pt "daha fazla" butonu (ikon 20 `text3`). |
| `Post` | `post()` | Gövde soldan 52 içeride, başlıkla arası 10. <br>• Metin 15/22, satır sınırlı. <br>• Medya: üstünde 12, köşe 14. <br>• Oyun etiketi: üstünde 10; yükseklik 32, köşe 10, zemin `surface1`; 24 pt küçük resim (köşe 7), 13/600, ok ve `StatusPill`. <br>• Eylemler: üstünde 6. |
| `PostActions` | `actions()` | Yükseklik 40, sol kenar -10. <br>Beğen (kalp 20 + sayı 13/500; beğenilince `red` dolgu ve pop), yorum, paylaş, boşluk, kaydet (seçiliyken `red` dolgu). <br>Her biri en az 44 genişlik, yatay boşluk 10. Beğeni sayısı anında güncellenir, hata olursa geri alınır. |
| `Badge` | `badge()` | Yükseklik 18, yatay boşluk 6, köşe 5, 11/700, harf aralığı 0. <br>• `lv`: `pillNeutral`. <br>• `trophy`: `goldTint` / `gold`. <br>• `q`, `poll`, `mod`: `pillNeutral` + 11 pt ikon. |
| `Comment` | `comment()` | Avatarla arası 10. <br>Ad 14/600 + rozet + "Yazar" hapı + zaman 12 `text3`. Metin 15/21, üstünde 4. <br>Eylem satırı: yükseklik 28, üstünde 6, aralık 18. Kalp 15 + sayı 13/600 `text2`, "Yanıtla". <br>Yanıtlar soldan 52 içeride. |
| `UserRow` | `user_row()` | Yükseklik 60, aralık 12. Ad 15/20 600; "kullanıcı adı · bilgi" 13/18 `text2`. Sağda `FollowButton`. |
| `CommunityRow` | `comm_row()` | Yükseklik 60. 44 pt küçük resim (köşe 12). Ad 15/20 600, bilgi 13/18 `text2`. |
| `MessageRow` | `msg_row()` | Yükseklik 72, iç boşluk 0 20, aralık 12. <br>**Ad:** 16; okunmamışsa 700, değilse 600. <br>**Saat:** 12; okunmamışsa `red` 600, değilse `text3`. <br>**Önizleme:** 14, tek satır; okunmamışsa `text`, değilse `text2`. <br>**Sağ:** okunmamışsa `CountBadge`, okunmuşsa 15 pt tik. |
| `NotificationRow` | `notif()` + `nlead()` | En az 76 yükseklik, iç boşluk 12 20 12 22, aralık 12. <br>**Okunmamış:** zemin `rgba(255,255,255,.04)` + solda (8) 8 pt `red` nokta. <br>**Sol öğe:** 44 pt renkli daire içinde 20 pt ikon (fiyat `green`, beğeni `red`, takvim `orange`, diğerleri `surface2`) ya da 44 pt görsel (köşe 12) ve köşesinde 22 pt ikon rozeti. <br>**Metin:** 14/20, iki satır. Zaman 12/16 `text3`. Sağda isteğe bağlı 44 pt küçük resim (köşe 10). |
| `CountBadge` | `count()` | En az 20 × 20, hap şekli, zemin `brand`, yazı 11/700 beyaz. |
| `LiveTime` | `fresh()` | 7 pt `red` nokta, 1,8 sn nabız (0 → 6 pt halka) + 600 `red` metin. Canlı değilse `text3`. |

## 6. Medya ve haber

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `VideoCard` | `video()` | Genişlik 280; küçük resim 158, köşe 16. <br>**Görselin üstünde:** <br>• Tür etiketi sol üstte. <br>• Süre sağ altta. <br>• Ortada 44 pt GlassView içinde dolu `playf`. <br>• Etiketler (`OverlayTag`): yükseklik 22, yatay boşluk 7, köşe 6, `rgba(0,0,0,.62)`, 11/700 beyaz. <br>**Bilgi (üstünde 10):** başlık 15/20 600 iki satır; "yaratıcı · bilgi" 13/18 `text2`. <br>**İsteğe bağlı oyun çipi:** yükseklik 24, köşe 7, `surface1`, 18 pt küçük resim, 12/600 `text2`. |
| `ShortCard` | `short()` | 132 × 234, köşe 16, `gradients.shortCard`. <br>Alttan 10: başlık 13/17 600 beyaz iki satır; izlenme 12/600 `onArt` + 11 pt dolu `playf`. |
| `NewsFeature` | `news_feat()` | Genişlik 350; görsel 196, köşe 18. <br>**Bilgi satırı:** yükseklik 16, üstünde 12, 12 pt. Kategori 600, "·", `LiveTime`, "· kaynak" `text3`. <br>**Başlık:** 18/24 700, harf aralığı -0.015em, iki satır, üstünde 6. <br>**İsteğe bağlı açıklama:** 14/20 `text2`, iki satır. |
| `NewsRow` | `news_row()` | Yükseklik 72, aralık 14. Küçük resim 96 × 72, köşe 12. <br>Bilgi satırı yüksekliği 16. Başlık 15/20 600, iki satır, üstünde 6. |
| `MediaImage` | `media_img()` | Köşe 14. İsteğe bağlı sol üst etiket: yükseklik 24, köşe 7, GlassView, 12/600. |
| `PlayButton` | `playc()` | GlassView daire (44 ya da 48). Dolu `playf` ikonu, boyun %40'ı, 2 pt sağa kaydırılmış. |

## 7. Liste ve ayarlar

| RN adı | Kit | Ölçüler ve davranış |
|---|---|---|
| `ListGroup` | `group()` | **Başlık:** 13/18 600 `text2`, yan boşluk 36, altında 8. <br>**Kutu:** yanlardan 20 boşluk, köşe 16, zemin `surface1`. <br>**Alt not:** 12/16 `text3`, üstünde 8. |
| `ListRow` | `row_item()` | Yükseklik 52, iç boşluk 0 16, aralık 14. <br>İsteğe bağlı ikon kutusu: 30 pt, köşe 8, zemin `surface2`, ikon 17. <br>Etiket 16 (tehlikeli işlemde `red`), değer 15 `text2`, 16 pt `text3` ok ya da `Switch`. <br>Ayraç ikon varsa soldan 60, yoksa 16'dan başlar. |

## 8. Yatay raylar

Yan boşluk 20; kartlar arası boşluk ve yapışma adımı (`snapToInterval`):

| Ray | Aralık | Adım |
|---|---|---|
| HeroCard | 10 | 344 (sayfa noktalarıyla) |
| GameCard | 12 | 160 |
| PriceDropCard | 12 | 276 |
| DealCard | 12 | 312 |
| VideoCard | 14 | 294 |
| FriendActivity | 8 | yapışma yok |
| GameCardSmall (ızgara) | 16 (3 sütun) | — |

Kaydırma çubuğu gizli (`showsHorizontalScrollIndicator={false}`), `decelerationRate="fast"`.

## Ekran başına kullanım

Ekran başına hangi bileşenlerin kullanıldığı için `SCREENS.md` dosyasına bak.
