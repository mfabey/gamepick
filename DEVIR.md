# Gamerisen — oturum devri

Bu belge, uzun bir oturumun sonunda **yeni bir sohbetin sıfırdan başlaması**
için yazıldı. Yalnızca koddan/git'ten okunamayacak şeyler burada.

---

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
