# Handoff: Gamerisen — Profil & Topluluk revizyonu

## Overview
Gamerisen'in profil bölümü bugün bir **menü** (10 karolu kısayol ızgarası + iki sayaç kartı). Bu revizyon profili **kimlik + kullanıcının ürettiği içerik** sayfasına çeviriyor, eksik olan **başkasının profili** ekranını ekliyor, `/social` üç sekmeli ekranını dağıtıyor, topluluk sekmesini tek akış + konu (thread) görünümüne indiriyor, kullanıcı incelemelerini oyun sayfasına getiriyor ve profilden kalkan hedefleri ayarlara taşıyor.

Kapsam: 22 ekran maketi (koyu tema + profil/akış açık temada), her grup için ölçü kutusu ve gerekçe, önce/sonra bilgi mimarisi, 8 tasarım kararı, değişiklik tablosu, kural denetim listesi.

## About the Design Files
Bu paketteki HTML dosyası bir **tasarım referansıdır** — hedeflenen görünümü ve davranışı gösteren bir prototip, doğrudan kopyalanacak üretim kodu değil. Görev, maketleri **hedef kod tabanının mevcut ortamında yeniden kurmak**: uygulama **React Native (Expo SDK 57, expo-router)**, iOS öncelikli, koyu tema varsayılan. Layout HTML/CSS ile çizildi; React Native'de `View`/`Text`/`FlashList` + `StyleSheet` karşılıklarıyla kurulacak. Web'e ait hiçbir şey (CSS class, `backdrop-filter`, `grid`) doğrudan taşınmıyor:

| Maketteki web tekniği | React Native karşılığı |
| --- | --- |
| `backdrop-filter: blur(32px) saturate(1.8)` | `expo-blur` `<BlurView intensity={32}>`; Android'de düz `glassFallback` dolgu — **geometri değişmez** |
| `display:grid; repeat(3,114px); gap:4` | `FlashList numColumns={3}` veya `flexWrap` + hesaplanmış genişlik (aşağıda formül) |
| `box-shadow` | iOS `shadowColor/shadowOpacity/shadowRadius/shadowOffset`, Android `elevation` |
| `overflow:hidden` ile kırpma | Maketteki kırpma yalnız **104pt alt güvenli boşluğu** göstermek için; kodda `contentContainerStyle={{ paddingBottom: 104 }}` |
| Glif yer tutucular (⚙ ♡ ✓ ▤ …) | `@expo/vector-icons/Ionicons` — gerçek ikon adları aşağıdaki tabloda |
| `font-variant-numeric: tabular-nums` | `fontVariant: ['tabular-nums']` |

Maketi tarayıcıda açmak için `Profil Revizyonu.dc.html` ve `support.js` aynı klasörde olmalı.

## Fidelity
**High-fidelity.** Renkler, punto/ağırlık/harf aralığı, dolgu, yarıçap, yükseklik ve dokunma hedefleri kesinleşmiş durumda; ölçüsü yazılmayan öğe yok. Piksel hedefi 390×844 (iPhone 14/15 mantıksal boyutu). Tek belirsizlik: ikonların glif yer tutucu olarak çizilmiş olması — gerçek Ionicons adları bu README'de ve maketin ölçü kutularında yazılı.

## Design Tokens

### Koyu tema (varsayılan)
```
bg          #0A0B0D      surface     #101114      surface2    #15161A
surface3    #1C1E23      surface4    #2A2C33
border      rgba(255,255,255,.07)    borderStrong rgba(255,255,255,.12)
brand       #E8242B      brandText   #FF6B6F
brandWash   rgba(232,36,43,.08)      brandWashBorder rgba(232,36,43,.28)
text1       #F4F4F6      text2       #A1A3AB      text3       #82858F
onBrand     #FFFFFF
glassFill   rgba(22,23,27,.58)       glassBorder rgba(255,255,255,.10)
glassFallback #16171B
success     #3FB950   ← YENİ (aşağıda gerekçe)
```

### Açık tema
```
bg #FFFFFF · surface #F5F5F7 · surface2 #EFEFF2 · surface3 #E6E6EA · surface4 #D8D9DE
border rgba(0,0,0,.08) · borderStrong rgba(0,0,0,.14)
brand #D81E25 · brandText #C0161D
text1 #0A0B0D · text2 #5C5F66 · text3 #64676D · onBrand #FFFFFF
glassFill rgba(255,255,255,.62) · glassBorder rgba(0,0,0,.08) · glassFallback #F7F7F9
success #2E9E45   ← YENİ (açık varyant)
```

