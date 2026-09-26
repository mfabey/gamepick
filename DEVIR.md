# Gamerisen — oturum devri

Bu belge, uzun bir oturumun sonunda **yeni bir sohbetin sıfırdan başlaması**
için yazıldı. Yalnızca koddan/git'ten okunamayacak şeyler burada.

---

## GÜNCEL — 27 Eylül 2026 (Mac, 2.8.0 mağaza derlemesi)

**Önce bunu oku; aşağıdaki "Eski devir" bölümü tarihsel.**

### Durum
- Dal **`design-v2`**, `origin` ile eşit. Mobil 2.0 işi burada; site yalnız
  `main`'den yayınlanıyor ve bu işin hiçbiri `main`'e gitmedi.
- Sürüm **2.8.0** (app.json + package.json). Mağazadaki 2.7.2'de olmayan yerli
  modüller var (`expo-blur`, Google Sign-In): runtime politikası `appVersion`
  olduğu için **bu daldan 2.7.2'ye OTA GÖNDERİLEMEZ** — çöker. 2.8.0 ayrı runtime.
- 27 Eylül: 2.8.0 için EAS **production** derlemesi başlatıldı — kullanıcı
  kararı "yalnız derle": App Store Connect'e yükleme / incelemeye gönderme
  YAPILMADI. Durum: `cd mobile && npx eas-cli build:list --platform ios --limit 3`.
- 25–26 Eylül 2.0 geçişlerinin cihaz turu yapıldı (iOS simülatör, oturumlu ve
  oturumsuz): `docs/cihaz-kontrol-2026-09-25.md` — bulgular ve düzeltmeler orada.
- **Canlı Çubuk** (yeni navbar, `fcb7e1a`): tasarım tuvali
  https://claude.ai/artifact/AS3srUgnzw3EoNPxAWyKca (özel). Kod:
  `src/components/navigation/{TabBar.tsx,CanliCubuk.tsx}`,
  `src/services/canliCubuk.js`. Android yalnız `expo export` ile paketlendi —
  **görsel olarak doğrulanmadı** (bu Mac'te Android SDK yok).

### iOS'ta görmek (Mac)
- Expo Go kullanılamaz (SDK 54). `npx expo run:ios` bu makinede çalışmıyor
  (simülatörü fiziksel cihaz sanıyor) — işleyen yol `docs/DURUM.md` → macOS:
  `npx expo prebuild -p ios --clean`, `LANG=en_US.UTF-8 pod install`, Release
  `xcodebuild … -sdk iphonesimulator`, `simctl install/launch`.
- Simülatörler: iPhone 17 Pro `30A5F08D…` (oturumsuz, açık tema) ve
  **"Gamerisen SE"** `978B2F6D…` (375×667 = iPad uyumluluk kanvası; oturumlu
  test hesabı, Almanca). İki simülatör açıkken `booted` yerine UDID ver.
- Dokunma / kaydırma / erişilebilirlik ağacı: **AXe** CLI (Homebrew Xcode 27
  istediği için GitHub sürüm ikilisi, scratchpad'e indirildi). Push denemesi:
  `xcrun simctl push <UDID> com.gamerisen.app x.json` — veri `body` altında.

### Kullanıcının kuralları
- **Mobil çalışırken kökteki `app/` (web, Next.js) koduna dokunma.** Web'de
  sorun görülürse yalnız okuyarak teşhis et; düzeltme için önce sor.
- Her iş sonunda dur, onay bekle (`CLAUDE.md`). Push onayı her iş için ayrı.

### Sıradaki
1. 2.8.0 derlemesi bitince: kullanıcı App Store Connect'e yükleme/inceleme
   kararını verecek (sürüm notları, ekran görüntüleri — ekran görüntüleri
   yeni tasarımla yeniden çekilmeli).
2. Açık kalanlar: basılı tut + kaydırarak sekme tarama (Canlı Çubuk) ·
   Swipe kartında sunucudan Türkçe gelen tür etiketleri · filtre sayfası
   açıkken gelen derin bağlantı Modal'ın altında açılıyor · büyüme geçişinde
   sekme çubuğu bindirmenin üstünde · Android görsel doğrulaması (Mac'te SDK
   yok; Windows'ta da SDK silinmiş, `Gamerisen_API36` AVD tanımı duruyor).
3. Kalan 2.0 işleri (sunucusuz): alt sayfalar (`PersonMenu`,
   `ShareToFriendSheet`, `PublishSheet`, `ChoiceSheet` → DS 4) · hata
   durumları (`CevrimdisiBant`, `LimitedMode`) · gönderi/inceleme ailesi ·
   sohbet (`MessageMenu`, `GifPicker`) · G-02 Tanıtım · artıklar (ölü
   `FloatingTabBar.jsx` / `StoreLogo.jsx` — `AGENTS.md` hâlâ FloatingTabBar'ı
   anlatıyor).
4. Sunucu gerektirenler: birleşik arama (G-05/06), fiyat geçmişi (G-08),
   bildirimler (G-20), oyun toplulukları (G-11).
5. Kullanıcı kararı bekleyenler: `docs/design-migration.md` §7 — 12, 3, 4,
   17, 11. (16 kapandı: 2.8.0.)

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
