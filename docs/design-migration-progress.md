# Gamerisen 2.0 — uygulama günlüğü

## 22 Eylül 2026 — temel bileşen grubu

Kullanıcı kararları: **açık/koyu/sistem tercihi korunacak**; video kataloğu ve ayrı oynatıcı eklenirken **Reels, Kısa klipler üzerinden korunacak**. Tasarımda eksik olan ürün bölümlerinin kodlanması da uygulama kapsamına alındı. Bu kayıt bütün geçişin tamamlandığı anlamına gelmez.

### Uygulananlar

- Teslim paketi `design-handoff/` altında, orijinal içerikleri korunarak eklendi.
- `mobile/src/theme/tokens.ts`: yeni tasarım token'ları; animasyon eğrileri Reanimated'in UI-thread uyumlu Easing kaynağını kullanıyor.
- `palettes.ts` ve `useDesignTheme.ts`: canlı koyu/açık palet. Açık palet, paket açık tema içermediği için semantik uyarlamadır; tasarımın birebir açık varyantı olarak sunulmuyor.
- `theme.js` / ThemeContext: eski renk adları yeni değerlere bağlandı; ortak APP_PALETTES ile başlangıç ve canlı palet tek kaynaktan geliyor. Mevcut ayar anahtarı ve sistem tema aboneliği korundu.
- Hazır SVG ikonları, Mark/Wordmark/Lockup eklendi; varsayılan renkler canlı temayı izliyor.
- `GamerisenTabBar` + `AppTabBar`: mevcut beş sekmeye bağlandı. iOS 62pt cam kapsül, Android 64pt + sistem alanı Material görünümü; ikonlar, profil avatarı, uzun basma etiketi ve okunmamış rozeti. Mevcut tabPress/tabLongPress, unread ve video gizlenme bağlantıları korundu. DS7 sabit geometrisi uygulandı; eski kaydırmada daralma yeni çubuğa uygulanmıyor.
- İki platformda çubuk overlay. `tabGeometry` ile çubuk, liste alt dolguları ve Reels yatay kontrollerinin hesabı eşlendi; Android'de navigator payı + liste dolgusu iki kez uygulanmıyor.
- `ui/Primitives.tsx`: Txt, PressableScale, Button, IconButton, Chip, Segmented, TextField, Switch, CoverImage, SectionHeader, ListGroup, ListRow. Bu ilk ortak kontrol grubudur; bütün COMPONENTS envanteri henüz tamamlanmadı.
- `/design-system`: geliştirme sürümüne özel etkileşimli galeri; üretimde ana sayfaya yönlenir. Gerçek ekranlara örnek içerik eklenmedi.
- Inter 400/500/600/700, font hazırlığını bekleyen splash, yeni iOS açık/koyu/tonlu simgeler ve Android uyarlanabilir/tek renk simgeler. Açık splash koyu logo varyantını kullanır. Inter'in yalnız dört kullanılan dosyası import edilir.
- `expo-blur` ve Inter eklendi. Expo denetiminin talep ettiği SDK54 yama güncellemeleri uygulandı: Expo ~54.0.37, constants ~18.0.14, updates ~29.0.20.

### Doğrulama

- Değişiklik öncesi mevcut `npm run check` zinciri geçti.
- Değişiklik sonrası mevcut denetimler, yeni `check:design-v2` ve TypeScript kontrolü geçti.
- Yeni doğrulama gerçek token modüllerini okuyarak semantik anahtar paritesi, temel metin/zemin kontrastı, marka/primary ayrımı, alias çıktıları ve altı safe-area düzenini denetler. Native animasyon motorunu çalıştıran test değildir.
- Tema sabit renk ve donuk stil denetimleri TS/TSX dosyalarını da kapsayacak şekilde genişletildi.
- `expo install --check`: uyumlu; `expo-doctor`: **18/18** geçti.
- iOS ve Android üretim JS paketleri export edildi. Bu işlem imzalı native uygulama derlemesi veya cihaz testi değildir.
- Bu ortamda Android SDK yolunda adb bulunmuyor; iOS simülatörü de yok. Native cam/ripple, gerçek dokunma, ekran okuyucu, klavye ve piksel karşılaştırması **henüz doğrulanmadı**. Yeni native bağımlılık ve ikon/splash için yeni development/release build gerekli.

### Sıradaki uygulama işleri

1. Ortak kart ailelerinin kalanları ve durum bileşenleri; ana sayfanın hero, fırsat, haber/video bölümleri.
2. Oyun detayı ve fiyat karşılaştırma; fiyat geçmişi/hedef alarm için gerçek veri sözleşmesi.
3. Topluluk ve oluşturma/detay akışları; takip ve oyun toplulukları için sunucu desteği.
4. Arama, bildirim merkezi, haber detayı, profil ve ayarlar; yeni işlevler için kalıcı veri ve yetki kontrolleri.
5. Video kataloğu + ayrı oynatıcı + korunmuş Reels.
6. iOS/Android gerçek görsel/etkileşim doğrulaması; tasarım farklarının kapatılması.

Mevcut API'ler ve iş mantığı bu grupta değiştirilmedi. Fotoğraf yükleme, mikrofon/kamera izinleri, iPad desteği ve PiP gibi bilerek kapalı özellikler açılmadı. Kalan ekranlar ve yeni veri özellikleri tamamlanmış sayılmıyor.

### 22 Eylül — Ana sayfa başlığı ve oyun kartları

- Yeni logo kilidi, 44 pt arama/haber girişleri ve ortak bölüm başlıkları bağlandı. Bildirim merkezi henüz olmadığından haber girişi çalışır durumda korundu; sahte bildirim noktası eklenmedi.
- Ana sayfanın katalog rayları DS 3 `GameCard` kullanıyor: 148×198 kapak, 14 pt köşe, başlık/bilgi/fiyat satırları, indirim etiketi ve istek listesi kalbi. Ray aralığı 12, bölüm aralığı 32.
- Fiyatlar `usePrice` önbelleğinden; kalp `WishlistContext` kimlik eşleştirme ve kalıcılığından besleniyor. Veri yokken fiyat uydurulmuyor. Öneri eleme düğmesi ve kapaktan detay geçişi korundu; düz gezinmede de Steam appid taşınıyor.
- Öneri sıralaması, sosyal akış, engelleme/moderasyon ve widget güncellemesi değiştirilmedi.
- `npm run check` ve iki platform export başarılı. Native cihazda görsel eşleme henüz yapılmadı. Bu bölüm ana sayfanın tamamının birebir bittiği anlamına gelmez; mağaza rozeti ve kalan kart aileleri de sırada.

### 22 Eylül — Denetim (Claude)

**Kapsam:** Bu günlükteki iki grup ve günlüğe girmemiş sonraki iş denetlendi. Sonraki iş şunları içeriyor:
- Videolar kataloğu ile `/reels`, `/video/[id]` ve `/news/[id]` ekranları.
- Sunucuda kalıcı haber kimliği (`news-identity.js`) ve video kimliğiyle arama.
- Uygulama içi "Hareketi azalt" ve "Otomatik oynat" tercihleri.
- Ayarlar'daki tema seçici.

**Doğrulama (düzeltmelerden önce ve sonra):**
- `npm run check`: `tsc`, `check:design-v2` ve `check:design-icons` dahil, geçti.
- Web `npm run build` geçti: erişim politikası 92 route, CORS temiz.
- iOS ve Android export alındı.
- Babel kapsam taraması: çalışma anında bağlanmamış ad yok.
- `node scripts/check-media-details.mjs` geçti.

**Bulunan ve düzeltilen:**
1. Kök layout fontlar yüklenene kadar `null` döndürüyordu. Bu aralıkta soğuk açılışta gelen bildirim yanıtı ya da paylaşım uzantısının bağlantısı `router.push` çağırabiliyordu. Navigator henüz olmadığı için expo-router hata fırlatır. Üç efekt `hazir`e bağlandı; Stack'in ilk çizildiği commit'te çalışıyorlar.
2. HeroRail trendin ilk beşini gösterirken aynı oyunlar trend şeridinde ya da akışta ikinci kez görünüyordu. Artık hero ilk beşi alıyor, aşağıdaki bölümler kalanı.
3. `/video/[id]` istek listesine ham video öğesini yazıyordu (`hasSteam: false`), bu yüzden fiyat izleme Steam'i atlıyordu. Artık Reels'teki oyun nesnesinin aynısı kullanılıyor.
4. Reels geri düğmesi temalı renkteydi; açık temada videonun üstünde koyu kalıyordu. Beyaz yapıldı, yatay payları döndürme düğmesiyle aynı.
5. Sekme çubuğu titreşimi artık yalnız seçim değişince çalışıyor.
6. İpucu balonu ekran içinde kalıyor; kenardaki sekmelerde dışarı taşıyordu.
7. iOS kapsül gölgesi, `overflow:hidden`'ın kırpmaması için ayrı katmana alındı.
8. Mercek ilk yerleşimde artık animasyonsuz yerine oturuyor.
9. İpucu şeridi eski 58/24 ölçüsünden konumlanıyordu: yeni çubuğun üstünde Android'de 2, iOS'ta 17 pt boşluk kalıyordu. Artık `tabGeometry` + 8.
10. HeroRail sayfa noktaları COMPONENTS değerlerine getirildi: seçili 18×6 kırmızı, aralık 6, karuselden 12.

**Açık kalanlar (bu denetimde düzeltilmedi):**
- Primitives eksikleri:
  - IconButton: nokta, rozet ve onArt varyantı.
  - ListRow: 30 pt ikon kutusu ve ayraçlar.
  - SectionHeader: "Tümü" bağlantısı 600 değil 500 olmalı.
  - Switch: iOS kapalı zemin rengi.
  - Segmented: başparmak gölgesi.
  - Button: onArt varyantı ve sondaki ikon.
  - TextField: ikonlar ve başarı durumu.
- Videolar kataloğu sanallaştırılmamış bir `ScrollView`; sayfa ekledikçe büyüyor. FlashList'e geçmeli.
- Ana sayfanın haber ve video bölümleri açılışta iki ek istek atıyor. Görünür olunca yüklemek ölçülerek değerlendirilmeli.
- Kart ölçüleri (HeroCard iç boşlukları, NewsFeature/NewsRow, GameCard mağaza rozeti) `.dc.html` ile karşılaştırılmadı.
- Native doğrulama yapılmadı: cam, gölge, ripple, Inter, simge/splash. Cihaz ya da simülatör gerekiyor.
- Sürüm hâlâ 2.7.2 (runtimeVersion appVersion). Yeni native paketlerle OTA yayınlanmamalı (plan §5.3).
- Tüm iş `main`'de commit'lenmemiş duruyor (plan §6.6, soru 10). → Sonradan `design-v2` dalına iki commit olarak alındı (`b9de3c1`, `239f54b`).

### 22 Eylül — Bileşen kütüphanesi, COMPONENTS §1–3 (Claude)

