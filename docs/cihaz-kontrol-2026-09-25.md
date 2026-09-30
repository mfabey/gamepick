# Cihaz kontrol listesi — 25 Eylül 2026

`design-v2` dalında 25 Eylül'de yapılan 2.0 geçişlerinin **hiçbiri cihazda
görülmedi**: her iş `npm run check` + `npx expo export` (iOS ve Android) ile
doğrulandı, ama o gün emülatör yoktu. Bu liste o açığı kapatmak için.

**Kapsam:** `0038131` (kart ailesi 3/4) → `ce6d6da` (EmptyState +
CollectionPicker), 12 commit. Ayrıntı ve gerekçeler
`docs/design-migration-progress.md`'de, aynı tarihli kayıtlarda.

## Başlamadan önce

- [ ] **Android SDK yerinde mi?** 25 Eylül'de `ANDROID_HOME`
  (`C:\Users\baymf\AppData\Local\Android\Sdk`) diskte YOKTU: `emulator` ve
  `adb` bulunamadı. Sanal cihaz tanımı duruyor (`~/.android/avd/Gamerisen_API36`).
  Android Studio → SDK Manager'dan SDK yeniden kurulunca aynı AVD açılmalı.
- [x] Dal `design-v2`, son commit `ce6d6da` ya da sonrası. (26 Eyl: `784c9f3`, iOS 26.5 simülatör, Release)
- [x] Her ekranı **koyu ve açık temada** gör (Ayarlar → Tema). (sistem görünümü `simctl ui appearance` ile)
- [x] Metin taşması için en az bir kez **Almanca** (en uzun çeviriler) —
  Ayarlar → Dil.
- [x] Mümkünse bir kez **dar ekran** (iPhone SE / 375 pt ya da küçük Android). (26 Eyl: "Gamerisen SE" simülatörü, iPhone SE 3 · 375×667)

İşaretleme: `[x]` geçti · sorun varsa satırın altına ne görüldüğünü yaz.

## Her ekranda ortak

- [ ] Üst çubuk (NavBar): geri oku solda, başlık ortada, geri çalışıyor.
  → **Oturumsuz Koleksiyonlar / İstatistikler / İstek listesi'nde NavBar YOK** — bkz. Bulunan sorunlar 2.
- [x] Kart yüzeyleri kenarlıksız, zeminden ayrışıyor (açık temada da).
- [ ] Android'de anahtarlar (Switch) kitin çizdiği 51×31 anahtar, Material değil.
- [x] Sekme çubuğu olmayan ekranlarda liste sonunda gereksiz büyük boşluk yok. (Oyun Kartları, İstatistikler)

## Giriş ve filtreler (gece yarısı commit'leri)

**Giriş — `account.jsx` (G-03)** · Profil → Giriş yap
- [x] Logo, büyük başlık, alt metin; Apple (iOS) ve Google düğmeleri 50 pt.
  → Apple 50 pt. Google düğmesi yok: `app.json` → `googleAuth.iosEnabled: false` (bilinçli, `design-migration.md` §7 soru 4).
  → Apple düğmesinin metni uygulama dilini değil **iOS dilini** izliyor (yerli düğme; uygulama Almanca, cihaz Türkçe iken "Apple ile Giriş Yap").
- [x] Sözleşme onayı sağlayıcı düğmelerinin ÜSTÜNDE; kayıtta onaysız Apple/Google açılmıyor.
- [x] Ayrı alanlar; şifre göster/gizle; kullanıcı adı uygunluğu alanın altında.
- [x] "Şifremi unuttum" sağa yaslı; en altta "Hesabın yok mu? Hesap oluştur".
- [x] Kırmızı CTA (bilerek — kullanıcı kararı).

**Filtre sayfası — `FilterSheet` (G-06b)** · Oyunlar → Filtrele
- [x] Alttan açılıyor, 24 köşe, tutamaç; "Sıfırla" solda, × sağda, başlık ortada.
- [x] Almanca "Zurücksetzen" başlıkla çakışmıyor.
- [x] Alt çubukta "Uygula (n)" 52 pt.

