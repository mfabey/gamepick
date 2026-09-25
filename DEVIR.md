# Gamerisen — oturum devri

Bu belge, uzun bir oturumun sonunda **yeni bir sohbetin sıfırdan başlaması**
için yazıldı. Yalnızca koddan/git'ten okunamayacak şeyler burada.

---

## GÜNCEL — 25 Eylül 2026 (Windows oturumundan Mac'e devir)

**Önce bunu oku; aşağıdaki "Eski devir" bölümü tarihsel.**

### Durum
- Dal **`design-v2`**, `origin` ile eşit. Mobil 2.0 işi burada; site yalnız
  `main`'den yayınlanıyor ve bu işin hiçbiri `main`'e gitmedi.
- 25 Eylül'de: tasarım dışı 15 ekranın hepsi, kütüphane gövdesi, `EmptyState`
  ve `CollectionPicker` 2.0'a geçti. Ayrıntı ve gerekçeler:
  `docs/design-migration-progress.md` → "25 Eylül" kayıtları.
- **Hiçbiri cihazda görülmedi.** Kontrol listesi:
  `docs/cihaz-kontrol-2026-09-25.md` — Mac'te İLK İŞ bu.

### iOS'ta görmek
- **Expo Go KULLANILAMAZ:** proje Expo SDK 54, App Store'daki Expo Go SDK 57
  (iOS'ta eski Expo Go kurulamıyor).
- EAS **development build** alındı: `31e669b0-bb34-42b0-b929-d7676baad0d1`
  (commit `a2ea7bc`, dahili dağıtım). Kullanıcının iPhone'u EAS'e kayıtlı
  (Apple ekibi `KFH2UBR5AP`). Bu build **gerçek cihaz** içindir, simülatörde
  çalışmaz. Telefona kurulup kurulmadığı belirsiz kaldı.
- Cihazda: `cd mobile && npx expo start --dev-client` → QR / uygulamada URL.
- **Simülatörde** (Mac): yerel derleme — `docs/DURUM.md` → macOS bölümü
  (`npx expo prebuild -p ios`, `pod install`, `LANG=en_US.UTF-8`).
  Ekran görüntüsü: `xcrun simctl io <UDID> screenshot` (iki simülatör açıksa
  `booted` yanlış olana gider).

### Kullanıcının kuralları (Windows'taki Claude belleğindeydi, Mac'e taşınmaz)
- **Mobil çalışırken kökteki `app/` (web, Next.js) koduna dokunma.** Web'de
  sorun görülürse yalnız okuyarak teşhis et; düzeltme için önce sor. `main`'e
  başka biri de doğrudan commit atıyor.
- Her iş sonunda dur, onay bekle (`CLAUDE.md`). Kullanıcının kalıbı:
  "commit et pushla, sonra X'e geç" — push onayı her iş için ayrı.

### Sıradaki
1. Cihaz / simülatör kontrolü (yukarıdaki liste), bulunanları düzelt.
2. Kod tarafında kalan 2.0 işleri (sunucu gerektirmeyen), önerilen sıra:
   alt sayfalar (`ReportSheet`, `PersonMenu`, `ShareToFriendSheet`,
   `PublishSheet`, `ChoiceSheet` → DS 4 Bottom Sheet) · hata durumları
   (`CevrimdisiBant`, `LimitedMode`) · gönderi/inceleme ailesi
   (`GamePostCard`, `GameReviews`, `ReviewComposer`, `ProfileReviewRow`,
   `DevBadge` → Badge, `OwnershipBand` → StatusPill) · sohbet (`MessageMenu`,
   `GifPicker`) · G-02 Tanıtım (`AcilisPerdesi`, `IpucuSeridi`) · artıklar
   (`discover` başlığı, birkaç Ionicons, 2 sütunlu iskelet, `auth` /
   `delete-account` sabit Türkçe hata metinleri, ölü `FloatingTabBar.jsx` ve
   `StoreLogo.jsx` — `AGENTS.md` hâlâ FloatingTabBar'ı anlatıyor).
3. Sunucu gerektirenler: birleşik arama (G-05/06), fiyat geçmişi (G-08),
   bildirimler (G-20), oyun toplulukları (G-11).
4. Kullanıcı kararı bekleyenler: `docs/design-migration.md` §7 — özellikle
   12 (profil sekmeleri metin/ikon), 3 (G-02b), 4 (Google/Steam girişi),
   16 (2.8.0), 17 (sunucu sırası), 11 (web 2.0).

### Windows makinesi notu
Android SDK silinmiş (`ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk` yok);
`Gamerisen_API36` AVD tanımı duruyor. Android emülatörü için SDK yeniden
kurulmalı.

---

> ## ⚠ ESKİ DEVİR (Faz dönemi, `main`, sürüm 2.5.0) — TARİHSEL, UYGULANMAZ
> Aşağıdaki "push main" ve "production'a OTA" adımları o döneme aitti.
> `design-v2`'deyken UYGULAMA: yanlış dala gider / yayındaki kullanıcılara
> ulaşır. Bölüm 5 ("Çalışma biçimi") hâlâ geçerli.

## 1. Hemen yapılması gerekenler

### a) Push
```bash
git push origin main
```
Yazıldığı anda **1 commit** yerelde bekliyordu.

### b) Sunucu deploy'u doğrula — EN ÖNEMLİSİ
Birkaç düzeltme **sunucu tarafında** ve deploy edilmeden hiçbiri işe yaramaz.
Son kontrolde canlı API hâlâ eski kodu döndürüyordu.

```bash
curl -s "https://www.gamerisen.com/api/games?page=1&num=6&section=new" \
  | python3 -c "import json,sys; r=json.load(sys.stdin)['results']; print('gorselYok tasiyan:', sum('gorselYok' in g for g in r), '/', len(r))"
```
`0 / 6` → **eski kod yayında**. Vercel panelinden derlemeye bakılmalı.
Sıfırdan büyük → yeni kod yayında.

### c) OTA (yerli derleme GEREKMİYOR)
Ölçüldü: `mobile/package.json`'da yalnız `scripts` değişti, **bağımlılık
eklenmedi**; `app.json` hiç değişmedi. `expo-updates ~29.0.19` kurulu.

```bash
cd mobile && eas update --branch production --message "tasarım fazları + paylaşım + kapak düzeltmesi"
```

> **Dikkat:** `runtimeVersion` politikası `appVersion` ve sürüm **2.5.0**.
> Bu güncelleme yalnız 2.5.0 kurulumlarına ulaşır; daha eski sürümdeki
> kullanıcılar için mağaza derlemesi gerekir.

---

## 2. Doğrulanmamış kalan tek şey

**Kart → detay büyüme geçişi uçuş hâlinde gözle görülmedi.**

Mekanizmanın çalıştığı **günlükle kesin**: ölçülen çerçeve `143.56 × 191.41`
(tam 3:4, şerit kapağı), `basla → vardi → gezinme` sırası doğru, iki ayrı
kartta tekrarlandı. Ama aradaki kareler görülmedi — ekran görüntüsü ~700 ms
aralıklı, animasyon 380 ms. Yavaşlatıp denendi, şerit içeriği kareler
arasında kaydığı için dokunuşlar karta isabet etmedi.

**Yapılacak:** cihazda/simülatörde bir karta dokunup gözle bakmak. Aranacak
kusur: bindirmeden gerçek ekrana geçerken **titreme** (bir karelik boşluk).
Olursa `CardExpand`'in `onBitti`'si detayın ilk karesinden sonraya
alınmalı.

---

## 3. Bilerek yapılmayanlar — yeniden açma

Gerekçeleri `mobile/AGENTS.md` sonunda yazılı:
- **"Sıra sende" bölümü** — anasayfadan kullanıcı kaldırttı; detayda verisi yok
- **Android sekme çubuğu** — `android/` dizini yok, doğrulanamaz
- **Ölçek dışı boşluk borcu (328)** — ratchet altında, toplu düzeltme riskli

Ayrıca:
- **Yazarken öneri** — `/api/suggest` uç noktası yok (Kararlar, Karar 3)
- **curated-lists.js'teki 200+ sabit kapak adresi** — kullanıcı kararı: dokunma

---

## 4. Açık teknik borç

**Steam hash'li kapak yolları** 6 dosyada daha var:
`steam-library`, `dlc`, `oyun`, `oyun-merged`, `reviews/feed`,
`app/components/GameImage.jsx`.

Kütüphane yolu yüzlerce oyun döndürebiliyor; oyun başına Steam detayı
çekmek orada makul değil — **toplu bir uç ya da istemci tarafı geri dönüş**
ister. `npm run check:images` bunları tabanda tutuyor, büyümelerini
engelliyor. Bu ekranlar şu an kırık kapakta monograma düşüyor (boş kutu
değil), yani acil değil.

---

## 5. Çalışma biçimi — bu oturumda işe yarayanlar

`CLAUDE.md`'deki kuralların ötesinde, pratikte kanıtlananlar:

**Derleme hataları yakalamıyor.** `expo export` geçtiği hâlde çalışma
anında patlayan **beş** hata çıktı: eksik `TOUCH_MIN`, `withDelay`,
`PRESSED`, `WebBrowser`, ve JSX içine `//` yorumu. Yeni kod yazınca
kullanılan her adın içe aktarıldığı **ayrıca** denetlenmeli.

**Yalnız hata yolunda çalışan kod, hata enjekte edilmeden doğrulanamaz.**
Geçici `throw`/`Promise.reject` ile üç gerçek hata bulundu (çapraz sekme
verisi çöp çiziyordu, ikinci `ListHeaderComponent` gerçek başlığı siliyordu,
`renderItem` diye olmayan bir ada bakılıyordu). Enjeksiyonu **geri almayı
unutma**.

**Fast Refresh `useRef`'i hayatta tutuyor.** Bir kez "temizleme çalışmıyor"
sanıldı; soğuk başlatmayla doğru çıktı. Durum hatası şüphesinde
`terminate + launch`.

**Metro log'u kolay bayatlıyor.** Uyarı/hata okumadan önce log dosyasının
tarihine bak; RN `console.warn` OSLog'a değil **Metro'ya** gidiyor.

**İki simülatör açıksa `simctl io booted` yanlış olana gider** — UDID ver.

---

## 8 ratchet — hepsi `npm run check`

`theme` · `spacing` · `contrast` (+CTA dolgusu) · `i18n` (5 dil parite) ·
`reactive` · `imports` · `accent` (sıfır tolerans) · `images`

Üçü bu oturumda eklendi (`i18n`, `imports`, `accent`, `images`) ve
**dördü de gerçek hata yakaladığı için** var.