Ölçüler kit'ten (`k.py` btn/iconbtn/chip/segmented/toggle/field/search_field/sec_head/page_head/nav_bar, `c.py` heart/follow_btn/row_item/group, `s1.py` home başlığı ve sticky_bar) ve DS 2 / DS 4 kaynaklarından alındı. Sayılar `tokens.ts → component`'e yazıldı; bileşenlerde sayı yok.

**Yeni:**
- `GlassView`: görsel üstü cam. Kaydırılan listeler için bulanıklıksız kip (plan §6.1).
- `HeartButton`: kit'teki anahtar karelerle 240 ms pop, yalnız seçilirken; hafif dokunsal darbe.
- `FollowButton`: 200 ms renk geçişi. Bir API'ye bağlı değil; takip ucu gelene kadar yalnız galeride.
- `SearchField`: temizle düğmesi, düğme kipi, "Vazgeç". Mikrofon bilerek yok (plan §6.4).
- `Toast` + `ToastProvider` (kökte): 3 sn, geri alınabilir eylem, ekran okuyucuya duyuru.
- `Navigation.tsx`: `HomeHeader`, `PageHeader`, `NavBar`, `StickyBottomBar` + `useStickyBarInset`, `PageDots`.
- `scripts/check-scope.mjs` (`check:scope`, zincirde): bağlanmamış adları yakalıyor.
  - Bu işte gerçek bir çökmeyi yakaladı: `Skeleton.jsx`'te kaldırılan `motion` içe aktarımı; iskeletten içeriğe geçişte `ReferenceError`.
  - Hata geri konunca denetimin düştüğü doğrulandı.

**Tamamlanan:**
- `Button`:
  - Görsel üstü varyant ve sondaki ikon.
  - 52 ve 30 pt boylar (DS 2).
  - Yüklenirken yalnız yay; genişlik korunuyor.
  - `onImage`: görsel üstünde temadan bağımsız renk.
- `IconButton`: düz, dolgulu ve görsel üstü varyantlar; 8 pt nokta, rozet.
- `Chip`: ok ve "×" varyantları.
- `Segmented`: başparmak gölgesi, kısa 30 pt boy; uzun etiketler taşmak yerine küçülüyor.
- `Switch`: Android'de tasarımdaki 51×31 anahtar, iOS'ta yerel.
- `TextField`:
  - Odak halkası ayrı katmanda, düzen kaymıyor.
  - İkon, başarı durumu, yardım ikonu, sayaç, şifre göster/gizle.
- `SectionHeader`: 15/500 bağlantı, alt yazı; satır 28 pt kalıyor.
- `ListGroup`/`ListRow`: 30 pt ikon kutusu, 60/16 ayraç, değer 15/400.
- İskelet: surface1 → surface2 süpürme, 1,3 sn.

**Bağlananlar:**
- Ana sayfa başlığı `HomeHeader`'a geçti: arama, haber, avatar. Bildirim merkezi yok; sahte zil eklenmedi.
- HeroRail: cam etiket, `HeartButton` 44/20, `PageDots`, beyaz "Oyunu gör".
- GameCard: kalp ve × bulanıklıksız cam.
- Geri düğmeli başlıklar `NavBar`'a geçti: ayarlar, video ve haber detayı.

**Doğrulama:**
- `npm run check` (19 denetim, `tsc` ve `check:scope` dahil) ve iOS/Android export geçti.
- **Android 16 emülatöründe dev derlemesi** (Pixel 8, 411 dp):
  - Ana sayfa, galeri, Videolar ve Ayarlar koyu ve açık temada ekran görüntüsüyle DS 2 / DS 4'e karşı incelendi.
  - Denenen etkileşimler: yükleniyor, kalp pop, toast gösterim ve kaybolma, uzun basma etiketi, tema geçişi.
  - Emülatördeki tema tercihi sonunda `system`'e geri alındı.
- Emülatörde bulunup düzeltilenler:
  - Açık temada HeroCard butonu görsel üstünde siyahtı.
  - Galerideki liste grubu 20 yerine 40 pt içerideydi.
- Boşta ölçülen FPS 56–60. Kaydırma ve dokunma anında 25–42: dev kipi, sürüm derlemesinde ölçülmedi.

**Açık kalanlar:**
- COMPONENTS §4–7: kart aileleri, fiyat, sosyal, medya ve liste bileşenlerinin geri kalanı.
- Fiyat adımlayıcısı (DS 2 "− ₺500 +") G-08 ile birlikte.
- Fiyat biçimi → **Kullanıcı kararı (22 Eylül): tasarımdaki gibi "₺599"** (sembol önde, binlik ayırıcı nokta: "₺1.199"). `formatPrice` buna göre değişecek (sonraki commit).
- iOS'ta cam/Liquid Glass ve yerel görünüm doğrulanmadı; Mac ya da cihaz gerekiyor.
- Prebuild uyarısı (bu işten önce de vardı): Android'de `userInterfaceStyle` için `expo-system-ui` kurulu değil.

### 22 Eylül — Bileşen kütüphanesi, COMPONENTS §4–7 (Claude)

Ölçüler kit `c.py` / `k.py` fonksiyonlarından; sayılar `tokens.ts → component` altında.
Fiyat biçimi kullanıcı kararıyla tasarımdaki gibi: "₺599", "-%50" (`27aae1b`).

**Yeni dosyalar (`mobile/src/components/ui/`):**
- `Commerce.tsx`: DiscountTag (20/22/24/26/28), Price, OldPrice, PriceDrop, StoreBadge + `storeInfo()`, StoreRow, StatTile, StatusPill, BestPriceCard (G-08), PriceChart.
- `GameCards.tsx`: GameCardSmall, PriceDropCard, DealCard (çentikli bilet), `Rail` (COMPONENTS §8 aralık/adım, FlatList).
- `Social.tsx`: UserAvatar (çevrimiçi, oyun rozeti, halka), FriendTile, TrendCard, Badge, PostHeader, GameTag, PostActions, Post, Comment, UserRow, CommunityRow, CountBadge, MessageRow, NotificationLead/Row, LiveTime.
- `Media.tsx`: OverlayTag, PlayButton, VideoCard, ShortCard, NewsFeature, NewsRow, MediaImage.

**Güncellenenler:**
- GameCard (orta):
  - Fiyat metin renginde; kit `price()` yeşil çizmiyor, yeşil yalnız indirim etiketi ve düşüş notu.
  - Bilgi satırı "tür · ★ puan", puan dile göre ("4,6").
  - Eski fiyat 12, sağda 16 pt mağaza rozeti.
- HeroRail: fiyat satırı 22 + eski 14 + indirim (13/24) + "Steam'de".
  - Yeni `formatStoreAt()` Türkçe eki söylenişe göre seçiyor (Steam'de, Epic'te, GOG'da, Xbox'ta); diğer dillerde "on Steam" kalıbı.
- Mağaza adı yoksa rozet "Steam": card-price'ın ITAD dışı yanıtı Steam Store API'sinden geliyor.
- `ui/VideoCard.jsx` artık Media'ya ince bağlantı: tür "Fragman", satır "Steam · tür".
  - Süre, izlenme, yaratıcı akışta yok, çizilmiyor.
- Avatar baş harfi: `avatarPalette`'ten ada göre sabit zemin, 600, boy × 0.4.
- `usePop` HeartButton'dan çıkarıldı; beğeni ve kaydet aynı pop'u kullanıyor.
- i18n (5 dil): durum etiketleri, En İyi Fiyat, en düşük/normal fiyat, Yazar, Yorumlar, okundu/okunmadı, `v2.atStore`, `v2.trailer`.
- Galeriye DS 3 bölümü: oyun ve fiyat, kartlar, topluluk, medya.
  - Görseller canlı video kataloğundan geliyor; `check:images` elle yazılan Steam adreslerini sayıyor, adres eklenmedi.

**Emülatörde bulunup düzeltilenler:**
1. **Kurulu uygulama 4 Eylül'deki 2.6.0 dev istemcisiydi.** `-no-snapshot-save` açılışta eski hızlı açılış anlık görüntüsünü yüklüyor, bugünkü kurulum kayboldu.
   - Metro "ExpoBlurView dışa aktarılmamış" uyarısıyla fark edildi.
   - `adb install -r` ile bugünkü APK kuruldu; APK'da expo-blur sınıfları var.
2. **Bildirimdeki okunmamış noktası 26 dp'deydi, beklenen 38 (satır ortası).** `top: '50%'` yalnız `minHeight` taşıyan satırda çözülmüyor; tam boy mutlak kutuda ortalandı.
3. **"Oynuyor" hapı GameTag satırında 5 dp yukarıdaydı.** DiscountTag ve StatusPill'deki `alignSelf: 'flex-start'` satır ortalamasını eziyordu. Kaldırıldı, sütun sarmalayıcılara kit gibi `flexDirection: 'row'` verildi.
   - Aynı hata HeroCard ve BestPriceCard fiyat satırındaki indirim etiketini de 2–3 pt kaydırıyordu.
4. **Fiyat grafiğinin son nokta halesi sağda yarım kesiliyordu.** Android'de react-native-svg `overflow: visible`'ı uygulamıyor; tuval hale yarıçapı kadar büyütülüp geri kaydırıldı.
5. **LiveTime nabzı JS FPS'ini düşürüyordu.**
   - Galeride boşta ölçülen JS FPS:
     - Reanimated `withRepeat` ile: 49–50.
     - Nabız kapalıyken: 54–60.
     - RN Animated + yerel sürücüyle: 54–60.
   - Nabız yerel sürücüye taşındı; görsel olarak hâlâ atıyor, kare kare kontrol edildi.
6. **Tek sütun video listesinde boş satır kalıyordu.** Kit başlığa iki satır ayırıyor, rayda hizalama için; tam genişlik kartta bu ayırma kaldırıldı.

**Bilerek kaynaktan farklı:**
- VideoCard başlık yeri yalnız rayda ayrılıyor (madde 6).
- DealCard kesikli çizgi SVG'de "4 4" deseni. CSS `dashed` tarayıcıya göre değişiyor, birebir karşılığı yok.

**Doğrulama:**
- `npm run check` (20 denetim) geçti; iOS ve Android export geçti.
- Emülatörde görülenler, koyu ve açık temada:
  - Galeri DS 3 bölümü.
  - Ana sayfa: HeroCard "₺195 Steam'de"; GameCard'da gerçek fiyat, indirim, Steam ve Xbox rozetleri.
  - Videolar sekmesi.
- `G-DS-3-Cards.png` ile yan yana karşılaştırıldı. "-%50"deki tire boşluğu referansta da var: tabular-nums.
- Denenen etkileşimler: beğeni (kırmızı dolgu, 128 → 129), kaydet, tema geçişi. Tema tercihi sonunda `system`'e geri alındı.
- Boşta FPS: ana sayfa 58, Videolar 57.

