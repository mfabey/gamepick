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
