# Gamerisen — oturum devri

Bu belge, uzun bir oturumun sonunda **yeni bir sohbetin sıfırdan başlaması**
için yazıldı. Yalnızca koddan/git'ten okunamayacak şeyler burada.

---

## GÜNCEL — 27 Eylül 2026, akşam (Mac, 2.8.0 — 2.0 geçişi kapandı)

**Önce bunu oku; aşağıdaki "Eski devir" bölümü tarihsel.**

### Durum
- Dal **`design-v2`** (mobil). Sürüm **2.8.0**; 2.7.2'ye OTA GÖNDERİLEMEZ
  (yeni yerli modüller, runtime `appVersion`).
- **Design 2.0 istemci işi bitti.** Kapananlar (27 Eyl): alt sayfalar DS 4,
  hata durumları, gönderi/inceleme ailesi, sohbet sayfaları, G-02 tanıtım +
  G-02b ilgi alanları, yenileme işareti, artıklar (Ionicons 0), Keşfet, izgara
  iskeleti, Canlı Çubuk basılı tut + kaydır, alt sayfa odak kaybında kapanma
  (derin bağlantı kusuru), büyüme geçişinde çubuk, tür adları arayüz dilinde,
  auth/hesap silme metinleri, ve SUNUCU GEREKTİRENLER: birleşik arama
  (G-05/06), fiyat geçmişi + hedef alarm (G-08), oyun toplulukları (G-11),
  bildirim merkezi (G-20).
- **Sunucu işi `main`'de DEĞİL, yerel `sunucu-2.0` dalında** (worktree
  `~/gamepick-main`, `origin/main` 2f96a44 üstüne 3 commit): smart-search
  Steam yedeği + beş dil, /api/social/notifications, /api/social/community,
  /api/price-history, /api/search-trends, hedef fiyat (push/register + cron).
  `npm run build` geçti; depolar Upstash taklidine karşı 23 senaryoyla
  sınandı. **Yayına çıkması kullanıcı onayı bekliyor** (`main`'e push =
  Vercel üretim dağıtımı). O dalda `main`'e sonradan gelen web commit'leri
  (Batuhan) var, çakışma yok.
- İstemci, sunucu yayında değilken zarifçe düşüyor: yeni bölümler çizilmiyor
  ya da "yüklenemedi" gösteriyor. Veri gösteren hâller GEÇİCİ örnek veriyle
  simülatörde doğrulandı (örnek veri commit'lenmedi).
- ÖLÇÜLDÜ: RAWG aylık kotası dolu (401 "monthly API limit reached") —
  smart-search her sorguda 0 sonuç veriyordu; Steam yedeği bunu çözüyor.
  Model (Gemini/Groq) üretimde aralıklı çalışıyor; düşünce anahtar kelime
  eşlemesi (artık 5 dil) devreye giriyor.
- EAS build 55 (2.8.0) BU İŞLERDEN ÖNCE alınmıştı — mağazaya o gitmemeli;
  yeni derleme gerekiyor.

### Doğrulanamayanlar (dürüstlük notu)
- Android: bu Mac'te SDK yok; yalnız `expo export` ile paketlendi.
- Sunucu uçları üretim Redis/Firebase/ITAD ile uçtan uca YAYINDAN SONRA
  denenecek: `curl -s "https://www.gamerisen.com/api/price-history?appid=1145360&title=Hades"`,
  `…/api/smart-search` (debug:true → kaynak steam), bildirim merkezi için
  iki hesapla arkadaşlık isteği / yanıt / beğeni.
- Izgara iskeleti karesi yakalanamadı (veri önbellekten anında geliyor).
- Web'in `app/api/auth/delete-account` ucu yeni bildirim/üyelik verisini
  silmiyor (web koduna dokunulmadı; mobil `mobile-delete` siliyor).

### Kullanıcının kuralları
- Mobil çalışırken kökteki `app/` (web) koduna dokunma; sunucu uçları için
  kullanıcı "Hepsini yap" dedi (27 Eyl) — yalnız API/lib, web sayfası yok.
- Her iş sonunda dur, onay bekle (`CLAUDE.md`). Push onayı her iş için ayrı.
- Derleme kararı "yalnız derle": App Store Connect'e yükleme/inceleme
  kullanıcı söylemeden yok. Google girişi kapalı kalıyor.

### Sıradaki
1. Onay: `sunucu-2.0` → `main` push (üretim dağıtımı) ve `design-v2` push.
2. Dağıtımdan sonra üretimde uçları doğrula (yukarıdaki komutlar).
3. Yeni EAS iOS production derlemesi (2.8.0, build 56+); yükleme kararı
   kullanıcıda. Mağaza ekran görüntüleri yeni tasarımla yeniden çekilmeli.
4. `docs/design-migration.md` §7'de açık kalanlar: 6, 7, 8, 9, 11, 13, 14, 15.

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