**Açık kalanlar:**
- Bu bileşenler henüz yalnız galeride ve HomeMedia / Videolar / GameCard / HeroRail'de. Ekran geçişleri Faz 3'te: Topluluk, Mesajlar, Bildirimler, Fiyat, Haber.
- Fiyat geçmişi, "fiyatı düştü" notu, izlenme, süre: sunucu verisi yok. Bileşenler hazır, veri gelince bağlanacak.
- `tokens.gameCard` (eski boşluk sabitleri) artık hiçbir bileşende kullanılmıyor; `theme` dışa aktarımında duruyor.
- iOS'ta görünüm doğrulanmadı (Mac yok).

### 22 Eylül — Ana Sayfa, G-04 (Claude)

**Ölçüm (önce):** Boş fiyat önbelleğiyle, kaydırmadan soğuk açılışta **29 fiyat isteği** gidiyordu; iki örnek, 29 / 29. TTI 1313 / 1864 ms.
- Sebep: yatay `ScrollView` şeritleri 12'şer kartın hepsini bağlıyor, her kart `usePrice` ile kendi isteğini atıyordu.

**Yapılanlar:**
- Şeritler `Rail`'e (FlatList, COMPONENTS §8 adımları) geçti. Yalnız görünen kartlar çiziliyor.
- Bölüm sırası kit `home()` gibi:
  1. Senin İçin
  2. Fiyatı Düşenler
  3. Arkadaşların Ne Oynuyor?
  4. Kaçırılmayacak Fırsatlar
  5. Yeni Çıkanlar
  6. Oyun Dünyasından
  7. İzlemeye Değer

  Tek lider seçimi kalktı. Eskiden arkadaş şeridi liderken "Senin İçin" hiç çizilmiyordu. Trend şeridi yalnız "Senin İçin" boşken duruyor.
- "Senin İçin" alt başlığı gerçek veriden: adayları çeken donmuş tür imzasının ilki ("Çünkü Aksiyon oyunlarını seviyorsun").
- İndirim listesi iki bölüme ayrıldı:
  - En yüksek iki indirim → DealCard. "En düşük fiyat" card-price'tan, yani mağazalar arası güncel en düşük.
  - Kalanı → PriceDropCard: Steam indirim fiyatı ve Steam rozeti. "Son 24 saatte" notu yok, fiyat geçmişi tutulmuyor.
- Arkadaşlar → FriendTile. Durum "Bu hafta oynadı" ya da "N arkadaşın oynadı"; "Şu anda oynuyor" yazılmıyor, veri iki haftalık ve bayat olabiliyor.
- Haberler → NewsFeature + 3 NewsRow.
  - Kategori sunucunun `cat` alanından, zaman bağıl.
  - Kırmızı canlı nokta ilk bir saat.
  - Görselsiz öğede eski monogram yedeği korunuyor.
- Videolar → `Rail` (aralık 14, adım 294).
- Selamlama: tek satır 15/20 `text2`. Faz 1 bağlam cümlesi aynı satırda, sonda ok (Ionicons yerine Icon).
- TR bölüm başlıkları tasarımdaki gibi büyük harfle: "Kısa Klipler", "İzlemeye Değer".

**Ölçüm (sonra):** Aynı koşulda **19 fiyat isteği** (19 / 19), %34 az. TTI 1189 / 1116 ms. Dev kipinde TTI gürültülü, iyileşme iddiası yalnız istek sayısı için.

**Bilerek çizilmeyenler (veri yok, plan §Mock politikası):**
- "Gamerisen'da Gündem": sosyal etiket trendi yok.
- "Toplulukta Popüler": gönderiler akışta duruyor; PostCard'ın 2.0 görünümü Topluluk (G-10) işi.
- "Belki Bunu Seversin": "Çünkü X ve Y oynadın" gerekçesinin kaynağı yok.
- Başlıktaki zil: bildirim merkezi yok, haber düğmesi duruyor.

**Tasarımda olmayan ama korunanlar:** Yeni Çıkanlar şeridi, sonsuz keşif akışı, "İlgilenmiyorum ×", büyüme geçişi.

**Doğrulama:**
- `npm run check` (20) geçti; iOS ve Android export geçti.
- Emülatörde bölümler gerçek veriyle görüldü.
- Karttan detaya büyüme geçişi FlatList içinden çalışıyor.
- Geçici ölçüm satırı `priceService.js`'ten kaldırıldı; `git diff` boş.

**Açık kalanlar:**
- `FriendActivity` bileşeni artık çizilmiyor; yalnız `hasFriendSignal` eşiği kullanılıyor, temizlenecek.
- Arkadaş bölümü emülatör hesabında Steam arkadaş verisi olmadığı için görülmedi.
- iOS görünümü doğrulanmadı.

### 22 Eylül — Oyun Detayı, G-07 (Claude)

**Bulunan veri sorunu:** Sunucunun Steam yolu puanı uyduruyor: `api/rawg-game` → `rating: d.recommendations?.total ? 4.5 : 0`, yedek yol da varsayılan 4.5. Detayda görünen "★ 4.5" gerçek değildi. RAWG yolu da `source: 'steam'` yazdığı için istemci gerçeğini ayıramıyor.
- Karar: puan satırı yalnız Steam incelemelerinden (gerçek %, inceleme sayısı).
- Sunucu düzeltmesi ayrı iş olarak önerildi (kapsam dışı: backend).

**Yapılanlar:**
- **Kapak:** 380 pt, gameDetailHeader degradesi. Alt uç temanın zemini, ara duraklar zeminin saydamı; açık temada gri bant yok, emülatörde görüldü.
  - Parallax ve kaydırınca beliren başlık korundu.
  - CardExpand'in iniş yüksekliği aynı jetondan: `HEDEF_KAPAK_Y = component.detail.heroHeight`.
- **Üst çubuk:** 44'lük cam geri; paylaş, koleksiyon ve kalp. Koleksiyon tasarımda yok ama ürün özelliği. Kalp kendi dokunsal geri bildirimini verdiği için çift titreşim yok.
- **Başlık bloğu:** ad 30/36, "yıl · geliştirici", puan satırı ("%84 olumlu · 91.859 inceleme" + Metacritic, PEGI yuvasında), tür çipleri, platform.
- **CTA:**
  - "En Ucuz Fiyatı Gör" fiyat kartına kaydırıyor.
  - "İstek Listesine Ekle" / "İstek listende".
  - Sahiplik bandı aynı yığında; boşken boşluk bırakmıyor.
- **"En İyi Fiyat" kartı:**
  - Bağıl güncelleme zamanı, 44'lük mağaza, 36 pt fiyat, "Mağazaya Git".
  - Diğer mağazalar en ucuza göre GERÇEK farkla ("+₺379").
  - "N mağazanın tümünü karşılaştır" G-08 gelene kadar listeyi yerinde açıyor; "Daha az" ile kapanıyor.
- **Fragman kartı:** kapak görseli, 60'lık oynat, "Resmî Fragman". Oynatıcı kapaktan karta taşındı; kullanıcı başlattığı için sesli ve denetimli.
- **Görseller ve Oyun Hakkında:**
  - Ekran görüntüleri 200 × 112; ışık kutusu korundu.
  - Oyun Hakkında: 4 satır + "Devamını oku", geliştirici/yayıncı/çıkış hücreleri, resmî site bağlantısı.
- **İncelemeler:**
  - Steam özet kartı: büyük %, katman etiketi, kısa sayı "91,9 B" ve olumlu/olumsuz çubukları. Tasarımın 5 yıldız dağılımının Steam'de karşılığı yok.
  - GameReviews `hideTitle` ile altında.
