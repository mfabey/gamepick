# Gamerisen — Profil & Topluluk revizyonu · tasarım brifi

## Rolün ve çıktın

Sen mobil ürün tasarımcısısın. **Gamerisen**'in profil ve topluluk bölümünü
yeniden tasarlayacaksın. Uygulama React Native (Expo SDK 57, expo-router) ile
yazılmış, **iOS öncelikli**, koyu tema varsayılan.

Çıktı: **tek bir HTML artifact**. İçinde:

1. Önce/sonra **bilgi mimarisi haritası** (hangi ekran nereye taşındı, ne kalktı)
2. **390×844 telefon çerçeveleri** içinde ekran maketleri
3. Her ekranın altında **ölçü notu**: yükseklik, dolgu, yarıçap, punto/ağırlık,
   kullanılan jeton adı, Ionicons ikon adı
4. Her ekranın altında **2–4 cümlelik gerekçe**: ne değişti, hangi eski öğe
   kalktı, neden

Maketler koda **birebir** uygulanacak. Ölçüsü yazılmayan öğe kodlanamaz.

---

## Ürün bağlamı

Kullanıcılar PC oyunu keşfediyor; Steam/Xbox kütüphanesini bağlıyor; koleksiyon
ve istek listesi kuruyor; oynadıkları oyunlara **doğrulanmış inceleme** yazıyor
(saat sayısı Steam'den okunuyor, kullanıcı yazamıyor — "doğrulanmış" kelimesinin
tek dayanağı bu) ve topluluk akışında konuşuyor.

Alt sekme çubuğu **beş sekme** ve **değişmiyor**: Ana sayfa · Topluluk · Videolar ·
Mesajlar · Profil. Yüzen çubuk: 64pt yükseklik, kenardan 20pt, alttan 24pt inset,
arkası bulanık.

---

## Bugün ne var (ölçüldü)

**Profil sekmesi** — kimlik sayfası değil, *menü*:

- Kimlik satırı: avatar 56pt + ad + `@kullanıcı · 214 oyun` + Steam bağlı çipi
- 2 sayaç kartı (169×80): arkadaş · istek listesi
- "Bu hafta" kartı: 7 çubuklu mini grafik, tamamen yerel veriden
- **10 karolu kısayol ızgarası** (4 sütun): Koleksiyonlar, İstek listesi,
  Kütüphane, İstatistik, Kartlar, İncelemeler, Keşfet, Mesajlar, Steam
  arkadaşları, Listeler
- Bağlı hesaplar listesi (Steam / Xbox)
- Kullanıcının **ürettiği hiçbir şey** bu sayfada görünmüyor.

**Sosyal ekran** (`/social`, sekme değil ayrı sayfa): akış / arkadaşlar /
istekler sekmeleri, kullanıcı arama, istek kabul, engelle/şikayet.

**Topluluk sekmesi**: üstte "yazabileceğin oyunlar" yatay şeridi, altında üç
sekme — tartışma (gönderiler) / topluluk (incelemeler) / benimkiler.

**Oyun detay sayfası**: yalnız Steam'in toplu inceleme yüzdesi var. Kullanıcı
incelemesi hiç görünmüyor.

**Başka bir kullanıcının profil ekranı YOK.** Kişiye özel tek hedef sohbet.

---

## Hedef

### A. Profil = Instagram mantığı, oyun içeriğiyle

Profil artık **kimlik + üretilen içerik** sayfası. Menü değil.

- Üst çubuk: solda `@kullanıcı`, sağda ayarlar dişlisi
- Kimlik bloğu: avatar (fotoğraf veya ön ayar), görünen ad, kısa bio satırı
  (**yeni alan**), Steam/Xbox bağlı çipi (6pt yeşil nokta + metin)
- **Üç sayaç, dokunulabilir**: gönderi · arkadaş · oyun.
  (Koleksiyon sayacı yok — o sayı zaten sekme şeridinde görünecek; aynı sayı
  ekranda iki kez durmayacak.)
