# Devir notu — oturum özeti

Bu dosya, uzun bir oturumun sonunda yeni bir sohbete geçerken gereken
bilgiyi taşıyor. Kod ve commit mesajları asıl kaynaktır; burası harita.

---

## 1. Ne yapıldı

### Tasarım fazları 1–8 (tamamlandı)

Claude Design projesi `d06a1d2b-1d55-41d5-b942-af050a5af412` faz faz uygulandı.
Her fazın gerekçesi kendi commit mesajında.

| Faz | Konu | Commit |
|---|---|---|
| 1 | Anasayfa: selamlama, arama kutusu, şerit kartı 3/4 + 32pt ad | `3497d49` |
| 2 | Kart ailesi: sekme çubuğu etiketsiz, sinyal sözleşmesi, `GameRow` | `ccb7913` `6725a0c` `c4f1928` `4dce97c` |
| 3 | Oyun detayı: tek fiyat sistemi, sahiplik bandı, fragman izne bağlı | `a05d013` `9059572` |
| 4 | Arama/keşif: hata ≠ boşluk, etkin filtre çipleri | `33027b5` |
| 5 | Topluluk: davet varsayılan sekmede, seçim dili birleşti | `d95ba5c` |
| 6 | Yazma akışları: tek gönder dili, şikayet kusuru | `7a94fa9` |
| 7 | Profil ve kişiler: "⋯" gerçek menü, Avatar kopyası silindi | `04ef99e` |
| 8 | Gizlilik: arızada bilinmezliğe düş, accent ratchet'i | `0eea222` |

### Sonrasında yapılanlar

- `b59beec` — accent borcu 33 → 0 (sıfır tolerans)
- `adadc72` — üç "yapma" kararı `mobile/AGENTS.md`'ye yazıldı
- `109af3e` — **paylaşım**: oyun ve haber de arkadaşa gönderilebiliyor
- `1295e97` — haber başlığı altındaki solma şeridi kaldırıldı
- `f5d983c` — **kapak hatası**: Steam hash'li varlık yolları
- `d60eae6` — haber "1 dk" → gerçek tazelik
- `da76faf` — **kart büyüme geçişi** (App Store kalıbı)

---

## 2. Kurulan denetimler (`npm run check`)

`mobile/` içinde sekiz ratchet. Üçünü bu oturumda ekledim; **üçü de gerçek
hata yakaladığı için** var:

| Denetim | Ne yakalar | Taban |
|---|---|---|
| `check:theme` | Gerekçesiz sabit renk | 0 |
| `check:spacing` | Ölçek dışı boşluk | 328 |
| `check:contrast` | WCAG AA + dolu CTA tonu | — |
| `check:i18n` | Beş dil parite + tanımsız anahtar | 636 |
| `check:reactive` | Donuk (tema-tepkisiz) dosya | 0 |
| `check:imports` **(yeni)** | Kullanılıp içe aktarılmamış tema sabiti | 0 |
| `check:accent` **(yeni)** | `colors.accent`'in metin/dolgu olarak kullanımı | 0 |
| `check:images` **(yeni)** | Elle kurulan Steam kapak adresi | 12 |

**Neden önemli:** `expo export` bu hataların hiçbirini yakalamıyor —
hepsi çalışma anı `ReferenceError`'ı ya da sessiz görsel bozulma.
Bu oturumda **beş kez** aynı sınıf hata çıktı.

---

## 3. Açık işler

### Öncelikli

1. **Kart büyüme geçişi gözle doğrulanmadı.** Mekanizma günlükle kanıtlı
   (çerçeve `143.56 × 191.41` = tam 3:4, animasyon tamamlanıyor, gezinme
   tetikleniyor) ama **uçuş anı görülmedi**. Ekran görüntüsü ~700 ms
   aralıklı, animasyon 380 ms. Ekran kaydı ile doğrulanmalı.
   → `mobile/src/components/CardExpand.jsx`

2. **Paylaşım uçtan uca denenmedi.** Sunucu tarafı (`gameId` / `newsUrl`
   çözücüleri) deploy edilince "Gönder" akışı sohbete kadar izlenmeli.

3. **Kapak hatası 6 dosyada daha var** (`steam-library`, `dlc`, `oyun`,
   `oyun-merged`, `reviews/feed`, `GameImage.jsx`). Kütüphane yolu yüzlerce
   oyun döndürebiliyor; oyun başına Steam detayı çekmek makul değil —
   toplu bir uç ya da istemci tarafı geri dönüş ister.

### Bilerek yapılmayanlar

`mobile/AGENTS.md` sonundaki "Kapatılan kararlar" bölümünde gerekçeleriyle
yazılı: **"Sıra sende" bölümü**, **Android sekme çubuğu**, **boşluk borcu
toplu düzeltmesi**.

---

## 4. Yayın durumu

- **Yerli değişiklik YOK** → yeni derleme gerekmiyor, **OTA yeterli**.
  `runtimeVersion` politikası `appVersion` = **2.5.0**; güncelleme yalnız
  2.5.0 kurulumlara ulaşır.

```bash
cd mobile && eas update --branch production --message "tasarım fazları + paylaşım + kapak düzeltmesi"
```

- **Sunucu tarafı**: son kontrolde canlı API hâlâ eski kodu döndürüyordu
  (`gorselYok` alanı yok). Vercel derlemesi doğrulanmalı.

---

## 5. Çalışma biçimi (bu repoda işe yarayanlar)

- **Ölç, tahmin etme.** Bu oturumda birkaç kez kaynağı okumadan varsayım
  yaptım ve yanıldım — canlı uca `curl` atmak, simülatörde piksel ölçmek,
  Metro log'unu okumak her seferinde daha hızlı çıktı.
- **Metro log'u tut.** `nohup npx expo start --dev-client > log 2>&1 &` —
  RN `console.warn`/`ERROR` OSLog'a değil Metro'ya gidiyor.
- **Simülatörde iki cihaz açıksa UDID ver.** `simctl io booted` yanlış
  cihazı yakalayabiliyor.
- **Geçici hata enjeksiyonu.** Yalnız arızada çalışan yollar (bozuk bant,
  boş durum) başka türlü görülmüyor; bu oturumda üç gerçek hata böyle çıktı.