**Oyunlar sonuçları (G-06)** · Oyunlar
- [x] "⚙ Filtrele ②" hapı bölüm çiplerinin başında, sayı rozeti doğru.
- [x] Etkin filtre çipleri × ile kalkıyor.
  → Metacritic 80+ seçilince "Bazı filtreler uygulanamadı — Metacritic puanı" bandı çıkıyor: puan filtresi sunucuda çalışmıyor (istemci doğru bildiriyor).

**Kütüphane kutucukları (kart ailesi 3/4)** · Ayarlar → Kütüphane
- [x] 3 sütun küçük kart; alt satır "134 sa · ₺1.299" (Steam), "1.250 G" (Xbox). (Steam; Xbox bağlı değil)
- [ ] Almanca/İspanyolca'da alt satır kesiliyor mu?
  → **Evet**, SE + DE: "43.3 Std · Koste…". Ondalık da noktalı (DE'de "43,3").
- [ ] Xbox'ta Game Pass etiketi kapak üstünde.

## Tasarım dışı ekranlar

**Arkadaşlar — Grup A (`6da0257`)**
- [ ] `friends` · Topluluk → sağ üst kişiler ikonu: "Arkadaşlar · n", arama,
  gelen istek bandı (yüz yığını + sayı rozeti, kırmızı zemin YOK).
  → "Freunde · 7", arama ✓. Bekleyen istek yok — bant görülemedi.
- [x] Satıra **uzun basma** → kişi menüsü açılıyor (profil / mesaj / çıkar / engelle / şikâyet).
- [x] Geliştirici rozeti adın yanında; uzun adda ad kısalıyor, rozet kesilmiyor. (rozetli uzun ad yok; kısa adda rozet doğru)
- [ ] `friend-requests` · istek bandına dokun: Kabul et / Yoksay eşit 44 pt; işlem sürerken yalnız o satır kilitli.
  → İstek yok: "Keine offenen Anfragen" boş durumu doğru; düğmeler denenemedi.
- [x] `steam-friends` · Ayarlar → Steam arkadaşları: kart açılıp kapanıyor (ok 180° dönüyor), "46 sa".
  → SE + DE'de başlık "Deine Steam-Freu…" kesiliyor.

**Hesap / ayar — Grup B (`ddaa05f`)**
- [x] `social-settings` · Ayarlar → Gizlilik: dört satır ikon + açıklama + anahtar; anahtar anında dönüyor. ("Aktivität teilen" açıldı, 2 sn kaldı, geri kapatıldı)
- [ ] Ayarlar → **Engellenenler**: sayfa engellenenler bölümüne kayarak açılıyor.
  → SE'de sayfa tek ekrana sığıyor, kayma gözlenemedi.
- [x] Engellenen yokken "Engellenen kimse yok" satırı; varken "Engeli kaldır" 34 pt. (engellenen yok; "varken" denenmedi)
- [ ] (Ağ kapalıyken) "Gizlilik ayarların okunamadı" bandı + Tekrar dene; anahtarlar devre dışı.
- [ ] `username-setup` · kullanıcı adı olmayan hesapla profil: kontrol sürerken gösterge, sonuç alanın altında, "Devam et" yalnız uygunken.
- [x] `delete-account` · Ayarlar → Hesabı sil: uyarı kartı kırmızı tonda (açık temada okunuyor mu?), şifre göster/gizle, silme düğmesi kırmızı tonlu. (yalnız bakıldı)
- [ ] `auth` · Ayarlar → Steam bağla → dönüş: "bağlanıyor → bağlandı" ekranı, sonra profile yönlendirme.

**Koleksiyon / liste — Grup C (`df08571`)**
- [x] `collections` · Ayarlar → Koleksiyonlar: satırlar 2×2 kapak mozaiği; uzun basma → sil onayı. (deneme koleksiyonu "Test" bu yolla silindi)
- [x] Sağ üst **+** → ad penceresi: emoji seçimi (seçili kırmızı çerçeve), alan, Vazgeç / Oluştur; **klavye açıkken pencere görünüyor mu?** (SE'de klavyenin hemen üstünde, tam)
  → Açık temada pencerenin arkası karartılmıyor gibi; koyu temada karartma var.
- [ ] Boş koleksiyon listesinde öneri kartları çalışıyor.
- [x] `collection/[id]`: başlık "emoji ad" + "n oyun"; sağ üstte paylaş + **⋯**. (paylaş boş koleksiyonda bilerek gizli, `games.length > 0`)
- [ ] ⋯ → Yeniden adlandır / Sil / Vazgeç — **Android'de üç düğmenin sırası** doğru mu?
- [x] `lists` · Ayarlar → Listeler: Popüler/Yeni segmenti; **seçili sekmeye tekrar basınca liste kaybolmuyor** (düzeltilen hata).
- [x] Editör listesinde "EDİTÖR" rozeti; beğeni kalbi dolu/kırmızı. (rozet ✓; beğenme denenmedi)
- [x] `list/[id]`: yüklenirken geri düğmesi var; ⋯ → sahipse yayından kaldır onayı, değilse Şikâyet et → şikâyet sayfası. (sahip yolu denenmedi — oturum gerekli)
  → Şikâyet sayfası alt kenardan ~95 pt kopuk — bkz. Bulunan sorunlar 4.

**İstatistik — Grup D (`0342425`)** · Ayarlar → İstatistikler
- [x] Büyük sayı kartı, 2×2 kutular, tür çubukları, indirim satırları. (tür yalnız tek satır; çubuk için veri az)
  → DE: "%65" ("65 %" olmalı), "1 Spiele entdeckt" (tekil), alt başlık "Was du in den letzten 7 Ta…" kesik.
- [x] Almanca "Spiele in deinen Listen" kutuda kesiliyor mu (özellikle dar ekran)? (SE'de sığıyor)

**Swipe / oyun kartları / reels — Grup E (`07e195a`)**
- [x] `swipe` · Ana sayfa selamlamasındaki "Senin için" bağlantısı: kartta tür etiketleri ve puan okunuyor.
  → NavBar alt başlığı ("Sağa kaydır: ilgimi çekti · Sola:…") TR ve DE'de 402 pt'de bile kesiliyor.
- [x] Sağa/sola kaydırırken "BEĞEN / GEÇ" damgaları; bırakınca kart uçuyor; geri al (sağ üst) çalışıyor, desteye dönüyor. (damga metinleri "İLGİMİ ÇEKTİ" / "BANA GÖRE DEĞİL")
- [x] Alt düğmeler: geç (kırmızı) · bilgi · beğen (yeşil).
- [x] `game-cards` · Ayarlar → Oyun kartları: özet kartı; **şehir anahtarı** açınca şehir çözülüyor, kapatınca kalkıyor. (izin "Bir kez", şehir çözüldü, anahtar geri kapatıldı)
  → Konum izni metni uygulama Almanca iken **Türkçe** — `app.json`'da `locales` yok (25 Eyl öncesinden).
- [x] Sıra satırlarında paylaş düğmesi; liste sonunda sekme boşluğu yok.
  → DE: "43Std." (boşluksuz).
- [x] `reels` · Videolar → Kısa Klipler: geri düğmesi cam daire; yan düğmeler cam daire.
- [x] **Açık renkli sahnelerde** cam daireler seçilebiliyor mu? (Knight Online, mor/beyaz sahne)
- [x] Takip / Kaydet etkinken ikon kırmızı ve dolu — videoda görünüyor mu? (Takip açıldı, geri alındı)
- [x] Duraklatınca ortada 2.0 oynat düğmesi; basılı tutunca arayüz soluyor.
- [x] Yatay modda yan düğmeler küçük (34) ve satır hâlinde; döndürme düğmesi yerinde.

**Kütüphane gövdesi (`14839fa`)** · Ayarlar → Kütüphane
- [ ] Hesap bağlı değilken: ikon + başlık + Steam/Xbox bağlama satırları (Ayarlar'la aynı).
- [x] Profil yokken yalnız "Profil oluştur" düğmesi. (oturumsuz: "Hesap oluştur"; ikon kutusuz, düğme tam genişlik — EmptyState'ten farklı)
- [x] Kaynak çipleri (Genel · Steam · Xbox); seçili çip dolu. (yalnız Steam bağlı → tek çip)
- [ ] Genel görünümde avatar yığını (halkalı); Steam kartında 4 hücre sığıyor mu (değer sütunu)?
  → **Sığmıyor**: SE + DE'de değer "$162…." kesik. (Genel görünüm tek kaynakta yok)
- [x] Arama kutusu + temizle; sıralama segmenti + sağda sayı.

## Ortak bileşenler (`ce6d6da`)

**Boş durum — `EmptyState` (19 ekran)**. Örnekler: boş koleksiyon
(koleksiyon detayı), oturumsuz Mesajlar, arama sonucu yok (Kütüphane'de
anlamsız bir arama), İstatistikler (yeni hesap).
- [x] 84'lük ikon kutusu + başlık + açıklama + 260 pt nötr düğme.
- [x] **Dar ekranda / klavye açıkken** taşma yok. (SE, Almanca; klavyeli durum denenmedi)
  → Mesajlar ve Oyun Kartları oturumsuz metni "Steam arkadaşlarını görmek için Gamerisen hesabın gerekiyor" — iki ekranda da bağlam dışı.
- [ ] Nötr (kırmızı olmayan) düğme yeterince çağırıcı mı? — tasarım kararı, not al.
- [x] Liste içi kısa boy (ör. profilde boş sekme, Kütüphane'de sonuç yok) sıkışmıyor.
  → Ama klavye açıkken Kütüphane "sonuç yok" boş durumu SE'de **klavyenin arkasında** kalıyor.
- [ ] İkonlar anlamlı: çevrimdışı → wifi yok, hesap gerekli → kişi+, kilitli → kilit.
  → `ProfileGate` "hesap gerekli" için **kilit** kullanıyor; Mesajlar / Oyun Kartları aynı durum için kişi+.

**Koleksiyon seçici — `CollectionPicker`** · Oyun detayı → koleksiyona ekle; Reels → Kaydet
- [ ] Alttan açılıyor, tutamaç; koleksiyonlar tek kutuda; seçim dairesi dokununca kırmızı + tik.
  → Alttan açılıyor ama **alt kenara oturmuyor** (~54 pt boşluk) — bkz. Bulunan sorunlar 4. Seçim kısmı oturum istiyor.
- [x] "Yeni koleksiyon" → alan + Oluştur; oluşturunca oyun yeni koleksiyona ekleniyor.
  → Ama "Neue Sammlung" satırı tek koleksiyonla bile kaydırmanın altında saklı; alan açılınca "Erstellen" yarıdan kesik.
- [ ] Klavye açıkken alan ve düğme görünüyor.
  → Alan görünüyor, **düğme görünmüyor**; sayfa klavyenin ~70 pt üstüne fırlıyor.
- [x] Alt kenarda "Kaydet" güvenli alanın üstünde. (ama sayfa alt kenara oturmuyor — bulgu 4)

## Bulunan sorunlar

(Kontrol sırasında buraya: ekran · tema · dil · ne görüldü · ekran görüntüsü yolu.)

### 26 Eylül — iOS simülatör turu (oturumsuz)

Ortam: iPhone 17 Pro (402 pt) + iPhone SE 3 (375 pt), iOS 26.5, Release
derleme. Dokunma/kaydırma AXe CLI ile, geçiş `simctl io recordVideo` (60 fps)
ile kaydedilip kare kare incelendi. **Oturum açılmadı** — hesap isteyen
maddeler (Arkadaşlar, Grup B, koleksiyonlar, İstatistikler, Oyun Kartları,
kütüphane içeriği, CollectionPicker seçimi, Takip/Kaydet etkin hâli) boş kaldı.

1. **Kart → detay büyüme geçişinde titreme — DOĞRULANDI (eski devirdeki tek
   açık madde).** Bindirme 2.773 sn'de kalkıyor, 2.789–2.823 arası **3 kare
   (~50 ms) ana sayfa** görünüyor, detay 2.839'da geliyor. Sebep: bindirme
   anasayfanın odak kaybında (`useFocusEffect` temizliği, `setBuyuyen(null)`)
   kalkıyor; odak kaybı detay çizilmeden oluyor. `CardExpand` başındaki
   "detay ilk karesini çizene kadar duruyor" varsayımı tutmuyor. Ayrıca
   büyüme boyunca yüzen sekme çubuğu bindirmenin ÜSTÜNDE kalıyor, devirde
   tek karede yok oluyor.
   → **DÜZELTİLDİ (26 Eyl):** detay `devirTamam()` ile ilk karesini
   bildiriyor, anasayfa bindirmeyi o zaman kaldırıyor (`gecisKaynak.js` →
   DEVİR, 1 sn yedek). Aynı ölçümde ikinci kusur da çıktı: detay kapağı
   200 ms solmayla geliyordu, devirde kapak kararıp geri geliyordu —
   büyümeyle gelişte ilk görselde solma kapatıldı. Doğrulama 60 fps kayıtla:
   soğuk ve ılık geçişte 0 anasayfa karesi, 0 kapaksız kare; geri küçülme
   bozulmadı. Sekme çubuğu maddesi AÇIK.
2. **`ProfileGate` NavBar'sız** — oturumsuz Koleksiyonlar, İstatistikler,
   İstek listesi: geri oku ve başlık yok, çıkış yalnız kenar kaydırmasıyla.
   Kapı ikonu kilit (hesap gerekli için kişi+ bekleniyordu).
   → **DÜZELTİLDİ (26 Eyl):** `ProfileGate` `title` alıp NavBar çiziyor (üç
   çağıran kendi başlığını veriyor), ikon `userplus`. Oturumsuz üç kapıda geri
   + başlık görüldü, geri çalışıyor; oturumlu yolda tek NavBar.
3. **Açık temada durum çubuğu beyaz kalıyor.** Oyun detayı yığında dururken
   üstüne açılan her ekranda (Listeler, Koleksiyonlar, Giriş…) saat/pil
   açık zeminde görünmüyor. Detaya girilmeden aynı ekranlar doğru (koyu).
   Sebep: `game/[id].jsx:441` `<StatusBar style=…'light'>` ekran örtülünce de
   takılı kalıyor; yalnız odaktayken çizilmeli.
   → **DÜZELTİLDİ (26 Eyl):** detayın StatusBar'ı yalnız odaktayken çiziliyor
   (ekranın mevcut `focused` durumu). Doğrulama, açık tema: detay (beyaz) →
   üstüne Listeler (koyu) → geri detay (beyaz).
4. **Alt sayfalar alt kenara oturmuyor** — CollectionPicker (~54 pt) ve
   ReportSheet (~95 pt) altında arkadaki ekran görünüyor. İkisi de
   `KeyboardAvoidingView behavior="padding"` kullanıyor; kullanmayan
   FilterSheet doğru oturuyor. Soğuk başlatmada da tekrarlandı.
   → **KÖK NEDEN ÖLÇÜLDÜ VE DÜZELTİLDİ (26 Eyl):** KAV içindeki sayfanın
   `maxHeight: '82%'`'i ekrana değil, yüksekliği içerikten gelen KAV'a göre
   çözülüyor (ölçüm: KAV 305 · sayfa 250 = 305 × 0.82). Aynı hata
   ReviewComposer'da da vardı. Üçü `useAltSayfaSiniri` ile sayısal tavana
   geçti; klavye açıkken sayfa klavyeye oturup küçülüyor, üstte kapatmak
   için karartma şeridi kalıyor. Yan kazanç: ReportSheet'in not alanı
   kırpılıp görünmüyordu, artık görünüyor; klavye açılınca liste nota
   kayıyor. SE'de üç sayfa, klavyeli/klavyesiz doğrulandı.
5. Küçükler: Swipe NavBar alt başlığı kesik (TR/DE) · Mesajlar ve Oyun
   Kartları oturumsuz metni Steam arkadaşlarından söz ediyor · Metacritic
   filtresi sunucuda çalışmıyor (bant doğru uyarıyor) · Filtre sayfası açıkken
   gelen derin bağlantı yeni ekranı Modal'ın ALTINDA açıyor (uç durum).

### 26 Eylül — oturumlu tur (Gamerisen SE, 375 pt, Almanca, açık + koyu)

Deneme sırasında değiştirilen her şey geri alındı: gizlilik anahtarı,
şehir anahtarı, Reels takibi; oluşturulan "Test" koleksiyonu silindi.
Denenmeyenler: istek bandı (bekleyen istek yok), çevrimdışı bandı,
`username-setup`, Steam bağlama dönüşü, boş koleksiyon öneri kartları,
liste beğenme, Xbox.

6. **CollectionPicker düzeni bozuk** (bulgu 4'ün uzantısı): liste penceresi
   ~57 pt'ye sıkışıyor, "Neue Sammlung" tek koleksiyonla bile gizli; alan
   açılınca "Erstellen" yarıdan kesik; klavye açıkken sayfa klavyenin
   ~70 pt üstüne fırlıyor ve düğme hiç görünmüyor. Üçü de `KeyboardAvoidingView`
   hesabının Modal içinde yanlış olmasıyla tutarlı.
   → **DÜZELTİLDİ** — aynı kök neden (bulgu 4).
7. **Kütüphane dar ekranda taşıyor**: Steam kartında değer hücresi
   "$162…." kesik; kutucuk alt satırı "43.3 Std · Koste…" kesik.
   → **DÜZELTİLDİ (26 Eyl):** değer kuruşsuz (`formatPrice(x, { tam: true })`
   → "$162", "₺5.350") + hücrede `adjustsFontSizeToFit` güvenlik ağı. Kutucuk:
   saat ≥10'da tam, altında yerel tek ondalık ("4,5 Std"); ücretsiz oyunda
   fiyat yok (Wert toplamı da saymıyor); oynanmamış "0 Std · $19.30"
   ("Nicht gespielt ·…" fiyatı yutuyordu). `library.notPlayed` 5 dilden
   silindi (check:i18n). SE + DE'de 8 kutucuk da sığıyor.
8. **Boş durum klavyenin arkasında**: Kütüphane'de sonuçsuz arama, klavye
   açıkken (SE).
   → **DÜZELTİLDİ (26 Eyl):** liste klavye iç boşluğu alıyor, klavye
   açılınca arama kutusu üste kayıyor, sürükleyince klavye kapanıyor. SE'de
   "sonuç yok" başlığı ve açıklaması klavyenin üstünde.
9. **Biçim / çeviri (DE)**: "1 Spiele" ve "1 Spiele entdeckt" (tekil yok),
   "%65" (→ "65 %"), "43Std." (boşluk), "43.3" (→ "43,3"), "Dein
   meisterkundetes Genre" (Almancası tuhaf). NavBar kesikleri: "Deine
   Steam-Freu…", İstatistikler alt başlığı, koleksiyon adı.
   → **DÜZELTİLDİ (26 Eyl):** `tSay(n, tekil, çoğul)` + 4 tekil anahtar
   (5 dil) — aynı hata EN/ES/PT'de de vardı ("1 games"). `formatPercent`:
   TR "%65", diğerleri "65%" (formatDiscount'la aynı kural). Oyun Kartları
   ortak `home.hoursShort` + boşluk ("43 Std", TR'de "43 sa"; `gc.hoursShort`
   silindi). "Dein Top-Genre"; `sf.title`, `stats.subtitle`, `swipe.subtitle`
   kısaltıldı (bulgu 5'teki Swipe kesiği de). "43.3" → bulgu 7. Koleksiyon
   adı kullanıcı içeriği, kesilmesi normal. SE'de DE ve TR ile doğrulandı.
   Açık: Swipe kartındaki tür etiketleri sunucudan Türkçe geliyor
   ("Aksiyon") — uygulama dilinden bağımsız, bu işten önce de böyleydi.
10. **Konum izni metni yalnız Türkçe** — `locales` yok; İngilizce inceleme
    yapan App Store incelemecisi de Türkçe görür. 25 Eylül öncesinden.
11. Profil "Sammlungen · 0" derken Koleksiyonlar'da bir (boş) koleksiyon var.

