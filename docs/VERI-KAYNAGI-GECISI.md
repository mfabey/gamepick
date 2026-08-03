# Veri kaynağı geçişi — RAWG'dan Steam + ITAD'a

**Durum:** planlandı, uygulanmadı. Karar 3 Ağustos 2026'da alındı, geçiş sonraya bırakıldı.
**Tetikleyen olay:** RAWG API'si çöktü (Cloudflare HTTP 522) ve uygulamada hiçbir oyun görünmez oldu.

---

## Neden

RAWG tek nokta hatası. Çöktüğünde katalog, detay sayfası ve öneri akışı birlikte
düşüyor. 3 Ağustos'ta bu yaşandı; zaman aşımı ve devre kesici eklenerek
uygulama ayakta tutuldu (`app/lib/rawg-fetch.js`) ama bu bir yama, çözüm değil.

## Asıl sorun: çift kimlik uzayı

Kod tabanı **tek** bir kimlik öneki (`rawg_`) kullanıyor ama onu **iki uyumsuz
sayı uzayından** besliyor:

| Kaynak | GTA V kimliği |
|---|---|
| RAWG | `rawg_3498` |
| Steam yedeği | `rawg_271590` (Steam appid) |

RAWG ayakta olduğu sürece bu görünmüyordu. Devre kesici açılınca bütün uçlar
Steam yedeğine düştü ve kimlikler değişti.

**Kullanıcıya yansıması:** istek listesi, koleksiyon üyeliği, "sahipsin"
rozeti, görüldü/ilgilenmiyorum filtreleri — hepsi kimliğe bakıyor. Kimlik
değişince eşleşme kopuyor; aynı oyun koleksiyona iki kez eklenebiliyor.

Bu, geçişten bağımsız olarak düzeltilmesi gereken bir hata.

---

## Hedef mimari

| Katman | Kaynak | Kapsam |
|---|---|---|
| Birincil katalog | **Steam** | tür, görsel, açıklama, inceleme, fiyat, appid |
| İkincil katalog | **ITAD** | Steam'de olmayan oyunlar + mağazalar arası fiyat |
| Kütüphane | **Steam + Xbox OAuth** | sahip olunan oyunlar, Game Pass |

### Kimlik şeması

Kaynak öneke AÇIKÇA yazılacak — bugünkü hatanın kökü, iki uzayın tek önekte
toplanmasıydı:

```
steam_271590        Steam'den gelen
itad_<uuid>         yalnızca ITAD'da olan (Epic/GOG münhasırı)
```

Böylece aynı oyunun iki farklı kimlik alması yapısal olarak imkânsız hâle
gelir.

---

## Ölçülmüş bulgular (3 Ağustos 2026)

Bunlar varsayım değil, canlı test sonuçları:

- **Steam tür bazlı keşif yapabiliyor.** `search/results/?tags=<id>` filtresi
  çalışıyor: Action ∩ RPG %32 örtüşme (makul, oyunlar çoklu türde),
  Action ∩ Survival %10. Yani "Senin İçin" akışı Steam'le beslenebilir.
- **Steam metadata yeterli.** appdetails; tür, ekran görüntüsü (5-10 adet),
  açıklama (1000-5000 karakter), metacritic, fiyat, inceleme veriyor.
- **Tür taksonomisi zaten soyutlanmış.** `mobile/src/services/recommend.js`
  içindeki `GENRE_CANON` katmanı Türkçe/Steam adlarını kanonik adlara
  çeviriyor. RAWG slug'ı yerine Steam etiket kimliğine bağlamak *yeniden
  yazmak* değil, *yeniden eşlemek*.
- **ITAD canlı ve hızlı.** Elden Ring için 1.3 sn'de Steam + Humble fiyatı
  döndü. Tanımlı mağazalar: Epic, Steam, GOG, Humble, Xbox.
- **Epic kütüphanesi zaten çekilemiyor** — Epic herkese açık kütüphane API'si
  sunmuyor. Bu RAWG'la ilgili değil, geçiş bir şeyi kötüleştirmiyor.
- **`/api/epic` şu an bozuk**, boş dönüyor (GraphQL çağrısı çalışmıyor).
  RAWG'dan bağımsız, ayrı bir arıza.

---

## Geçişten ÖNCE ölçülmesi gereken

**Kataloğun ne kadarı Steam dışı?** Bu sayı bilinmeden geçişin maliyeti doğru
tartılamaz:

- %2-3 ise → ITAD ikincil katmanı gereksiz olabilir, saf Steam yeter
- %20 ise → ITAD mimarinin merkezine konmalı

---

## Fazlar

### Faz 1 — Kimlik tutarlılığı (geçişten bağımsız, ACİL)
Bugünkü hatayı durdurmak. İki seçenek:
- **A (hızlı yama):** Steam yedeği de RAWG kimliğini üretsin (slug → RAWG id
  eşlemesi). Mevcut kullanıcı verisi korunur, RAWG dönene kadar idare eder.
- **B (kalıcı):** kimlikleri kaynak önekli hâle getir (`steam_`, `itad_`) ve
  tek seferlik göç yaz.

### Faz 2 — Steam birincil kaynak
`/api/games` ve `/api/rawg-game` Steam'i varsayılan yapar, RAWG yalnızca
Steam'de bulunamayanlar için yedek kalır.

### Faz 3 — ITAD ikincil katalog
Steam'de olmayan oyunlar ITAD'dan gelir. RAWG bağımlılığı tamamen kalkar.

### Faz 4 — Kullanıcı verisi göçü
Koleksiyon, istek listesi, görüldü, ilgilenmiyorum kayıtlarındaki eski
`rawg_<id>` değerleri yeni şemaya eşlenir. Eşlenemeyenler için kullanıcıya
bilgi verilir; sessizce silinmez.

---

## Geçici çözüm (yürürlükte)

`app/lib/rawg-fetch.js` — zaman aşımı (2.5 sn) + devre kesici (5 dk soğuma),
dört rotanın PAYLAŞTIĞI tek durum. RAWG çöktüğünde ceza bir kez ödeniyor,
sonraki istekler doğrudan Steam yedeğine gidiyor.

Ölçülen etki:

| Uç | Öncesi | Sonrası |
|---|---|---|
| `games?section=sale` | 42.6 sn | 11.0 sn (devre kapalı) |
| `games?genres=action` | 20.0 sn | 0.9 sn (devre açık) |
| `rawg-game` | 20.0 sn | 6.0 sn |

Mobil istemcinin sınırı 12 sn (`mobile/src/api/client.js`), o yüzden 11 sn
hâlâ dar bir pay — Faz 2 bunu kökten çözer.