### Yeni jetonlar ve gerekçesi
- **`success` #3FB950 / açık #2E9E45** — jeton listesinde bağlantı ve doğrulama durumu için renk yoktu; "Steam bağlı" noktası ve "doğrulanmış saat" rozeti brand kırmızısını kullanamaz (ekran başına 3 kırmızı kuralı ve anlam çakışması). Brand ile aynı doygunlukta, yeşil hue. Kontrast: #3FB950 / surface2 = 5.9:1; açık temada #2E9E45 / #FFFFFF = 3.9:1 (6pt nokta grafik öğe; yanındaki etiket text2 ile 5.6:1).
- **`avatar.xl` 88** — mevcut avatar ölçeği 30/32 ile sınırlı, profil kimlik bloğu için yetersiz.
- **`privateProfile`** (boolean ayar) — mevcut `shareActivity` / `discoverable` / `showPresence` içerik kilitlemiyor.

### Tipografi — altı kademe, yedincisi yok
```
screenTitle   34 / 700 / -0.75
sectionTitle  22 / 650 / -0.22
cardTitle     17 / 600 / 0
body          15 / 400 / 0
secondary     13 / 500 / 0
label         11 / 600 / +0.66  BÜYÜK HARF (yalnız etiket, asla cümle)
```
Aile: sistem (SF Pro / San Francisco). Sayılarda tabular figür. Gövde satır aralığı 1.45; bio 1.4; konu kökü 1.35.

### Boşluk, yarıçap, ölçü
```
boşluk ölçeği: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48   (6, 10, 14 YOK)
ekran dolgusu 20 · kart dolgusu 16 · liste alt güvenli boşluğu 104
yarıçap: sm 12 · md 16 · lg 20 · pill 999
dokunma hedefi min 44 · sekme çubuğu 64 (yüzen, kenar 20, alt 24)
avatar: sm 30 · md 32 · lg 40 · list 44 · xl 88 · giriş yüksekliği 44
kapak oranı 3:4 · video 16:9
```

### Gölge / bulanıklık / iskelet
```
kart:    #000 opaklık .35, yarıçap 20, offsetY 8   (yalnız konu görünümünün inceleme kökünde)
yüzen:   #000 opaklık .55, yarıçap 40, offsetY 16  (sekme çubuğu)
cam:     blur 32, doygunluk 1.8 — Android'de düz glassFallback; GEOMETRİ DEĞİŞMEZ
iskelet: #1F2126 → #2A2C33 → #1F2126, süpürme 320px, 1400ms, doğrusal, döngü
```

### Renk kuralı
Ekran başına **en çok 3 marka-kırmızı öğe**: bir birincil eylem, bir aktif durum, bir sayaç. Ölçüm için README sonundaki denetim tablosuna bakın.

## Bilgi mimarisi — önce / sonra

| Önce | Sonra |
| --- | --- |
| Kimlik satırı: avatar 56 + ad + `@kullanıcı · 214 oyun` | Kimlik bloğu: avatar 88 + ad + **bio (yeni alan)** + Steam/Xbox çipi |
| 2 sayaç kartı 169×80 (arkadaş · istek listesi) | **3 dokunulabilir sayaç**: gönderi · arkadaş · oyun |
| "Bu hafta" 7 çubuklu grafik kartı | h64 tek satır, yalnız kendi profilimde |
| **10 karolu kısayol ızgarası** | → Ayarlar → "Oyun verim" grubu (6 hedef) + 4 hedef içerik sekmesine dönüştü |
| Bağlı hesaplar listesi | Kimlik çipi (durum) + Ayarlar → Hesap (yönetim) |
| `/social`: akış / arkadaşlar / istekler | Arkadaş listesi (profil sayacından, tam ekran) + topluluk akışı |
| Topluluk: 3 sekme (tartışma / topluluk / benimkiler) | 2 sekme (Keşfet / Arkadaşlar); "benimkiler" → profil sekmeleri |
| Steam arkadaşları ekranı | → Ayarlar → Oyun verim |
| Oyun sayfası: yalnız Steam toplu yüzdesi | Steam yüzdesi **kalıyor** + altında kullanıcı incelemeleri bölümü |
| Başkasının profili **yok** | Yeni ekran + arkadaşlık durum makinesi |

## Sekiz karar (uygulanırken tartışmaya kapalı)