- **Sabit alt çubuk:** "₺597 · GOG'da en ucuz · -%35", "Mağazaya Git".
- **Yeni yardımcılar:** `formatCompact` (kısa sayı, Hermes'te Intl compact yerine elle) ve `formatStoreAt` sticky satırında.
- **Ölü anahtarlar:** kullanılmayan 8 `detail.*` anahtarı beş dilden silindi (check:i18n yakaladı).

**Emülatörde bulunup düzeltilenler:**
1. Tür çipleri ekran kenarından başlıyordu: iki kat taşma payı vardı.
2. İnceleme özetinde "91.859 incele…" ve "Olums…" kırpılıyordu. Kısa sayı eklendi, etiket genişliği 44 → 56.
3. Fragman görseli, hemen altındaki ilk ekran görüntüsüyle aynıydı; kapak görseline geçildi.
4. "Daha az" aşağı okla gösteriliyordu; ok çevrildi.
5. "En Ucuz Fiyatı Gör" kartı üst çubuğa yapışık bırakıyordu; 12 pt pay eklendi.
6. Yedek fiyat satırında adres yoktu ve iki "Mağazaya Git" de ölüydü; Steam sayfasına düşüyor.

**Verisi olmadığı için çizilmeyenler:** tüm zamanların en düşüğü, PEGI, sistem gereksinimleri, oyun modu, topluluk tartışmaları, ilgili haber/video, benzer oyunlar.

**Doğrulama:**
- `npm run check` (20) geçti; iOS ve Android export geçti.
- Emülatörde koyu ve açık tema.
- Karttan büyüme ve geri dönüş, fiyat kartına kaydırma, mağaza listesini açma/kapama, fragmanın kart içinde oynaması denendi.
- Tema tercihi `system`'e geri alındı.

**Açık kalanlar:**
- GameReviews satırlarının 2.0 görünümü (kit inceleme kartı) Topluluk ya da Gönderi Detayı işiyle.
- OwnershipBand eski görünümde.
- Detaydan dönünce "Senin İçin" yeniden sıralanabiliyor: aday önbelleği tazelenince görülme cezası devreye giriyor. Bu işten önce de vardı, ayrıca incelenmeli.
- iOS görünümü doğrulanmadı.

### 22 Eylül — Fiyat Karşılaştırma, G-08 (Claude)

**Mevcut veri (ölçüldü):**
- `/api/prices` yalnız güvenilir mağazaları listeliyor (kod yorumu ve kimlik listesi: Steam, Epic, GOG, Humble, Xbox).
- İstek listesi bildirimi gerçek: `cron/price-alerts`, listedeki oyun ucuzlayınca push atıyor.
- Sürüm, platform, fiyat geçmişi, rekor düşük / ortalama ve hedef fiyat sözleşmesi YOK.

**Yapılanlar:**
- `hooks/useGamePrices`: fiyat listesi mantığı (ITAD + boşsa kart fiyatı yedeği + Steam adresi yedeği) detaydan çıkarıldı.
  - Oyun Detayı ve Fiyat Karşılaştırma aynı kaynağı ve aynı sorgu anahtarını (`prices:<steamAppId|slug|id>`) kullanıyor: detaydan geçişte sıfır istek, iki ekran aynı sayıyı gösteriyor.
- Yeni rota `/game/[id]/prices`. `[id].jsx` dosyası ile `[id]/` klasörü birlikte çalışıyor; emülatörde gezinerek doğrulandı, plan §1'deki taşıma gerekmedi.
- **Ekran:**
  - NavBar (zil = istek listesi) ve oyun başlığı (48×64 kapak + ad).
  - `BestPriceCard`: 40 pt fiyat, "Mağazaya Git" 50, "Satın alma mağazada tamamlanır".
  - "Fiyat alarmı" kartı: istek listesi anahtarı; açılınca NavBar zili de dolu kırmızı.
  - "Tüm Mağazalar": mağaza sayısı, "En düşük fiyat" / "En yüksek indirim" sıralaması, en ucuza göre gerçek fark.
  - Güven notu ve sabit alt çubuk.
- Oyun Detayı'nın "N mağazanın tümünü karşılaştır" bağlantısı artık bu ekrana gidiyor; yerinde açma yalnız bağlantı verilmezse duruyor.

**Bilerek çizilmeyenler:**
- Sürüm seçici ve platform segmenti.
- "Rekor düşük" ve "12 aylık ortalama" kutuları, "Fiyat Geçmişi" grafiği, "Son 24 saatte düştü" notu. Fiyat geçmişi sunucu işi (plan soru 17).
- Hedef fiyat adımlayıcısı.
- "Popüler / Platform / Dijital sürüm" sıralaması.
- "KDV dahil" ve "komisyon" cümleleri: doğrulanamadı. Güven notunun yalnız "resmî ve yetkili satıcılar" kısmı doğru, o yazıldı.

**Doğrulama:**
- `npm run check` (20) geçti; iOS ve Android export geçti.
- Emülatörde Ana Sayfa → Detay → "tümünü karşılaştır" → Fiyat Karşılaştırma zinciri gerçek veriyle çalıştı (Helldivers 2: Humble ₺1.951, Steam ₺1.952 +₺1).
- Alarm anahtarı ve zil birlikte değişiyor, sıralama çipi çalışıyor. Alarm denemeden sonra kapatıldı.

**Açık kalanlar:**
- Tat profili Steam'in Türkçe tür adlarını ("Basit Eğlence", "Bağımsız Yapımcı") kaydediyor. `GENRE_SLUG` bunları eşlemediği için "Senin İçin" tür imzası boşalabiliyor ve gerekçe alt başlığı çizilmiyor. Bu işten önce de vardı; öneri motoru işi.
- iOS görünümü doğrulanmadı.

### 22 Eylül — Topluluk, G-10 (Claude)

**Önce:** 28 pt başlık + "Arkadaşlar" hapı, alt çizgili iki sekme, yuvarlak "Ne düşünüyorsun?" çubuğu, 148 pt kapsüllü "Hakkında yazabilirsin" şeridi. Gönderi (Ionicons, ayraç çizgisi) ve inceleme (kenarlı kutu) iki farklı dilde. TTI 1180–1494 ms.

**Yapılanlar:**
- **Başlık:** PageHeader; sağda arkadaşlar (bekleyen istek rozeti korundu) ve kalem (gönderi yaz). Tasarımın "ara" ikonu yerine arkadaşlar: istek rozeti Topluluk'ta görünmeli (eski karar).
- **Segmented:** Keşfet / Arkadaşlar. Tasarımın dört bölümünden (Senin İçin / Takip / Trend / Topluluklar) veri olan ikisi.
- **Yazma kartı (kit comp):** avatar + "Ne düşünüyorsun?" + "Oyun" çipi. Görsel/video kapalı karar, anket yok; o çipler çizilmedi.
- **"Hakkında yazabilirsin":** tasarımın topluluk kutucukları (60 pt, köşe 18, ad 12/600, saat 11). Oyun toplulukları sunucuda yok; rayın gerçek karşılığı Steam'den doğrulanan oyunlar. Dokununca inceleme yazma açılıyor.
- **PostCard** tasarımın Post'una geçti: PostHeader, soldan 52 gövde, GameTag, PostActions.
  - Korunanlar: iyimser beğeni + hata olursa geri alma, dokunsal geri bildirim, hesap kapısı, ⋯ ve uzun basma moderasyon yolu, geliştirici rozeti, `kok` (konuşma ekranında bodyLarge) ve `compact` (4 satır).
  - Paylaş ve kaydet çizilmiyor: gönderi için özelliği yok. PostActions ikisini yalnız işleyici verilirse çiziyor.
  - Kullanım yerleri: Anasayfa akışı, Topluluk, Gönderi, Profil, başkasının profili.
- **ReviewCard** da aynı Post iskeletinde:
  - Doğrulanmış saat yeşil kalkan rozeti (`Badge kind="verified"`).
  - Oyun etiketinde "Tavsiye ediyor" / "Tavsiye etmiyor". İkincisi tasarımda yok; eski kartın başparmak-aşağı bilgisi kaybolmasın diye nötr hap.
  - Büyüme geçişi korundu (ölçü oyun etiketinden).
- Anasayfa akışındaki incelemenin ek alt boşluğu kaldırıldı; kart kendi 14+14'ünü taşıyor, akış aralığı 28.

**Doğrulama:**
- `npm run check` (20) geçti; iOS ve Android export geçti.
- Emülatörde görülenler:
  - Topluluk: inceleme ve gönderiler gerçek veriyle.
  - Hesapsız beğeni giriş ekranına gidiyor.
  - Gönderiye dokununca detay açılıyor (kök bodyLarge).
  - ⋯ moderasyon sayfası açılıyor (Profiline git / Engelle / Şikayet et).
  - Anasayfa akışında yeni inceleme kartı.
- TTI soğuk açılışta 2692 / 1190 ms (önce 1180–1494). Ağa bağlı ve gürültülü; ikinci örnek önceki aralıkta. Boşta 57–60 FPS.

**Açık kalanlar:**
- Anasayfa sonsuz akışındaki GamePostCard eski görünümde.
- Gönderi Detayı (G-13) ve yorumlar eski görünümde.
- EmptyState ve FeedSkeleton eski bileşenler.
- Hesapsız kullanıcıda yazma kartı avatarı "?" (ad yok). Tasarım oturum açmış kullanıcı çiziyor.
- iOS görünümü doğrulanmadı.

### 23 Eylül — Gönderi Detayı, G-13 (Claude)

**Yapılanlar:**
- **NavBar** "Gönderi": geri + ⋯ (kök gönderinin moderasyon kapısı, kit nav_bar "Seçenekler").
  - Kartın kendi ⋯'ü kalktı; aynı menü iki düğmeden açılıyordu. Uzun basma kısayolu kartta duruyor (`onLongPressMenu`).
- **Kök gönderi** 2.0 Post'u, konuşmada bodyLarge.
- **Sayaç satırı** (kit stats): iki hat arasında beğeni ve yanıt sayısı. "Paylaşım" YOK — gönderi paylaşımı ölçülmüyor.
- **"Yanıtlar" başlığı** + sıralama notu. Tasarımın "En iyi ▾" çipi yok: sunucu tek sıralama veriyor (eskiden yeniye), seçenek sunan çip yanıltırdı.
- **Yanıtlar** artık `Comment` (kit comment()): 40 avatar, ad + rozet + zaman, metin 15/21, 28'lik eylem satırı (kalp + "Yanıtla"), "Yazar" hapı kök gönderi sahibinde.
  - `CommentCard`: iyimser beğeni + geri alma, hesap kapısı, profil bağlantısı.
  - Tasarımın yorumunda ⋯ yok; yanıt da kullanıcı içeriği olduğu için görünür ⋯ eklendi (Guideline 1.2, "gizli jest tek yol olamaz").
- **Sabit yanıt kutusu** (kit comp): 32 avatar + hap giriş + gönder ikonu. Kutu hâlâ kompozitörü açan bir düğme; iki ayrı metin girişi tutulmuyor.
- Boş/hata durumları ve yükleniyor 2.0 tipografisine geçti.

**Emülatörde bulunup düzeltilenler:**
1. Kök gönderide iki ⋯ vardı (üst çubuk + kart).
2. Yanıt satırlarının yan boşluğu yoktu: avatar ekranın soluna taşıyordu. Yorum listesi 20 dolgu + 18 aralık aldı.

**Doğrulama:**
- `npm run check` (20) geçti; iOS ve Android export geçti.
- Emülatörde iki ayrı gönderi (derin bağlantıyla) açıldı: kök gönderi, sayaçlar, yanıt, alt kutu.
- Üst çubuktaki ⋯ kök yazarın moderasyon sayfasını açıyor.

**Açık kalanlar:**
- `ReviewRoot` (kök inceleme) eski görünümde.
- PostComposer eski görünümde (G-12).
- Kalan ekranlar: Mesajlar, Sohbet, Profil, Haberler, Bildirimler, Arama, Oyun Topluluğu.

### 23 Eylül — Mesajlar, G-18 (Claude)

**Yapılanlar:**
- **PageHeader** "Mesajlar" + kalem (kit `pen`): kalem bir kompozitör değil, **arkadaş listesini** açıyor — mesajlaşma yalnız arkadaşlar arasında (sunucu `NOT_FRIENDS`), yani yazılabilecek kişi kümesi zaten orası.
- **Arama** (40 pt, kit `search_field`): istemci içi süzme. Sunucuda konuşma araması yok ve liste zaten en fazla 40 satır (`listConversations` limit=40) — bu boyda ağ turu saf kayıp.
- **"Çevrimiçi" şeridi** (64 karo, 56 avatar): yeni istek AÇMIYOR, `presence` alanı konuşma listesiyle birlikte geliyor. `presence: null` (durumunu paylaşmayan) şeritte hiç görünmüyor.
- **Çipler** yalnız Tümü / Okunmamış (n); n sunucunun kendi saydığı değer. Okunmamış kalmayınca çipler düşüyor ve süzgeç Tümü'ne dönüyor (yoksa "Okunmamış (0)" seçiliyken liste boş kalır, ekran bozuk sanılır).
- **Satırlar** `MessageRow` (kit `msg_row`): 72 pt, 52 avatar, okunmamışta ad 700 + saat kırmızı.

**Tasarımda olup ÇİZİLMEYENLER — hepsi aynı sebeple (veri yok, uydurulmadı):**
1. **Sayaç rozeti (2, 5):** `/api/social/chat/list` okunmamışı BOOLEAN veriyor (`meta.lastAt > readAt`), adet değil. `MessageRow` bu yüzden `unread` için boolean kipi kazandı: sayaç yerine 8 pt nokta (ölçü kitteki tek okunmamış noktasından — bildirim satırı).
2. **Okundu tikleri (✓/✓✓) ve "Sen:" öneki:** ikisi de `lastFrom` ister; alan `chat-store`'da var ama route yanıta koymuyor.
3. **Yazıyor göstergesi:** yazma bildirimi konuşma kanalında, listede yok.
4. **Gruplar / İstekler çipleri:** grup sohbeti yok; arkadaş dışı mesaj sunucuda reddediliyor, yani istek kutusu diye bir şey yok.
5. **Karo alt yazısında oynanan oyun:** bu uçta oyun verisi yok. Tasarımın kendi örneğinde de oyunu bilinmeyen kişi "Çevrimiçi" yazıyor — aynısı yapıldı.

**Ayrıca:** `item.lastDeleted` dalı silindi — istemci okuyordu, sunucu hiç göndermiyor (ölü kod).

**Doğrulama:**
- `npm run check` (20 · 57 ✓) geçti; `npx expo export --platform ios` geçti.
- Emülatörde başlık + kalem ikonu doğrulandı.
- Satırın üç hâli (sayaçlı okunmamış · **noktalı okunmamış** · okundu tiki) tasarım galerisinde yan yana doğrulandı; galeriye boolean kipi örneği eklendi.

**Açık kalanlar:**
- **Liste, şerit ve çipler CİHAZDA GÖRÜLMEDİ:** ekran oturum istiyor, emülatörde hesap açık değil ve şifre girilmedi. Doğrulanan tek şey başlık ve (galeri üzerinden) satır geometrisi.
- Topluluk başlığı aynı eylem için `edit`, Mesajlar `pen` kullanıyor; kit ikisinde de `pen` diyor — Topluluk'taki tek kelimelik sapma duruyor.
- iOS görünümü doğrulanmadı.
- Kalan ekranlar: Sohbet, Profil, Haberler, Bildirimler, Arama, Oyun Topluluğu.

### 23 Eylül — Sohbet, G-19 · A parçası: konuşma iskeleti (Claude)

Ekran 1973 satır ve tek commit'te hem iskeletini hem zengin baloncuklarını
değiştirmek denetlenemez olurdu; iş ikiye bölündü. **A** burada: başlık,
tarih ayracı, baloncuk geometrisi, saat, yazıyor göstergesi, kompozitör.
**B** sıradaki: paylaşım kartları (oyun/haber/gönderi), alıntı baloncuğu,
tepki rozeti, medya/GIF baloncukları.

**Yapılanlar:**
- **Başlık satır oldu** (kit hdr): geri 44 · 38 avatar (çevrimiçi noktasıyla)
  · ad 16/600 + durum satırı · ⋯, altında hat. Öncesi iOS 26'nın ortalanmış
  Ø60 avatarı + cam ad hapıydı.
  - Ad artık dokunulabilir ve profili açıyor (`/u/[username]`). Eski yorum
    "başka kullanıcının profil ekranı yok" diyordu — o not eskimişti.
  - Kitin "· Counter-Strike 2 oynuyor" eki YOK: durum ucu yalnız `online` ve
    `lastSeen` veriyor.
- **Saat baloncuğun içine girdi** (11/14, sağa yaslı). Sola sürükleyince
  kenardan giren 56 pt'lik saat sütunu, jesti, paylaşılan değeri ve satır
  başına `useAnimatedStyle`i ile birlikte KALKTI: kit saati her baloncuğa
  yazıyor, iki ayrı saat sistemi tutmak artıklıktı. "Görüldü" satırı da
  saati tekrarlamıyor artık.
- **Kuyruk artık bir köşe.** `BubbleTail` (çizilen kuyruk) ve salt görselde
  kullandığı "görselin ikinci kopyası" hilesi gitti; kit kuyruğu köşe
  yarıçapıyla anlatıyor (18 18 18 6 / 18 18 6 18). Küçük köşe grubun son
  baloncuğunda — eski kuyruk kuralı neyse o.
- **Gönderilen baloncuk kırmızı değil.** Kitte zemin `acS` (#F5F5F7), metin
  `onAc` (#0A0A0B): birincil düğmenin yüzeyi. Uygulamada `primary` /
  `onPrimary`, saat `onPrimaryMuted`. Genişlik %75 yerine 270 pt.
- **Tarih ayracı** 24 pt hap oldu; saatini bıraktı.
- **Yazıyor baloncuğu** kit ölçüsüne geçti: 64×36, üç adet 7 pt nokta.
- **Kompozitör** kit bandı: üst hat + kendi zemini, `+` 44 (dolgulu), kapsül
  44/köşe 22, ayrı 44 gönder dairesi. Gönder artık HER ZAMAN çizili, boşken
  pasif — öncesi kapsülün içindeydi ve yalnız yazınca beliriyordu.
  - Kitin diğer iki ikonu çizilmedi: "görsel gönder" fotoğraf yüklemesi ve
    2.7.0'da uygulamadan çıkarıldı (AGENTS.md); "oyun paylaş" için
    kompozitörde bir seçici yok, paylaşım oyun ekranından başlıyor.

**Doğrulama:**
- `npm run check` (20 · 57 ✓) geçti — `check:scope` kodmod sonrası Babel
  kapsam taramasını da yapıyor. `npx expo export --platform ios` geçti.
- Emülatörde **başlık** doğrulandı: yükseklik 137 px = 52 dp (kit sayısı),
  alt hat, geri/avatar/ad/⋯ yerleşimi.

**Açık kalanlar:**
- **Baloncuklar ve kompozitör cihazda görülmedi:** ekran oturum istiyor,
  emülatörde hesap açık değil. Kod derleniyor ve denetimler geçiyor, ama
  gözle görülen tek şey başlık.
- B parçası: paylaşım kartları, alıntı, tepki rozeti, medya/GIF baloncukları
  hâlâ eski görünümde (kuyrukları kalktı, geometrileri duruyor).
- `src/components/BubbleTail.jsx` artık hiçbir yerden çağrılmıyor; B
  parçasından sonra silinecek.

### 23 Eylül — Sohbet, G-19 · B parçası: zengin baloncuklar (Claude)

**Yapılanlar:**
- **Paylaşım kartı ikiye ayrıldı** (kit gcard / newsc). Haber bir BAŞLIK
  (64 küçük resim + "HABER · kaynak" + 3 satır başlık), oyun/fragman bir
  ÜRÜN (264 geniş, 124 kapak, 16/700 ad, tam genişlik "Oyunu gör").
  - **Kitin fiyat satırı çizilmedi:** paylaşım yükünde fiyat yok
    (`chat-share.js` yalnız kind/name/image/appid veriyor) ve kart başına
    fiyat isteği açmak ters listede kartın yüksekliğini sonradan değiştirir.
  - **Gönderi kartı (kit postc) yok:** sunucu gönderi paylaşımı çözmüyor.
- **Görsel ve GIF baloncuğunda saat** (kit im): sağ altta koyu rozet. A
  parçasında salt görselde saat hiç çizilmiyordu.
- **Alıntı kutusu** kitin şekline geçti: dikey şerit yerine 10 köşeli, bir
  tık aydınlık katman.
- **Tepki rozeti alt kenara indi** (kit reply): üst dış köşe yerine alt
  kenar, içe 10 girintili; yer açan pay satırın altında.
- Görsel/video ölçüsü kit im'e çekildi (220×150).

**Emülatörde bulunup düzeltilenler (üçü de cihazda görüldü):**
1. Haber etiketi "HABER PAYLAŞTI · Merlin'in K…" diye kırpılıyordu —
   `share.news` bir fiil cümlesi. Kit bir KİCKER istiyor; `msg.newsKicker`
   ("HABER") eklendi.
2. **Paylaşım kartlarında saat hiç yoktu.** A parçasında saat baloncuğun
   içine taşınmıştı ama kartlar o dalı kullanmıyor. Kitin `tstamp`i eklendi:
   kartın altında, gönderen tarafa yaslı.
3. **Aynı günde iki ayraç da "Çarşamba" diyordu.** Ayraç iki sebeple çıkıyor
   (gün değişimi · 1 saatten uzun sessizlik) ve saat kaldırılınca ikinci
   ayraç hiçbir şey söylemez oldu. `ayracMetni()` eklendi: gün değiştiyse gün
   adı, aynı gün içindeki boşlukta SAAT.

**Doğrulama (oturum açık emülatörde):**
- `npm run check` (20) ve `npx expo export --platform ios` geçti.
- **G-18 ölçüldü:** arama alanı 105 px = 40 dp, avatar 137 px = 52 dp, satır
  aralığı 189 px = 72 dp, kenar 20 dp — dördü de kit sayısı. Arama süzmesi,
  odak halkası, temizle düğmesi ve "Sonuç bulunamadı" çalışıyor.
- **G-19 ölçüldü:** gönderilen baloncuk zemini `#f5f5f7` (kit acS), köşe
  kuralı grup ortasında 18 dp / grup sonunda 6 dp (piksel ölçümü),
  kompozitör 10 + 44 + 8 + 44, başlık 52 dp. Moderasyon menüsü (şikâyet
  dahil) açılıyor.

**Açık kalanlar:**
- **Alıntı ve tepki rozeti cihazda GÖRÜLMEDİ:** mevcut sohbetlerde ne alıntı
  ne tepki var; ikisini üretmek gerçek bir kişiye bildirim göndermek demek.
- Gönderilen paylaşım kartında saat ve "Görüldü" iki satır; kit ikisini tek
  satırda birleştiriyor.
- `src/components/BubbleTail.jsx` artık hiçbir yerden çağrılmıyor.
- iOS görünümü doğrulanmadı.

### 23 Eylül — Profil, G-21 · kimlik bloğu (Claude)

**Yapılanlar (kit s4.py profile()):**
- Avatar 96 (ölçüldü: 252 px = 96,0 dp), ad 24/30/700, "@kullanıcı" satırı,
  bio 15/22.
- **Sayaçlar kitteki gibi satır hâlinde** ("3 gönderi · 6 arkadaş · 8 oyun"),
  avatarın sağında üç sütun değil.
- Eylemler 2.0 `Button` ile 40 pt. Kendi profilimde "Profili düzenle"
  avatarın sağında — kitin `avrow`u birebir. Başkasının profilinde iki düğme
  var ve 375 pt kanvasta avatarın yanına sığmıyor; orada kendi satırlarında.
- Paylaş ve ayarlar üst çubukta yan yana (kit onları kapağın sağ üstünde
  çiftliyor; kapağımız yok).
- Çipler 2.0 diline geçti (kenarlıklı kart yerine `surface2` hap).

**Kitten alınmayanlar — hiçbirinin verisi yok:**
kapak görseli (390×190) · "Lv 37" rozeti · **takipçi/takip sayaçları**
(uygulamada takip değil çift taraflı ARKADAŞLIK var) · "Şu an oynuyor"
ilerleme kartı · Tamamlanan/İnceleme/Saat/Başarım karoları · "@kullanıcı"
yanındaki Steam kullanıcı adı (sunucu bilerek vermiyor).

**Sekme şeridi İKONLU KALDI.** Kit dört metin etiketli `segmented` istiyor
("Gönderiler · Oyunlar · İncelemeler · Medya") ama bu şerit beş dil taşıyor
ve Almanca etiketler (Sammlung · Wunschliste · Bewertungen · Beiträge)
390 pt'de sütun başına ~87 pt'ye sığmıyor — kararın gerekçesi
`ProfileTabs.jsx` başında duruyor ve ölçüm hâlâ geçerli.

**Emülatörde bulunup düzeltilenler:**
1. Aynı ekranda iki kez "@test": üst çubuktaki kullanıcı adı ile yeni
   kullanıcı adı satırı. Üst çubuktaki kalktı, yerine paylaş düğmesi geldi.
2. "Arkadaşsınız" düğmesi `disabled` yüzünden solgundu ve bozuk gibi
   okunuyordu; durum görünümüne çevrildi.

**Doğrulama:**
- `npm run check` (20) ve `npx expo export --platform ios` geçti.
- Cihazda kendi profilim ve `/u/yunus_gns_` (arkadaş) açıldı; iki düzen de
  doğru çiziliyor.

**Açık kalanlar:**
- `app/u/[username].jsx` üst çubuğu hâlâ eski (geri · @kullanıcı · ⋯) ve
  başlıktaki kullanıcı adı kimlik bloğundakiyle tekrarlanıyor.
- İçerik sekmelerinin kendi düzenleri (ızgara, inceleme satırı) taşınmadı.
- iOS görünümü doğrulanmadı.

### 23 Eylül — İstek Listesi, G-09 (Claude)

**Yapılanlar (kit s2.py wishlist()):**
- `NavBar` + alt başlık ("13 oyun izleniyor"). Kitin süzgeç düğmesi yok:
  bu listede süzülecek alan yok (tür/platform kayıtta durmuyor).
- **Satır ekrana özel yazıldı, ortak `GameRow` büyütülmedi.** GameRow üç
  ekranı besliyor (istek listesi · liste · koleksiyon) ve kit üçüne farklı
  satır veriyor; ortak bileşeni bu ekran için değiştirmek diğer ikisini de
  sessizce oynatırdı.
- Satır kitin ölçüsünde: 112 yükseklik (ölçüldü: 294 px = 111,9 dp),
  62×84 kapak, ad 16/21/600, mağaza rozeti, fiyat satırı
  (17 fiyat + 12 üstü çizili + indirim etiketi). Ayraç metin sütunundan
  başlıyor (ölçüldü: 252 px = 95,9 dp — kit `left: 96`).
- **Elde olup gösterilmeyen iki veri görünür oldu:** `card-price` zaten
  `original` (eski fiyat) ve `storeName` döndürüyordu; ikisi de çizilmiyordu.
- Bildirim bandı kitin özet kartı yerinde, 2.0 diliyle.

**Kitten alınmayanlar:**
- **Özet kartı** ("Bu hafta 4 oyunun fiyatı düştü · ₺1.250 tasarruf") ve
  satırdaki **değişim notu** ("₺100 düştü" / "Fiyat değişmedi" / "₺50
  arttı"): üçü de fiyat GEÇMİŞİ ister, sunucu geçmiş tutmuyor.
- **Satır başına zil:** alarm uygulamada oyun başına değil liste geneli.
  Zil çizilse her satır kendi alarmını vaat ederdi.
- **Sıralama çipleri** (Fiyat · İndirim · Çıkış tarihi): fiyatlar satır satır
  ve geç geliyor; yüklenmemiş alana göre sıralama listeyi karıştırırdı.
- **Çıkış tarihi satırı:** istek listesi kaydı tarih taşımıyor.

**Sağdaki eylem kalp, çöp kutusu değil:** 2.0 ikon setinde çöp kutusu yok ve
oyun bu listeye zaten kalple ekleniyor — aynı düğme, geri alınabilir eylem.

**Emülatörde bulunup düzeltileni:** bildirim bandı ekran kenarlarına
yapışıyordu (liste kabının yatay dolgusu yok); kitin `margin: 0 20px`
karşılığı eklendi.

**Doğrulama:** `npm run check` (20), `npx expo export --platform ios` ve
cihazda 13 oyunluk gerçek liste.

**Açık kalan (bu işin dışında):** listede aynı oyun iki kez görünüyor
("The Witcher 3" — biri RAWG biri Steam kimliğiyle). Bilinen çift kimlik
uzayı sorunu; bu ekranın değil veri katmanının işi.

### 23 Eylül — Haberler listesi, G-16 (Claude)

**Yapılanlar (kit s3.py news()):**
- Kitin iki katlı başlığı: geri satırı, altında 28/34 "Haberler".
- **Üç kademeli hiyerarşi**: en üstteki haber LEAD (350×220 görsel, 22/28
  başlık, özet), sonraki ikisi iki sütunlu ORTA kart (169×112), gerisi 72 pt
  `NewsRow`. Sıra tarihten geliyor; liste zaten yeniden eskiye.
- **Kullanılmayan `excerpt` görünür oldu**: RSS 200 karakterlik özet
  veriyordu, ekran hiç çizmiyordu. Lead kartında iki satır olarak duruyor.
- `NewsFeature`'a **lead bedeni** eklendi (kit G-16 lead'i COMPONENTS
  kartından büyük: 220 görsel, 22/28 başlık, üç satır).
- **Gün grupları** (Bugün · Dün · tarih): etiket `ts`den çıkıyor, tarihi
  olmayan haber gruplanmıyor. Başlıklar listeye sahte satır olarak giriyor —
  ayrı bölüm listesi sanal listeyi ikiye bölerdi.
- Öne çıkan haber artık metni GÖRSEL ÜSTÜNDE taşımıyor; kit metni görselin
  altına koyuyor ve okunurluk oradan geliyor.

**Kitten alınmayanlar:**
- **"Son dakika" rozeti:** RSS'te böyle bir bayrak yok. Tazelik zamandan
  okunuyor — bir saatten yeni haber kırmızı "canlı" zamanla yazılıyor.
- **Başlıktaki arama ve kaydet düğmeleri:** haber araması ve kaydedilen
  haber diye bir şey yok.
- **"Canlı akış" göstergesi:** canlı yayın yok.
- **Kitin sabit kategorileri** (PC · PlayStation · Xbox…): bizim
  kategorilerimiz akıştan çıkıyor (Endüstri · İncelemeler · Çıkışlar…).

**Emülatörde bulunup düzeltilenler:**
1. "Son Gelişmeler" başlığı ekranın soluna taşıyordu: `SectionHeader` kendi
   yan dolgusunu taşımıyor, çağıran veriyor.
2. Gün grupları arası boşluk 44 pt'ye çıkmıştı (satırın alt boşluğu +
   başlığın üst boşluğu); kit 24 diyor, başlık artık farkı ekliyor.

**Doğrulama:** `npm run check` (20), `npx expo export --platform ios` ve
cihazda gerçek akış (lead · iki orta kart · Bugün/Dün grupları · satırlar).

**Açık kalan:** haber DETAYI (G-17) bu işte değil. Ekran zaten 2.0
bileşenlerini kullanıyor ama kitin 300 pt kapağı, meta satırı ve 26/32
başlığı yok.

### 23 Eylül — Haber Detayı, G-17 (Claude)

**Önce: EKRAN ÜRETİMDE HİÇ AÇILMIYORDU.** Emülatörde doğrulanırken sonsuz
"yükleniyor" dönüyordu. Kök neden:

- Ekran `/api/news?id=<id>` çağırıyor ve yanıttaki `item` alanını okuyor.
- `?id=` desteği **yalnızca bu dalda** var; üretimdeki `main` sürümü
  parametreyi yok sayıp listeyi döndürüyor (`{results, count}`), yani
  `item` **yok**.
- `fetchNewsArticle` bu durumda `undefined` dönüyordu; `useQuery` veriyi
  `undefined` olduğu sürece "gelmedi" sayıyor → `loading` sonsuza dek true.

**Düzeltme iki katmanda:**
1. `fetchNewsArticle` artık `data?.item ?? null` dönüyor — "istek bitti,
   kayıt yok" ile "istek sürüyor" ayrıldı.
2. Ekran haberi ÖNCE LİSTEDEN okuyor (liste ekranıyla aynı `useQuery`
   anahtarı, yeni istek yok). Tek haber ucu yalnızca haber akıştan düşmüşse
   (eski bağlantı) deneniyor.

**Yapılanlar (kit s3.py news_detail()):**
- 300 pt kapak (ölçüldü: 780 px = 297 dp) + gradient; geri ve paylaş
  kapağın üstünde cam dairelerde.
- Kategori NÖTR HAP (kırmızı metin değil) + bağıl zaman; bir saatten yeni
  haberde zaman kırmızı.
- Başlık 26/32/700, kaynak satırı, özet 17/27, "Kaynakta oku".
- **İlgili Haberler**: önbellekteki listeden üç satır, önce aynı kategori.

**Kitten alınmayanlar:**
- **Gövde paragrafları, ara başlık, figür:** sunucu tam metni saklamıyor —
  `news-list.js` bunu açıkça yazıyor ("this does not copy full publisher
  articles"). Elimizde RSS özeti var, devamı kaynağın sayfasında.
- **İmza satırı (yazar + avatar):** haberde yazar alanı yok; kaynak var.
- **Okuma süresi:** gövde olmadan hesaplanamaz.
- **İlgili oyun kartı:** haber ile oyun arasında bağ tutulmuyor.
- **Topluluk tepkileri:** haberin beğenisi/yorumu yok.
- **Kaydet düğmesi:** kaydedilen haber diye bir özellik yok.

**Doğrulama:** `npm run check` (20), `npx expo export --platform ios` ve
cihazda gerçek haber (kapak, hap, başlık, özet, kaynak düğmesi, ilgili
haberler).

**Açık kalan (sunucu):** `?id=` desteği `main`'e gidip yayına çıkana kadar
eski bağlantılar (akıştan düşmüş haberler) boş durum gösterecek. İstemci
artık o durumda sıkışmıyor.

### 23 Eylül — Videolar, G-14 ve G-15 (Claude)

**G-14 (Videolar sekmesi): TAŞIMA GEREKMEDİ.** Ekran zaten 2.0
bileşenlerinde (PageHeader, Chip, SectionHeader, VideoCard, ShortCard) ve
kitin kalan parçalarının verisi yok. `VideoCard` bunu kendi başında zaten
yazıyor: "Süre, izlenme ve yaratıcı akışta YOK; kart o öğeleri çizmiyor
(sahte veri yok)." Kaynak Steam'in resmî fragmanı; kitin yaratıcı
platformu (yaratıcı avatarları, takip, izlenme, 6 kategori) uydurulmadan
çizilemez. Cihazda doğrulandı.

**G-15 (Oynatıcı): ÜRETİMDE HİÇ AÇILMIYORDU — haber detayıyla AYNI HATA.**
- Ekran `/api/video-feed?id=<id>` çağırıp `item` alanını okuyor.
- `?id=` dalı yalnızca bu dalda (main'e göre +16 satır); üretim parametreyi
  yok sayıp akış sayfasını döndürüyor, `item` gelmiyor.
- `fetchVideo` `undefined` dönüyordu → `useQuery` sonsuza dek `loading`.

**Düzeltme (haberdekiyle aynı iki katman):**
1. `fetchVideo` artık `data?.item ?? null`.
2. Ekran videoyu ÖNCE KATALOGDAN okuyor (sıradaki listesiyle aynı sorgu
   anahtarı → yeni istek yok); tek video ucu yalnızca derin bağlantıda yedek.

**G-15 düzeni (kit s3.py player()):**
- Başlık 16/21 + "Fragman · Steam".
- Eylemler **36 pt hap** (kit acts): öncesi iki tam boy düğmeydi ve iki
  satıra sarmalanıyordu.
- **Oyun kartı kitin gcard'ı**: 56×74 kapak, ad, tür, **fiyat · indirim ·
  mağaza** ve "Oyunu Gör". Fiyat `useGamePrices`'tan ve oyun detayıyla AYNI
  sorgu anahtarında — karttan detaya geçişte sıfır istek, iki ekran
  çelişemiyor.
- **Sıradaki** listesi kompakt satıra indi (160×90 küçük resim, 90 pt);
  otomatik oynat anahtarı bölüm başlığına taşındı — altındaki ayrı
  "Otomatik oynat" yazısı kalıntıydı, kalktı.

**Kitten alınmayanlar:** yaratıcı satırı ve takip düğmesi, beğeni/yorum/klip
hapları, izlenme ve süre, altyazı/kalite/tam ekran özel kontrolleri (yerel
oynatıcı kontrolleri kullanılıyor).

**Doğrulama:** `npm run check` (20), `npx expo export --platform ios` ve
cihazda gerçek fragman (oynatma, hap eylemler, ₺1.025 fiyatlı oyun kartı,
kompakt sıradaki satırları).

**Açık kalan (sunucu):** `?id=` desteği hem haber hem video için `main`'e
gidip yayına çıkana kadar derin bağlantılar boş durum gösterecek. İstemci
artık iki ekranda da sıkışmıyor.

### 24 Eylül — Arama bulgusu ve Oyunlar listesi çerçevesi (Claude)

**G-05 / G-06 BİR TAŞIMA DEĞİL, YENİ ÖZELLİK.** Kit birleşik arama çiziyor:
tek alanda oyun · kişi · topluluk · haber · video sonuçları (segmented +
bölüm bölüm listeler), son aramalar, trend aramalar, önerilen kişiler.
Uygulamada bunların hiçbirinin karşılığı yok:

- Birleşik arama ucu yok. Oyun araması `fetchGames({ q })`, kullanıcı
  araması `searchUsers` — ayrı uçlar; haber/video araması hiç yok.
- **Topluluk diye bir varlık yok** (Topluluk sekmesi bir akış, üye/katıl
  kavramı yok).
- Arama geçmişi tutulmuyor, trend arama verisi yok, "önerilen kişiler"
  ucu yok.

Bunu çizmek uydurma olurdu; yapmak sunucu işi içeren ayrı bir özellik.
Karar kullanıcıya bırakıldı.

**Onun yerine taşınan: Oyunlar listesinin çerçevesi** (`app/games.jsx`).
Ekranın kendisi kitte yok (G-06 arama sonucu, bu ise filtreli oyun
listesi) ama çerçevesi 2.0 öncesiydi:

- Başlık `largeTitle` (28/34) oldu; öncesi 22/800'dü.
- Arama kutusu 2.0 **`SearchField`** (kit search_field: 40 pt, köşe 12,
  `fill` zemin, 16 pt metin, odakta içte kırmızı halka, temizle düğmesi).
  Öncesi ekrana özel, kenarlıklı ve 14 pt bir kopyaydı — aynı işi yapan
  iki farklı arama kutusu uygulamada duruyordu.
- Bölüm çipleri 2.0 **`Chip`**; ekrana özel çip dili (`CHIP` teması) kalktı.
  Aynı ekranda iki çip dili vardı.
- Katlanır başlık mantığına (ölçülen `headerH`, `Animated`) dokunulmadı.
- Kartlar ve ızgara bu işin dışında: kart ailesi (Faz 2 `GameCard`) ile 2.0
  kartı arasındaki seçim ayrı bir karar.

**Doğrulama:** `npm run check` (20), `npx expo export --platform ios` ve
cihazda gerçek liste + "elden" araması (odak halkası, temizle düğmesi,
süzülmüş sonuçlar).

### 24 Eylül — Ayarlar, G-23 (Codex)

Başlangıç: `a715616`, temiz çalışma ağacı. Claude'un ilerleme günlüğü ve
son ekran değişiklikleri incelendi; mevcut 2.0 bileşenleri kullanıldı.

**Uygulananlar:**
- Kit `s4.py settings()` profil kartı: 76 pt minimum yükseklik, 52 pt
  gerçek kullanıcı avatarı, hesap adı ve hesap/güvenlik alt metni.
- Eski SettingsGroup/SettingsRow yerine 2.0 ListGroup/ListRow: 52 pt
  minimum satır, ikon kutuları, içten ayraçlar; gruplar arasında 28 pt.
- Bildirim, görünüm/erişilebilirlik, gizlilik, bağlı hesaplar, oyun araçları
  ve destek grupları. Destek e-postası görünür tutuldu.
- Tema: G-23 satırı ve seçim penceresi; açık/koyu/sistem seçeneklerinin
  tamamı korunuyor. Dil seçicisi beş dili göstermeye devam ediyor.
- Bildirimler, hareketi azalt ve otomatik oynat mevcut servislerine bağlı
  ortak Switch kullanıyor. Bildirim isteği sürerken anahtar kilitleniyor;
  izin reddi ve ayarlara gitme akışı korunuyor.
- Ayrı kırmızı çıkış düğmesi; onay ve `signOut(items)` senkronu korundu.
  Hesap silme, Steam/Xbox bağlama-ayırma ve tüm oyun aracı girişleri kaldı.
- ListRow'a isteğe bağlı açıklama ve disabled desteği eklendi. Diğer
  kullanımlarda bu alanlar zorunlu değil.
- Profil kartı ve grup başlıkları için iki yeni metin beş dile eklendi;
  artık kullanılmayan `set.grpApp` anahtarı kaldırıldı.

**Verisi olmayan G-23 seçenekleri:** beş ayrı bildirim kategorisi, bildirim
sıklığı/sessiz saat özeti, para birimi/bölge/platform/mağaza tercihleri,
uygulama içi yazı boyutu ve Wi-Fi video önizleme ayarı eklenmedi. Mevcut
tek indirim bildirimi anahtarı beş ayrı tercih gibi sunulmadı. Otomatik
oynat seçeneği önizleme tercihi olarak yeniden adlandırılmadı.

**Doğrulama:** `npm run check` (20 kontrol), iOS ve Android export başarılı;
`git diff --check` temiz. Yerleşim testi yeni pay sahipliğini de kontrol
ediyor: ScrollView geniş ekran payını, ListGroup 20 pt telefon payını
veriyor; 11 genişlikte eksik/çift dolgu denetleniyor. Bu oturumda adb ve
iOS simülatörü bulunmadığından cihazda görsel/dokunma doğrulaması yapılmadı.
Önceki cihaz doğrulamalarına ait kayıtlar bu değişikliğin testi sayılmadı.

**Devam sırası:** G-22 Profil Düzenle, G-12 Gönderi Oluştur, ReviewRoot,
`/u/[username]` üst çubuğu. Kartlarda 2.0 ailesini mevcut davranışları
koruyan adaptörlerle esas almak; birleşik aramayı ekran geçişlerinden
sonra ayrı özellik olarak uygulamak önerildi. Bu iki iş henüz uygulanmadı.
Haber tam içerik konusu kullanıcının kararıyla sonraya bırakılmış durumda;
şimdilik özet ve “Kaynakta oku” devam ediyor.


### 24 Eylül — G-22, G-12, ReviewRoot ve kullanıcı üst çubuğu (Codex)

- **G-22 Profil Düzenle:** ortak NavBar, 34 pt nötr Kaydet, 44 pt dokunma
  alanlı Vazgeç; 88 pt avatar ve 32 pt düzenleme rozeti. Form, 2.0 TextField
  kullanıyor. Kullanıcı adı salt okunur; görünen ad 40, biyografi 150
  karakter (sunucu sınırları). Profil alınamadığında hata ve tekrar deneme
  var; veri gelmeden boş form veya etkin kaydet düğmesi gösterilmiyor.
  Avatar ön ayarları mevcut servisle anında kaydediliyor; metinler Kaydet
  ile gönderiliyor. Kullanılmayan fotoğraf yeteneği isteği kaldırıldı.
- **G-12 Gönderi Oluştur:** alt pencere tam ekran Modal oldu. Kendi
  SafeAreaProvider'ı, klavyeye uyumlu kaydırma, gerçek hesap avatarı/adı,
  17/26 metin, 34 pt paylaş düğmesi ve 500 karakter sayacı kullanılıyor.
  Yeni gönderi/yanıt aynı bileşende; game ve replyTo payload'ları aynı.
  İstek sırasında alan ve eylemler kilitli; hata taslağı silmiyor.
- **ReviewRoot:** Post/PostHeader/GameTag/Badge ortak ailesine geçti.
  İnceleme metni tam uzunlukta; sunucudan gelen doğrulanmış saat,
  olumlu/olumsuz öneri, geliştirici rozeti, oyun/yazar bağlantısı ve
  şikâyet/engelleme menüsü korundu. Boş zaman alanı artık tek başına
  ayırıcı nokta göstermiyor.
- **/u/[username]:** bütün yükleme, hata ve profil durumları aynı NavBar
  ve IconButton kullanıyor. Arkadaşlık/gizlilik/moderasyon verisi değişmedi.

**Kapsam sınırları:** kapak yükleme ve gönderi medyası kapalı kararlara
uyularak eklenmedi. Backend sözleşmesi bulunmayan konum/favori türler,
anket, spoiler ve oyun durumu seçenekleri çalışıyormuş gibi gösterilmedi.
Bağlı hesaplar ve gizlilik mevcut Ayarlar akışından yönetilmeye devam
ediyor. Yeni paket veya SDK değişikliği yok. Açık/koyu/sistem korunuyor.

**Doğrulama:** 20 otomatik kontrol başarılı; iOS ve Android export başarılı.
Android emülatör görsel/dokunma testi tamamlanamadı: localhost:5037 ADB
sunucusu host:devices-l isteğine boş cihaz listesi (OKAY0000) dönüyor.
Gamerisen_API36 AVD kaydı mevcut, ancak ANDROID_HOME altında SDK/emulator
çalıştırılabilir dosyaları bulunamıyor. Kullanıcıdan emülatörü açması
istendi. Gerçek hesap üzerinde test gönderisi veya profil değişikliği
oluşturulmadı. Cihaz bağlanınca bekleyenler: profil yükleme/hata/tekrar
 deneme, biyografi klavye yerleşimi ve 150 sınırı, gönderi aç/kapat ve
500 sınırı, açık/koyu görünüm, inceleme menüsü ve kullanıcı profili geri.

**Ayrı kalan işler:** birleşik arama ve oyun liste kartı ailesi geçişi.
Haber detayında özet + Kaynakta oku kararı geçerli.

### 24 Eylül — Codex'in ekranlarının cihazda doğrulanması (Claude)

Codex'in iki bölümü de "emülatör bulunamadı, cihaz doğrulaması yapılmadı"
diyordu. Emülatör (Pixel 8, 411dp) açıldı; kurulu APK 4 Eylül tarihli 2.6.0
çıktı, 2.7.2 hata ayıklama derlemesi yeniden kuruldu ve uygulama canlı
Metro'ya bağlandı. Bekleyen listenin tamamı gözle görüldü.

**Çalıştığı doğrulananlar.** Ayarlar: profil kartı, 52 pt gruplu satırlar,
bildirim anahtarı + grup notu, Tema ve Dil seçim pencereleri, gizlilik,
Steam/Xbox, oyun verim, destek, kırmızı çıkış, hesap silme, sürüm altlığı —
koyu VE açık temada. Profil Düzenle: NavBar, 88 pt avatar + 32 pt rozet,
alanlar, 0/150 sayacı. Gönderi Oluştur: tam ekran modal, gerçek kimlik,
0/500 → 6/500, metin girilince Paylaş etkinleşiyor, İptal taslağı atıyor
(gerçek hesapta gönderi paylaşılmadı). ReviewRoot: PostHeader + doğrulanmış
saat rozeti + GameTag + tavsiye hapı, tam metin. `/u/[username]`: NavBar,
kimlik bloğu, iki düğme, sekmeler.

**Cihazda bulunan ve düzeltilen üç şey.**

1. **Çift artı.** `auth.addSteam` metninin içinde eski tasarımdan kalma bir
   `+` vardı; satıra `icon="plus"` eklenince ikon kutusu ve metin ikisi
   birden artı gösterdi ("＋ + Steam Hesabı Ekle"). Beş dilde de metnin
   başındaki işaret kaldırıldı — artıyı artık yalnız ikon kutusu çiziyor.
2. **Kullanıcı adı iki kez.** `/u/[username]` üst çubuğunun başlığı
   `@handle` idi ve iki satır altındaki kimlik bloğu aynı `@handle`'ı
   yazıyordu; kendi profilimizde aynı sebeple kaldırılmış olan tekrar
   buraya taşınmıştı. Başlık artık ADI gösteriyor (`displayName ||
   username`, ProfileHeader ile aynı seçim); profil gelene kadar çubuk boş
   kalmasın diye yoldaki kullanıcı adına düşüyor. Kullanıcı bulunamadı
   ekranında başlık `@kullanıcıadı` kaldı — orada kimlik bloğu yok.
3. **Ölü kod silindi.** `src/components/ui/SearchGameRow.jsx` ve
   `src/hooks/useSearchHistory.js` hiçbir yerden çağrılmıyordu;
   `tokens.ts` içindeki `component.searchScreen` bloğu da yalnız o yetim
   bileşene hizmet ediyordu. Üçü de kaldırıldı — günlüğün kendisi birleşik
   aramayı "ayrı kalan iş" sayıyor, yarım iskele ağaçta durmasın.
   (`useDesignGrid` DURUYOR: discover.jsx ve games.jsx onu kullanıyor.)

**Doğrulama:** `npm run check` 20/20, `npx expo export --platform ios`
başarılı, iki düzeltme emülatörde tekrar görüldü ("Steam Hesabı Ekle" tek
artı; başlık "Hasta Beşiktaşlı", `@fogrex` yalnız kimlik bloğunda). Tema
"Sistem"e geri alındı. iOS'ta görsel doğrulama yapılamadı (Mac yok).

**Karar bekleyenler.** `games.jsx` bu değişiklikte Faz-2 `GameCard` yerine
2.0 `ui/GameCard`'a geçti — kart ailesi kararı kullanıcıya bırakılmıştı,
diff'te verilmiş durumda. Kullanıcı adı alanındaki `#` ön eki kit'in kendi
tercihi (`s4.py:145`, `icon_='hash'`) ama uygulama her yerde `@handle`
gösteriyor. `check:spacing` tabanı 245 → 199'a düştü, güncellenmedi.

### 24 Eylül — G-03 sağlayıcı girişleri: Google yolu (Claude)

Kullanıcı "Google ve Steam ile giriş ekle" dedi. Ölçüm ikisinin aynı durumda
OLMADIĞINI gösterdi ve iş buna göre bölündü.

**Google — istemci yolu uçtan uca yazıldı.** Sunucu zaten hazırdı:
`/api/auth/google-signin` `main`'de var, id_token'ı Firebase'e federe kimlik
olarak veriyor ve `apple-signin` ile birebir aynı yanıtı döndürüyor. Eklenen:
`api/account.js → googleSignIn`, `services/session.js → signInWithGoogle`,
`services/googleAuthConfig.js`, `GoogleAuthButton` + `GoogleAuthButtonImpl`,
beş dilde iki metin, `app.json → extra.googleAuth`. Düğme giriş ekranında
Apple'ın altında, "veya" ayracının üstünde; ayraç artık en az bir sağlayıcı
varsa çiziliyor (eskiden yalnız iOS'ta vardı, Android'de hiç sağlayıcı
girişi yoktu).

**Hesap silme de kapsandı — süs değil, şart.** `delete-account` yalnız Apple
ve şifre biliyordu; Google hesabının şifresi olmadığı için ekran ona
doldurulamayacak bir alan gösterir, hesap uygulama içinden silinemezdi. App
Store 5.1.1(v) tam olarak bunu reddediyor. `mobile-delete` ucuna
`{ googleIdToken }` dalı eklendi (Apple dalıyla ortak `signInWithIdp`,
değişen tek şey providerId) ve ekrana Google ile yeniden doğrulama kondu.

**Tembel yükleme — cihazda ölçülerek eklendi.** İlk yazımda
`expo-auth-session` statik import edilmişti; emülatörde uygulamanın TAMAMI
`Cannot find native module 'ExpoCrypto'` ile düştü (APK 22 Eylül'de, paket
eklenmeden derlenmişti). Artık `GoogleAuthButton` yalnız kimlikler
yapılandırılmışsa `require` ediyor: özellik yapılandırılana kadar ne kod yolu
çalışıyor ne yerel bağımlılık aranıyor.

**AÇIK: iki OAuth istemcisi.** `google-services.json` yalnız type 3 (web)
istemcisini taşıyor. Google Cloud Console'da `androidClientId` (uygulamanın
SHA-1'iyle) ve `iosClientId` (+ ters çevrilmiş URL şeması) oluşturulup
`app.json → extra.googleAuth` içine yazılmalı; sonra YENİ YEREL DERLEME
gerekiyor (OTA yetmez). O ana kadar düğme çizilmiyor ve ekran bugünküyle
birebir aynı.

**Steam — YAPILMADI, sunucu ucu yok.** `AuthContext.loginSteam` ilk satırında
`requireAccount()` ile duruyor: bağlantı cihaza değil Gamerisen hesabına
yazılıyor, hesap yoksa yazacak yer yok. Steam callback'i profil döndürüyor,
oturum üretmiyor. "Steam ile giriş" için steamId'ye bağlı hesap açan/bulan
yeni bir uç gerekiyor ve üç ürün kararı açık: Steam e-posta vermiyor, aynı
kişinin e-postayla açtığı hesapla birleştirme kuralı yok, kullanıcı adı
üretimi tanımsız. Ayrıca `main`'e gidecek bir değişiklik.

**G-03 görsel geçişi de YAPILMADI.** Bu turda işlevsel taraf öncelendi.
Kırmızı birincil düğme kullanıcı kararıyla kalıyor; Apple'ın yerel düğmesi ve
koşul metninin formun üstündeki yeri (Guideline 1.2) korunacak.

**Doğrulama:** `npm run check` 20/20, `npx expo export --platform ios`
başarılı, `npm run check:access` temiz (yeni route yok). Emülatörde uygulama
hatasız açılıyor (TTI 954 ms, logcat'te ExpoCrypto yok); giriş ve hesap silme
ekranları bugünkü hâlleriyle birebir aynı — beklenen davranış, çünkü Google
yapılandırılmadı. Google akışının KENDİSİ denenemedi: istemci kimlikleri yok.

### 24 Eylül — G-03 Google: kütüphane değişimi (Claude)

**Neden.** Expo'nun AuthSession belgesi Google sağlayıcı yapılandırmasının
üstünde "Deprecated" yazıyor ve Google authentication rehberine yönlendiriyor;
rehber `expo-auth-session`'dan hiç bahsetmiyor, `@react-native-google-signin/
google-signin` ya da `react-native-nitro-google-signin` öneriyor. Kod hiç
çalışmadığı ve kullanıcıya ulaşmadığı için değişimin en ucuz anı buydu.

**Değişen.** `expo-auth-session` ve `expo-crypto` çıktı,
`@react-native-google-signin/google-signin` 16.1.5 ve config plugin'i girdi.
Yalnız `GoogleAuthButtonImpl` yeniden yazıldı; dışa verdiği `onIdToken` /
`onError` / `guard` arayüzü aynı, giriş ve silme ekranları ile sunucuya
dokunulmadı. Android'de tarayıcı yerine yerel hesap seçici açılıyor. Her
akıştan önce `GoogleSignin.signOut()`: yapılmazsa Android son hesabı sormadan
döndürüyor.

**Yapılandırma sadeleşti.** Kodda yalnız zaten var olan `webClientId`
kullanılıyor. `app.json → extra.googleAuth` artık iki bayrak taşıyor:
`androidEnabled` (Firebase Android uygulamasına yerel/EAS VE Play App Signing
SHA-1'leri eklenince), `iosEnabled` (Firebase'e iOS uygulaması eklenip
`GoogleService-Info.plist` `ios.googleServicesFile` olarak bağlanınca; plugin
ters URL şemasını oradan okuyor). İkisi de yeni yerel derleme ister.

**Çökme kapısı güçlendi.** `extra` OTA ile değişebiliyor, yerel modül
değişemiyor. `GOOGLE_YAPILANDIRILDI` artık bayrağa ek olarak
`TurboModuleRegistry.get('RNGoogleSignin')`'e de bakıyor: bayrağı açan bir
güncelleme modülü içermeyen eski kuruluma inerse düğme çizilmiyor, uygulama
düşmüyor. Tembel `require` duruyor (kütüphane importu `getEnforcing` ile
fırlatıyor).

**Plugin'in etkisi ölçüldü.** Seçeneksiz (Firebase) kipte kaynak
okunarak ve `expo config --type introspect` ile: iOS URL şemaları değişmedi
(`gamerisen`, `com.gamerisen.app`, `exp+gamerisen`), `ios.googleServicesFile`
yokken iOS adımları hiçbir şey yapmıyor; Android'deki google-services adımları
`android.googleServicesFile` ile zaten uygulanıyordu.

**Doğrulama:** `npm run check` geçti, `npx expo export` iOS ve Android
başarılı. Cihazda doğrulanamadı: bu makinede `adb` / Android SDK bulunamadı.
Google akışının kendisi yine denenmedi (bayraklar kapalı).
