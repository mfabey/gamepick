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