1. **Profil sekmeleri yalnız ikon**, altında 11/600 uppercase bağlam satırı ("KOLEKSİYON · 214"). Dört Almanca etiket (Sammlung · Wunschliste · Bewertungen · Beiträge) 87pt sütuna sığmıyor; sayı bilgisi bağlam satırında yaşıyor.
2. **Arkadaş listesi tam ekran (push)**, sheet değil — uzun liste + arama + istek bandı sheet içinde kaydırma çakışması yaratır; push, kişi profiline gidip dönme yığınını doğal kılar.
3. **Gelen istek rozeti**: sayılı kırmızı rozet yalnız arkadaş listesinin üstündeki istek bandında; sekme çubuğunun Profil ikonunda sayısız 6pt nokta. Profil sayaçlarında rozet yok (iki rakam yarışmasın). Kural: sayılı kırmızı yalnız eyleme dönüşen bilgi için.
4. **Kullanıcı arama tek kutu**, arkadaş listesinin üstünde. Topluluk akışında arama kutusu yok; keşif işini "Keşfet" akış sekmesi yapıyor.
5. **Oyunun incelemesi yoksa**: oyun kullanıcının kütüphanesindeyse ve saat > 0 ise **davet bloğu**, değilse **bölüm hiç render edilmiyor**. "0 inceleme" metni hiçbir durumda yazılmıyor.
6. **Ayarlar bölüm başlığı alıyor** — dört başlık: Hesap · Oyun verim · Gizlilik · Uygulama. Liste 9 satırdan 19'a çıktığı için yalnız boşlukla gruplama taranamaz; başlıklar kategori değil "ne bulacağın" adı.
7. **"Bu hafta" grafiği** eylem satırı ile sekme şeridi arasında, h64 tek satır, yalnız kendi profilimde.
8. **`privateProfile`** yeni gizlilik anahtarı; Ayarlar → Gizlilik grubunun ilk satırı, `discoverable`'ın üstünde.

## Screens / Views

Ortak kabuk (tüm sekme ekranları): ekran genişliği 390, dolgu 20. Yüzen sekme çubuğu **beş sekme, değişmiyor** — Ana sayfa · Topluluk · Videolar · Mesajlar · Profil; h64, kenardan 20, alttan 24 inset, `glassFill` + `glassBorder` 1px, yarıçap pill, yüzen gölge. Etiket yok, yalnız ikon 22; aktif ikon `brand`, pasif `text3`. Liste/kaydırma alanlarının hepsinde `paddingBottom: 104`.

### 1. Profil — kendi profilim (`(tabs)/profile.jsx` yerine geçiyor)
**Amaç:** kimliğini görmek, ürettiği içeriğe erişmek, düzenlemek.