- Eylem satırı — **kendi profilim**: "Profili düzenle" + "Paylaş"
- Eylem satırı — **başkasının profili**: birincil "Arkadaş ekle" + "Mesaj" + `⋯`
- **Dört içerik sekmesi** (Instagram'ın ızgara sekmeleri gibi, ikonlu):
  1. **Koleksiyon** — 3 sütun kapak ızgarası
  2. **İstek listesi** — 3 sütun kapak ızgarası
  3. **İncelemeler** — inceleme kartı listesi (kapak + doğrulanmış saat rozeti)
  4. **Gönderiler** — topluluk gönderileri listesi
- Kapak oranı **3:4** (Instagram karesi değil). 3 sütunlu ızgarada tek kapağın
  ölçüsünü hesapla ve yaz.
- Her sekmenin **kendi boş durumu** var; kendi profilimdeki boş durum eylem
  önerir ("ilk incelemeni yaz"), başkasınınki yalnız bilgi verir.
- "Bu hafta" grafiği kalıyor ama **yalnız kendi profilimde** görünüyor; yerini
  ve görsel ağırlığını sen kararlaştır.

### B. Başkasının profili — yeni ekran

Aynı iskelet, farklı üst blok. Ek olarak:

- **Arkadaşlık durum makinesi**, dört durum:
  `Arkadaş ekle` → `İstek gönderildi` (geri alınabilir) → `Arkadaşsınız ✓`
  → `Sana istek gönderdi` (satır içinde Kabul / Reddet).
  Her durumun buton dolgusunu, metnini ve ikonunu ayrı ayrı çiz.
- `⋯` menüsü: Mesaj · Arkadaşlıktan çıkar · Engelle · Şikayet et.
  (Engelleme ve şikayet **bulunabilir** olmak zorunda — App Store Guideline 1.2.)
- **Gizli profil görünümü**: kimlik bloğu ve sayaçlar görünür, içerik sekmeleri
  kilitli. Bugün "gizli profil" anahtarı yok; mevcut gizlilik ayarları
  `shareActivity` · `discoverable` · `showPresence`. Yeni bir anahtar
  öneriyorsan adını ve ayarlar sayfasındaki yerini yaz.

### C. Arkadaşlar sekmesi kalkıyor

Sosyal ekranın üç sekmeli yapısı dağılıyor; bağlantı kurma yüzeyleri Instagram
mantığıyla yeniden yerleşiyor:

- **Arkadaş listesi**: profildeki arkadaş sayacına dokununca açılan liste
  (Instagram'ın takipçi listesi gibi). Üstünde arama kutusu.
- **Gelen istekler**: bu listenin en üstünde ayrı bant/satır + rozet. Rozet
  nerede görünür (profil sayacı, sekme çubuğu, liste başlığı) — karar ver ve
  gerekçelendir. Kural: kırmızı sayaç yalnız **eyleme dönüşen** bilgi için.
- **Kullanıcı arama / keşif**: yerini sen öner (topluluk sayfası üstü mü,
  arkadaş listesi üstü mü). İki ayrı arama kutusu olmayacak.
- **Steam arkadaşları** ekranı ayarlara taşınıyor (davet/keşif aracı).

**Arkadaşlık modeli karşılıklı kalıyor**: istek → kabul. Instagram'ın tek yönlü
takibini varsayma; "Takip et / Takipçi / Takip edilen" sözlüğünü kullanma.

### D. Topluluk sayfası — X (Twitter) mantığı

- Tek ana akış. Üstte kalıcı **kompozitör satırı** ("Ne düşünüyorsun?").
- Gönderi **kart değil satır**: avatar solda 40pt, sağda `Ad · @kullanıcı · 2sa`,
  metin, isteğe bağlı oyun çipi, altta eylem sırası — yanıt · beğeni · paylaş.
  Ayırıcı hairline; kart gölgesi yok.
- **Konu (thread) görünümü**: kök gönderi üstte büyük punto, yanıtlar altında;
  avatarları bağlayan ince dikey çizgi. Yanıta yanıt ikinci seviye.
- **İnceleme yanıtları buraya düşüyor**: bir incelemeye yazılan yanıt oyun
  sayfasında **görünmüyor**, topluluk akışında görünüyor. Bu durumda kök öğe
  normal gönderi değil, **inceleme kartı** (oyun kapağı + doğrulanmış saat +
  başparmak) olarak çiziliyor; üstünde "X, Y'nin incelemesine yanıt verdi"
  bağlam satırı. Bu iki katmanlı kartı ayrıca çiz.
- Akış sekmesi en fazla iki (ör. "Keşfet" / "Arkadaşlar"). Bugünkü üç sekme
  sadeleşiyor — "benimkiler" artık profilde duruyor.
- "Yazabileceğin oyunlar" şeridi kalıyor ama yeni yerini ve ağırlığını sen
  belirle: sayfanın boş görünmemesini sağlayan tek şey o.

### E. Oyun sayfası — incelemeler oraya geliyor

- **Steam'in toplu yüzdesi kalıyor**; kullanıcı incelemeleri onun **altında**
  ayrı bölüm.
- **Kritik kısıt — "0 inceleme" yazma.** Kullanıcı sayısı azken her oyunun
  altında sıfır görmek uygulamayı ölü gösterir. İncelemesi olmayan oyunda bölüm
  ya bir **davete** dönüşür ("bu oyunu oynadın, ilk incelemeyi sen yaz") ya da
  hiç çizilmez — hangisini seçtiğini yaz.
- İnceleme kartı: kapak, yazar avatarı + adı, `shield-checkmark` + doğrulanmış
  saat, başparmak yukarı/aşağı, kırpılmış metin, altta **yanıt sayısı**.
  Yanıt metni burada **görünmüyor** — dokunmak topluluk konusunu açıyor.
- Kendi incelemem varsa bölümün en üstünde "İncelemeni düzenle".
- En fazla 3 inceleme + "Tümünü gör".

### F. Ayarlar sayfası

Profilden kalkan hedefler ayarlara taşınıyor: **Kütüphane, İstatistik, Oyun
kartları, Listeler, Keşfet, Steam arkadaşları**, bağlı hesaplar (Steam/Xbox).

Bugünkü ayarlar sayfası **bölüm başlıksız**; gruplama yalnız boşlukla yapılıyor
(kategori adları bilgi taşımıyordu diye kaldırılmıştı). Yeni satırlarla liste
neredeyse iki katına çıkıyor. Sorun bu: **taranabilirliği bölüm başlığı ekleyerek
mi, eklemeden mi çözüyorsun?** Kararını gerekçesiyle yaz ve ayarların tam
sırasını grup grup maket olarak çiz.

---

## Tasarım jetonları — TEK doğruluk kaynağı

**Yeni renk üretme.** Bir yerde renk eksikse bu listeden türet ve sebebini yaz.

### Koyu tema (varsayılan)

```
bg #0A0B0D · surface #101114 · surface2 #15161A · surface3 #1C1E23 · surface4 #2A2C33
border rgba(255,255,255,.07) · borderStrong rgba(255,255,255,.12)
brand #E8242B · brandText #FF6B6F · brandWash rgba(232,36,43,.08) · brandWashBorder rgba(232,36,43,.28)
text1 #F4F4F6 · text2 #A1A3AB · text3 #82858F · onBrand #FFFFFF
glassFill rgba(22,23,27,.58) · glassBorder rgba(255,255,255,.10) · glassFallback #16171B
```

### Açık tema

```
bg #FFFFFF · surface #F5F5F7 · surface2 #EFEFF2 · surface3 #E6E6EA · surface4 #D8D9DE
border rgba(0,0,0,.08) · borderStrong rgba(0,0,0,.14)
brand #D81E25 · brandText #C0161D
text1 #0A0B0D · text2 #5C5F66 · text3 #64676D · onBrand #FFFFFF
glassFill rgba(255,255,255,.62) · glassBorder rgba(0,0,0,.08) · glassFallback #F7F7F9
```

**Renk kuralı:** ekran başına **en çok 3 marka-kırmızı öğe** — bir birincil
eylem, bir aktif durum, bir sayaç. Fazlası kırmızıyı anlamsızlaştırıyor.

### Tipografi — altı kademe, yedincisi yok

```
screenTitle   34 / 700 / -0.75
sectionTitle  22 / 650 / -0.22
cardTitle     17 / 600 / 0
body          15 / 400 / 0
secondary     13 / 500 / 0
label         11 / 600 / +0.66  BÜYÜK HARF (yalnız etikette, asla cümlede)
```

Aile: sistem yazı tipi (SF Pro / -apple-system). Sayılarda tabular figür.

### Boşluk, yarıçap, ölçü

```
boşluk ölçeği: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48   (6, 10, 14 gibi ara değer YASAK)
ekran dolgusu 20 · kart dolgusu 16 · liste alt güvenli boşluğu 104
yarıçap: sm 12 · md 16 · lg 20 · pill 999
dokunma hedefi min 44 · sekme çubuğu 64 (yüzen, kenar 20, alt 24)
avatar: sm 30 · md 32 · giriş yüksekliği 44
kapak oranı 3:4 · video oranı 16:9
```

### Gölge / bulanıklık / iskelet

```
kart:    siyah, opaklık .35, yarıçap 20, offsetY 8
yüzen:   siyah, opaklık .55, yarıçap 40, offsetY 16
cam:     blur yoğunluk 32, doygunluk 1.8 — Android'de düz glassFallback dolgu,
         GEOMETRİ ASLA DEĞİŞMEZ
iskelet: #1F2126 → #2A2C33 → #1F2126, süpürme 320px, 1400ms, doğrusal, döngü
```

---

## Uygulanabilirlik kısıtları — bunlara uymayan maket kodlanamaz

1. **İkonlar Ionicons** (`@expo/vector-icons`). Her ikonun adını yaz:
   `person-add-outline`, `shield-checkmark`, `chatbubble-outline`,
   `grid-outline`… Başka ikon seti kullanma.
2. **Beş dil parite**: tr · en · es · pt · de. Almanca etiketler en uzun; her
   etiket alanı **+%40 metin uzamasına** dayanmalı. Metni kısaltarak değil,
   düzeni esneterek çöz. Sekme etiketleri tek satıra sığmalı.
3. **Erişilebilirlik**: küçük metin kontrastı ≥ 4.5:1, dokunma hedefi ≥ 44pt.
   Yeni bir renk–yüzey birleşimi kullanıyorsan oranı hesapla ve yaz.
4. **Listeler FlashList**: profil sekmeleri arasında geçiş *aynı listenin
   verisini* değiştiriyor, dört ayrı kaydırma alanı değil. Yatay kaydırmalı
   sekme geçişi (pager) önerme.
5. **Sticky/parallax başlık** iOS'ta pahalı. Profil başlığı kaydırmayla
   kayboluyorsa neyin sabit kaldığını açıkça yaz.
6. **Bulanıklık yalnız cam jetonu olan yerlerde** (sekme çubuğu, sayfa üstü
   sönümleme). Rastgele backdrop-filter kullanma.
7. Her ekran için **dört durum** çiz: dolu · boş · iskelet (yükleniyor) ·
   oturum yok. Profil için ayrıca **gizli** durum.
8. Sheet'ler alttan geliyor, üstlerinde 36×5 tutamaç var.

---

## Karar vermeni istediğim şeyler (gerekçesiyle)

1. Profil sekmeleri **ikon mu, metin mi, ikon + sayı mı**? Dört sekmenin
   Almanca etiketi çubuğa sığıyor mu?
2. Arkadaş sayacına dokununca açılan liste: **tam ekran mı, alttan sheet mi**?
3. Gelen istek rozetinin yeri.
4. Kullanıcı arama nereye oturuyor.
5. Oyun sayfasında inceleme yoksa: **davet mi, hiç yok mu**?
6. Ayarlar listesi bölüm başlığı alacak mı?
7. "Bu hafta" grafiği profilin neresinde kalıyor?
8. Gizli profil için yeni gizlilik anahtarı gerekiyor mu, adı ne?

---

## Çıktı formatı — kesin

Tek HTML artifact, şu sırayla:

1. **Bilgi mimarisi: önce / sonra** — iki sütun, ok işaretleriyle taşınan
   hedefler. Kalkan her öğe açıkça işaretli.
2. **Ekran maketleri**, 390×844 çerçevelerde, koyu tema. Sıra:
   - Kendi profilim (dört sekmenin dördü de ayrı çerçeve)
   - Başkasının profili (arkadaşlık durum makinesinin dört durumu)
   - Gizli profil
   - Arkadaş listesi + gelen istekler
   - Topluluk akışı
   - Konu görünümü — normal gönderi
   - Konu görünümü — **inceleme kökü + yanıtlar**
   - Oyun sayfasının inceleme bölümü (dolu ve boş)
   - Ayarlar (tam liste)
   - Boş / iskelet / oturumsuz durumlar
3. **Açık tema**: en az profil ve topluluk akışı açık temada da çizilecek.
4. Her ekranın altında **ölçü kutusu** (yükseklik, dolgu, yarıçap,
   punto/ağırlık, jeton adı, ikon adı) ve **gerekçe notu**.
5. Sonda **değişiklik tablosu**: kalkan öğe · nereye taşındı · sebep.
6. Sonda **kontrol listesi**: ekran başına marka-kırmızı sayısı, ölçek dışı
   boşluk kullanımı (olmamalı), 44pt altı dokunma hedefi (olmamalı).

Dış görsel/CDN kullanma; kapak yer tutucuları `surface4` dolgu + oyun adının
baş harfi olsun. Sahte kullanıcı adları ve oyun adları gerçekçi olsun (Steam
kataloğundan tanıdık isimler).