Dikey sıra ve ölçüler:
1. **Üst çubuk** h44 · solda `@kullanıcı` 17/600 text1 · sağda ⚙ 44×44 dokunma hedefi. Kaydırmada bu çubuk **52pt daraltılmış** hâline geçiyor (avatar 32 + `@kullanıcı` + ⚙, alt kenar `border`) ve sekme şeridiyle birlikte **sabit kalan tek iki öğe**. Kimlik bloğu kayıp gidiyor — parallax/sticky-header efekti yok (iOS'ta pahalı).
2. **Kimlik bloğu** dolgu 20/8 üst · avatar **88** pill, `surface4` dolgu + `borderStrong` 1px, boş hâlde baş harf 34/700 text3 · avatar–sayaç arası 20.
3. **Üç sayaç** satırı h44, eşit genişlik: sayı 17/600 text1 tabular, etiket 13/500 text2, aralarında 2. Hedefler: gönderi → 4. sekme, arkadaş → arkadaş listesi, oyun → Ayarlar → Kütüphane.
4. **Ad** 17/600 · **bio** 15/400 text2, satır aralığı 1.4, **maks 2 satır** (`numberOfLines={2}`) · aralarında 8. Bio **yeni alan** (profil düzenleme formuna eklenecek, 150 karakter sınırı öneriliyor).
5. **Bağlı çipleri** h28, dolgu 12, pill, `surface2` + `border`; 6pt `success` nokta + 13/500 text2 metin. Bağlı değilse nokta `text3`, metin "Steam bağla" ve çip dokunulabilir → Ayarlar → Bağlı hesaplar.
6. **Eylem satırı** üst 16 · "✎ Profili düzenle" `flex:1` h44 r12 `surface3` 15/600 text1 · "↗" 44×44 r12 `surface3`. Birincil eylem bilinçli olarak **kırmızı değil** (kırmızı kotası aktif duruma ayrıldı).
7. **"Bu hafta" satırı** üst 16 · h64, `surface` + `border`, r16, dolgu 16 · 7 çubuk genişlik 8, maks yükseklik 32, gap 4, r4, dolgu `surface4` · sağda "12sa 40dk" 15/600 tabular + "bu hafta · yalnız sende görünür" 13/500 text3 · en sağda › . Yalnız kendi profilimde.
8. **Sekme şeridi** üst 20 · h48, üst kenar `border` · 4 sütun (97.5 her biri, dokunma hedefi 97.5×48) · aktif ikon text1 + **2pt brand alt çizgi**, pasif text3 · ikon 20.
9. **Bağlam satırı** dolgu 20/12-8 · solda aktif sekme adı + sayı 11/600 uppercase text3 · sağda sıralama/filtre 13/500 text2 ("Son eklenen ⌄", "İndirimde 4 ⌄").
10. **İçerik** (aşağıdaki dört sekme).

**Kapak ızgarası formülü:** `(390 − 2×20 − 2×4) / 3 = 114` genişlik, 3:4 → **114×152**, gap 4, r12, dolgu `surface4`; sol üstte baş harf 22/700 text3, sol altta oyun adı 11/600 text1 (maks 2 satır), dolgu 8. İndirim rozeti sağ üst: h20, dolgu 8, pill, `brand` dolgu, 11/600 `onBrand`.

**Sekme 1 — Koleksiyon:** 3 sütun kapak ızgarası.
**Sekme 2 — İstek listesi:** aynı ızgara + indirim rozetleri.
**Sekme 3 — İncelemeler:** liste satırı dolgu 16/20, alt kenar `border` · kapak **66×88** r12 · sağda oyun adı 15/600 · doğrulanmış rozet h24 dolgu 8 pill, `rgba(63,185,80,.10)` dolgu + `rgba(63,185,80,.28)` kenar, ✓ 11 + "312 SA" 11/600 tabular `success` · başparmak "△ Öneriyorum" 13/500 text2 · metin 13/400 text2 maks 3 satır · altta "↩ 14 yanıt" ve "✎ Düzenle" 13/500 text3, gap 16.
**Sekme 4 — Gönderiler:** akış satırıyla aynı kalıp (aşağıya bakın), avatar 40.

**Boş durumlar (sekme başına ayrı):** daire 64 `surface2` + `border`, ikon 24 text3 · başlık 17/600 · metin 15/400 text2 maks genişlik 280, ortalı · üst boşluk 48. Kendi profilimde **buton var** (h44, dolgu 20, r12, `brand`) ve metin gerçek veriye dayanıyor: "Elden Ring'de 312 saatin var. Saat Steam'den okunuyor, incelemen doğrulanmış görünür." + "✎ İlk incelemeni yaz". Başkasının profilinde **buton yok**, metin yalnız bilgi verir: "Nil henüz inceleme yazmadı / Yazdığında burada görünecek."

### 2. Profil — başkasının profili (yeni ekran)
Aynı iskelet; farklar: ⚙ yerine ⋯ (44×44), solda ‹ geri; "Bu hafta" satırı **yok**; "Profili düzenle" **yok**; bio'nun yanında ikinci çip "8 ortak arkadaş" (`surface2`, metin text3).

**Arkadaşlık durum makinesi** — buton hep h44 r12 15/600:

| Durum | Birincil buton | İkincil | Geçiş |
| --- | --- | --- | --- |
| 1 · arkadaş değil | `brand` dolgu, `onBrand` metin, `person-add-outline` — "Arkadaş ekle" | "✉ Mesaj" `surface3` | dokunuş → durum 2 (iyimser güncelleme) |
| 2 · istek gönderildi | `surface3` dolgu + `borderStrong` 1px, metin **text2**, `time-outline` — "İstek gönderildi" | "✉ Mesaj" `surface3` | dokunuş → "İsteği geri al" onay sheet'i → durum 1 |
| 3 · arkadaşsınız | `surface2` dolgu + `border`, metin text1, `checkmark-circle` **`success`** — "Arkadaşsınız" | "✉ Mesaj" `surface3` | çıkarma yalnız ⋯ menüsünde |
| 4 · sana istek gönderdi | "✓ Kabul et" `brand`, `flex:1` | "✕ Reddet" `surface3`, `flex:1` | kabul → durum 3, reddet → durum 1 |

Durum 4'te üst blokta meta satırı "Sana arkadaşlık isteği gönderdi · 2sa" 13/500 text3.

**⋯ menüsü (alttan sheet):** arka plan `bg` %55 opaklık örtü · sheet `surface2`, üst köşeler r20, üst kenar `border` · tutamaç **36×5** pill `surface4`, üstten 12, altından 12 · başlık (kişi adı) 17/600, dolgu 20, alt 12 · satırlar h56, dolgu 20, üst kenar `border`, ikon 20 (24pt sütun) + etiket 15/500 · alt güvenli 34.
Satırlar: Mesaj (`chatbubble-ellipses-outline`, text1) · Arkadaşlıktan çıkar (`person-remove-outline`, text1) · **Engelle** (`ban-outline`, `brandText`) · **Şikayet et** (`flag-outline`, `brandText`). Engelle/Şikayet **aynı sheet'te, kaydırma gerekmeden görünür** — App Store Guideline 1.2 şartı; ayrıca Ayarlar → Gizlilik → Engellenenler.

### 3. Profil — gizli görünüm (`privateProfile === true`, ziyaretçi arkadaş değil)
Kimlik bloğu + üç sayaç + eylem satırı **görünür** (`discoverable` kapalı değil: profil bulunabilir, içeriği kapalı). Bio yerine "Gizli profil" çipi (kilit ikonu + metin). Sekme şeridi **%40 opaklıkla görünür ama dokunulamaz** — yapının ne olduğunu öğretiyor, yalan söylemiyor. Ortada: daire 64 `surface2`, `lock-closed-outline` 26 text3 · "Bu profil gizli" 17/600 · "Mert'in koleksiyonunu, incelemelerini ve gönderilerini yalnız arkadaşları görebiliyor." 15/400 text2, maks 280.

### 4. Arkadaş listesi (yeni ekran, push)
Üst çubuk h44: ‹ + "Arkadaşlar · 126" 17/600.
**Arama** üst 12: h44 r12 `surface2` + `border`, dolgu 12, `search-outline` 17 text3 + placeholder 15/400 text3 "Kullanıcı ara". Uygulamadaki **tek** kullanıcı arama kutusu.
**Gelen istek bandı** üst 16: r16, `brandWash` dolgu + `brandWashBorder` kenar, dolgu 16 · yığılmış avatar 32, örtüşme −10, her biri 2pt `bg` kenar · "Gelen istekler" 15/600 + "Ecem, Kaan ve 1 kişi daha" 13/500 text2 · rozet h24, min genişlik 24, dolgu 8, pill, `brand`, 13/600 `onBrand` tabular · › text3. Kaydırınca yukarı gidiyor (sabit değil).
**Liste** başlığı "Tümü · 126" 11/600 uppercase, üst 20 · satır h64, dolgu 20, avatar 44 pill, ad 15/600, alt satır 13/500 text3 (`@kullanıcı · 8 ortak arkadaş` / `şu an Helldivers 2` / `gizli profil`), sağda ✉ 44×44 text3. Ayırıcı yok (h64 ritmi yeterli).
**Gelen istekler ekranı:** satır dolgu 16/20 + alt kenar `border` · üstte avatar 44 + ad/meta, altında iki buton h44 r12 `flex:1` — "Kabul et" `brand`, "Reddet" `surface3`. Altında "Gönderilen · 2" bölümü (rozet yok — kullanıcıda eylem yok).

### 5. Topluluk akışı (X mantığı)
Üst: başlık "Topluluk" 22/650 + ✎ (kompozitör kısayolu) 44×44. **Akış sekmeleri** h44, dolgu 20, gap 24: "Keşfet" / "Arkadaşlar" 15/600 aktif text1 + 2pt brand alt çizgi, pasif 15/500 text3. (Almanca "Entdecken / Freunde" sığıyor → burada metin etiketi kullanılıyor, çünkü iki tane var.)
**Kompozitör satırı** (kalıcı, akışın ilk satırı — sticky değil): dolgu 16/20, avatar 40, "Ne düşünüyorsun?" 15/400 text3, sağda "Gönder" h32 dolgu 12 pill `surface3` 13/600 (metin yazılınca `brand` oluyor).
**"İnceleme yazabilirsin" şeridi**: dolgu 12/20, etiket 11/600 uppercase text3, yatay kart 80 geniş — kapak **80×60** r12 `surface4` + ad 11/600 text2, gap 8. Kaldı ama akış sekmelerinin altına indi; sayfanın boş görünmemesini sağlayan öğe.
**Gönderi satırı (kart değil):** dolgu 16/20, alt ayırıcı 1px `border`, **gölge yok** · avatar 40 solda · `Ad` 15/600 + `@kullanıcı · 2sa` 13/500 text3 (gap 6, baseline) · metin 15/400 text1 satır aralığı 1.45 · isteğe bağlı oyun çipi h28 dolgu 12 pill `surface2` + `border`, 16×16 kapak minyatürü r4 + ad 13/500 text2 · eylem sırası gap 24, 13/500 text3: ↩ sayı · ♡ sayı · ↗.

### 6. Konu (thread) görünümü
Üst çubuk h44 ‹ + "Konu" 17/600 + alt kenar `border`.
**Kök gönderi:** dolgu 20 · avatar 44 + ad 15/600 + `@kullanıcı · 2sa` 13/500 text3 + ⋯ · metin **22/400 satır aralığı 1.35** (hiyerarşi puntoyla kuruluyor, kalınlıkla değil) · oyun çipi · eylem sırası 13/500 gap 24 · alt kenar `border`.
**Yanıtlar:** dolgu 16/20, avatar 40, avatarın altından çıkan **1px dikey `border` çizgisi** (avatar sütununda, `flex:1`) · ad + meta + metin 15/400 · eylem 13/500 gap 24. **İkinci seviye** yanıt sol dolgu 20 → **52** (avatar 40 + 12 gap hizası). Üçüncü seviye yok — daha derin yanıtlar 52'de kalır.
**Yanıt kutusu (alt sabit):** h76 (44 giriş + 20 alt güvenli + 12), `glassFill` + üst `glassBorder`, dolgu 20 · avatar 32 + h44 pill `surface2` + `border` giriş "Yanıt yaz".
**İnceleme kökü varyantı:** üstte bağlam satırı ↩ + "Selin, Deniz'in incelemesine yanıt verdi" 13/500 text3, dolgu 12/20 · altında **inceleme kartı**: `surface` dolgu, `border`, r20, dolgu 16, **kart gölgesi var** (#000 .35, r20, offsetY 8) — kök öğe akış satırından farklı bir nesne olduğunu söylemek zorunda · kapak 66×88 r12 · oyun adı 17/600 · yazar avatarı 32 + ad 13/500 text2 · doğrulanmış rozet h24 `success` + "312 SA" · "△ Öneriyorum" 13/500 · metin 15/400 · eylem sırası. Yanıt kutusu placeholder'ı "İncelemeye yanıt yaz".
**Kural:** bir incelemeye yazılan yanıt **oyun sayfasında görünmüyor**, yalnız burada.

### 7. Oyun sayfası — inceleme bölümü
Steam'in **toplu yüzdesi kalıyor** ve kullanıcı incelemelerinin üstünde: çip h28 dolgu 12 pill, `success` wash dolgu + kenar, 13/600 `success` — "Steam: %93 olumlu". Kapak 100×133 (3:4) r12, oyun adı 22/650, künye 13/500 text3.
**Bölüm başlığı** 17/600 "İncelemeler" + sağda "✎ İncelemeni düzenle" h32 dolgu 12 pill `surface3` 13/600 (yalnız kullanıcının incelemesi varsa; o inceleme listenin **en üstünde**).
**İnceleme satırı** dolgu 16/20, üst kenar `border` · avatar 32 · ad 15/600 + doğrulanmış rozet h24 `success` (`shield-checkmark`) + başparmak (`thumbs-up-outline` / `thumbs-down-outline`) 13/500 text2 · metin 15/400 maks 3 satır · altta "↩ 14 yanıt · konuyu aç" 13/500 text3 → topluluk konusunu açıyor. **Yanıt metni burada yok.**
**Maks 3 inceleme** + "12 incelemenin tümünü gör" h44 r12 `surface3` 15/600.
**İnceleme yok (karar 5):** oyun kütüphanedeyse ve saat > 0 ise davet bloğu — r16, `brandWash` + `brandWashBorder`, dolgu 16 · doğrulanmış saat rozeti + "senin oynama süren" · "Bu oyunu oynadın. İlk incelemeyi sen yaz." 17/600 · "Saatin Steam'den okunuyor, doğrulanmış olarak görünür." 13/400 text2 · "✎ İnceleme yaz" h44 r12 `brand`. **Aksi hâlde bölüm hiç render edilmiyor** — sayfa Steam yüzdesinden doğrudan "Benzer oyunlar"a geçiyor.

### 8. Ayarlar (tam liste, karar 6)
Üst çubuk h44 ‹ + "Ayarlar" 17/600. Grup başlığı 11/600 uppercase text3, dolgu 20/20-8. Grup kartı yatay kenar 20, `surface` + `border`, r16, taşma kırpılmış. Satır min-h **52**, dolgu 12/16, satır arası üst kenar `border`; ikon sütunu 24 (ikon 18 text2), etiket 15/500 text1, açıklama 13/400 text3 (satır aralığı 1.4), sağ değer/chevron 13/500 text3. Alt güvenli 104.

| Grup | Satırlar (sırayla) | Ionicons |
| --- | --- | --- |
| **Hesap** | Profili düzenle · Bağlı hesaplar (2 bağlı) · E-posta ve şifre | `person-circle-outline` · `link-outline` · `mail-outline` |
| **Oyun verim** | Kütüphane (214 oyun) · Listeler (4) · Oyun kartları · İstatistik · Keşfet · Steam arkadaşları (18) | `grid-outline` · `list-outline` · `card-outline` · `stats-chart-outline` · `search-outline` · `people-outline` |
| **Gizlilik** | **Gizli profil** (yeni) · Profilim bulunabilir · Etkinliğimi paylaş · Çevrimiçi durumumu göster · Engellenenler (3) | `lock-closed-outline` · `eye-outline` · `share-social-outline` · `radio-button-on-outline` · `ban-outline` |
| **Uygulama** | Görünüm (Koyu) · Dil (Türkçe) · Bildirimler · Yardım ve şikayet · Çıkış yap | `contrast-outline` · `language-outline` · `notifications-outline` · `flag-outline` · `log-out-outline` |

Anahtar satırlarında sağ değer yerine `Switch`. `privateProfile` açıklaması: "Koleksiyon, incelemeler ve gönderilerini yalnız arkadaşların görür."

### 9. Yükleniyor / oturum yok
**İskelet:** bloklar `#1F2126 → #2A2C33 → #1F2126` doğrusal gradyan, süpürme 320px, **1400ms doğrusal döngü**. Blok yarıçapı gerçek öğeyle aynı (kapak 12, buton 12, kart 16, avatar pill). Sekme ikonları `surface4` renginde duruyor → yükleme sonrası düzen zıplamıyor. İlk ekranda 9 kapak bloğu.
**Oturum yok:** sekme çubuğu görünür kalıyor (uygulama gezilebilir) · daire 88 `surface2`, `person-outline` 34 text3 · "Kendi profilini kur" 22/650 · "Steam'ini bağla; koleksiyonun ve oynama saatlerin otomatik gelsin, doğrulanmış inceleme yazabilesin." 15/400 text2 maks 300 · "Giriş yap" h44 r12 `brand` · "Hesap oluştur" h44 r12 `surface3` · "Girmeden gezinmeye devam et" 13/500 text3 metin bağlantısı (üç eşit buton yerine hiyerarşi).
**Ağ hatası ayrı bir boş durum değil:** liste başlığında "Bağlantı yok — son yüklenen gösteriliyor" bandı (`surface2`, 13/500 text2) + eylemler pasif. Boş sonuç ya da silinmiş içerik gibi göstermiyoruz.

## Interactions & Behavior
- **Sekme geçişi:** profil içerik sekmeleri **aynı FlashList'in `data`sını** değiştiriyor — dört ayrı kaydırma alanı ve yatay pager **yok**. Sekme değişince kaydırma konumu başa dönüyor; kimlik bloğu liste `ListHeaderComponent`'i olarak kalıyor.
- **Sabit kalanlar:** 52pt daraltılmış üst çubuk + 48pt sekme şeridi. Kimlik bloğu kaydırmayla kayboluyor; parallax/blur büyütme efekti yok.
- **Sayaç dokunuşları:** gönderi → 4. sekme (aynı ekranda), arkadaş → arkadaş listesi (push), oyun → Ayarlar → Kütüphane (push).
- **Arkadaşlık:** iyimser güncelleme; hata dönerse buton eski duruma geri alınıyor + toast. Model **karşılıklı** (istek → kabul). "Takip et / Takipçi / Takip edilen" sözlüğü kullanılmıyor.
- **⋯ / onay sheet'leri:** alttan gelir, tutamaç 36×5. Yıkıcı eylemler (engelle, arkadaşlıktan çıkar, şikayet) ikinci bir onay sheet'i ister.
- **İnceleme yanıtı:** oyun sayfasındaki "↩ n yanıt · konuyu aç" → topluluk konusu (inceleme kökü). Yanıt gönderme yalnız konu ekranında.
- **Bulanıklık yalnız cam jetonu olan yerlerde:** sekme çubuğu ve konu ekranının yanıt kutusu. Başka hiçbir yerde blur yok.
- **Sheet/geçiş süreleri:** ekran push'u platform varsayılanı; sheet 300ms `ease-out`; buton durum geçişi 150ms opaklık/dolgu.

## State Management
```
profile: { id, handle, displayName, bio, avatar, counts:{posts,friends,games},
           connections:{steam:bool, xbox:bool}, isSelf, privateProfile }
activeTab: 'collection' | 'wishlist' | 'reviews' | 'posts'
tabData:   FlashList data (aktif sekmeye göre) + loading | empty | error
friendship: 'none' | 'requested' | 'friends' | 'incoming'   (başkasının profili)
requests:  { incoming:[], outgoing:[], unreadCount }         (rozet kaynağı)
weekPlaytime: number[7]  (yalnız isSelf)
settings:  { privateProfile, discoverable, shareActivity, showPresence, theme, locale }
```
Veri: koleksiyon/istek listesi/oynama saati Steam bağlantısından; inceleme saati **yalnız** Steam'den okunuyor, kullanıcı yazamıyor ("doğrulanmış" kelimesinin tek dayanağı bu). `requests.unreadCount` iki yerde okunuyor: arkadaş listesi bandı (sayılı rozet) ve sekme çubuğu Profil ikonu (sayısız nokta).

## Assets
Dış görsel yok. Kapak yer tutucuları `surface4` dolgu + oyun adının baş harfi (üretimde Steam kapak görselleri). Tüm ikonlar `@expo/vector-icons/Ionicons`; makette monokrom glif yer tutucu (⚙ ♡ ✓ ▤ ⌕ ✚ ⋯ ↩ ↗ ‹ ›) ve CSS ile çizilmiş kilit — kodda gerçek Ionicons adları kullanılacak:

`settings-outline` · `create-outline` · `share-outline` · `grid-outline` · `heart-outline` · `shield-checkmark-outline` · `shield-checkmark` · `chatbubble-outline` · `chatbubble-ellipses-outline` · `chevron-back` · `chevron-forward` · `ellipsis-horizontal` · `person-add-outline` · `person-remove-outline` · `time-outline` · `checkmark-circle` · `close` · `ban-outline` · `flag-outline` · `search-outline` · `lock-closed-outline` · `thumbs-up-outline` · `thumbs-down-outline` · `arrow-undo-outline` · `mail-outline` · `home` · `chatbubbles-outline` · `play-circle-outline` · `person-outline`

## Files
- `Profil Revizyonu.dc.html` — 22 ekran maketi + ölçü kutuları + gerekçeler + değişiklik tablosu + denetim listesi. **Referans kaynağı; tarayıcıda açın.**
- `support.js` — maketin çalışma zamanı (yalnız HTML'i açabilmek için gerekli, üretime taşınmaz).
- `PROFILREVIZYONTASARIMPROMPT.md` — orijinal tasarım brifi (jeton listesi, kısıtlar, kararı istenen sorular).

## Denetim listesi (uygulanırken korunacak)

**Ekran başına marka-kırmızı öğe (limit 3)**

| # | Ekran | Öğeler |
| --- | --- | --- |
| 2 | Profil · kendi | aktif sekme çizgisi + sekme çubuğu aktif ikon |
| 2 | Profil · başkası (durum 1) | "Arkadaş ekle" + aktif sekme çizgisi |
| 1 | Profil · arkadaşsınız | yalnız aktif sekme çizgisi |
| 2 | Arkadaş listesi | istek rozeti + sekme çubuğu aktif ikon |
| 3 | Gelen istekler | görünür "Kabul et" butonları (tek eylem sınıfı) |
| 2 | Topluluk akışı | aktif akış sekmesi çizgisi + sekme çubuğu aktif ikon |
| 0 | Konu görünümü | — |
| 2 | Oyun · davet | davet butonu + brandWash blok kenarı |

**Kurallar**
- Ölçek dışı boşluk yok: tüm dolgu/gap/yükseklik 4·8·12·16·20·24·32·40·48. Tek negatif değer yığılmış avatarların −10 örtüşmesi (boşluk değil, üst üste binme).
- 44pt altı dokunma hedefi yok: sayaçlar h44, sekme sütunu 97.5×48, ⚙/⋯/‹ 44×44, liste satırı h64, kapak 114×152, satır içi ✉ 44×44. 28pt çipler ve 24pt rozetler dokunulabilir değil (bilgi öğesi).
- Kontrast: text2/bg 8.4:1 · text3/surface 5.4:1 · success/wash 5.9:1 · açık tema text3/#FFF 5.3:1.
- Beş dil parite (tr · en · es · pt · de, +%40 uzama): sekme etiketi yok (ikon) → taşma riski sıfır. Buton metinleri tek satır, ikon ayrı kutuda; sığmazsa punto 13/600'e düşer, **yükseklik 44 sabit kalır** — metin kısaltılmaz, düzen esner.
- Bulanıklık yalnız sekme çubuğu ve konu yanıt kutusunda.
- FlashList tek liste, pager yok; alt güvenli boşluk 104 her kaydırma alanında.
- Guideline 1.2: Engelle + Şikayet et, ⋯ sheet'inde kaydırmasız görünür; ayrıca Ayarlar → Gizlilik → Engellenenler.
