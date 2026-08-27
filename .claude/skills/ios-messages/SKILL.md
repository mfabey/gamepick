---
name: ios-messages
description: Apple Messages (iMessage) arayüzünün ölçülmüş referans değerleri — baloncuk geometrisi, kuyruk, gruplama kuralları, tarih ayraçları, iOS 26 Liquid Glass başlık ve kompozitör ölçüleri, teslim/okundu satırı, tapback yerleşimi, yazıyor göstergesi. Mesajlaşma ekranı (sohbet, konuşma listesi, kompozitör) tasarlanırken veya iOS'a benzer bir sohbet arayüzü yazılırken kullan.
argument-hint: "[sohbet ekranı | konuşma listesi | kompozitör]"
metadata:
  version: "1.0.0"
  kaynak: "iOS 26.5 Simulator (iPhone 17 Pro, 402x874pt @3x) piksel ölçümü + topluluk tersine mühendisliği"
  olculme_tarihi: "2026-08-26"
---

# iOS Messages referansı

Bu belge iki tür değer taşıyor ve **ikisi karıştırılmamalı**:

- **[ÖLÇÜLDÜ]** — iOS 26.5 Simulator'da Messages.app açılıp ham ekran görüntüsü
  (1206×2622 px, @3x) piksel piksel taranarak bulundu. Kesin.
- **[KAYNAK]** — Apple resmî sayı yayınlamıyor; topluluk tersine
  mühendisliğinden ve yerleşik iOS davranışından geliyor. Yakın ama ±1pt
  oynayabilir.

Ekran görüntüsü alınan sohbetlerde **mesaj yoktu**: simülatörde iMessage
hesabı açılamıyor. Bu yüzden başlık, konuşma listesi ve kompozitör ÖLÇÜLDÜ;
baloncukların kendisi KAYNAK.

---

## 1. Baloncuk (bubble)

| Özellik | Değer | Not |
|---|---|---|
| Köşe yarıçapı | 18pt (iOS 26'da ~20), sürekli eğri | [KAYNAK] |
| Metin | 17pt (HIG body), satır yüksekliği 22 | [KAYNAK] |
| Dolgu | dikey 8–9pt, yatay 14pt | [KAYNAK] |
| En fazla genişlik | ekranın %75'i | [KAYNAK] |
| Kuyruk (tail) | ~16×14pt, alt köşede, dışa kıvrık | [KAYNAK] |
| En küçük baloncuk | 42×32pt — altında köşeler bozuluyor | [KAYNAK] |
| Gönderilen renk | systemBlue: açık #007AFF, koyu #0A84FF (üstte hafif gradyan) | [KAYNAK] |
| Alınan renk | açık #E9E9EB, koyu #26262A | [KAYNAK] |
| Gönderilen metin | daima beyaz | [KAYNAK] |

**Kuyruk KURALI (en çok atlanan şey):** kuyruk her baloncukta yok. Bir
grubun **yalnız son** baloncuğunda var. Grup = aynı kişinin arka arkaya,
kısa aralıkla (≈60 sn) attığı mesajlar.

CSS'te kuyruk iki sözde-öğeyle çiziliyor: renkli parça `16px 14px`
alt-köşe yarıçapıyla, üstüne zemin renginde `10px` yarıçaplı bir kesici.
React Native'de karşılığı `react-native-svg` ile tek `Path`.

## 2. Gruplama ve boşluk

| Durum | Dikey boşluk |
|---|---|
| Aynı kişi, arka arkaya | 2pt |
| Kişi değişti / grup bitti | 8pt |
| Tarih ayracından sonra | 12–16pt |

Yatay kenar boşluğu: 16pt. Kuyruklu baloncuk kenara yapışır, kuyruksuz
olanlar da aynı hizada durur (kuyruk dışarı taşar, hizayı bozmaz).

## 3. Tarih ayracı

Ortada, 12–13pt, ikincil gri. Gün **kalın**, saat normal:
`**Bugün** 14:32` / `**Salı** 09:11` / `**26 Ağu 2026** 18:04`.
Ayraç, iki mesaj arasında ~1 saatten uzun boşluk varsa giriyor; ayrıca
her yeni günün ilk mesajından önce.

## 4. Teslim / Okundu

Son **gönderilen** mesajın altında, sağa dayalı, 11pt, ikincil gri:
`Teslim edildi` → `Okundu 14:33`. Yalnızca EN SON gönderilen mesajda;
her mesajın altına konmuyor.

## 5. Tapback (tepki)

Baloncuğun **üst köşesine biner** — gönderdiğim mesajda sol üst, aldığım
mesajda sağ üst. Akışta değil, `position: absolute`. Kendi rozeti dairesel,
zemini baloncuktan bir kademe farklı; iki küçük kabarcık kuyruk gibi
baloncuğa bağlanıyor.

## 6. Başlık — iOS 26 (Liquid Glass) [ÖLÇÜLDÜ]

402pt genişlikte iPhone 17 Pro, güvenli alan üstü 62pt:

| Öğe | Ölçü |
|---|---|
| Geri düğmesi | Ø44 daire, sol kenardan 16pt, üst 62pt |
| Avatar | Ø60, yatayda ortalanmış, üst 62pt (geri düğmesiyle aynı hiza) |
| Ad hapı | y 117→149.3 (yükseklik 32.3pt), içeriğe göre genişlik, tam yuvarlak |
| Hap–avatar örtüşmesi | 5pt (hap avatarın altına biniyor) |
| Başlık toplam yüksekliği | 149.3pt |
| Cam dolgu (koyu) | siyah üstünde `#191919` ≈ `rgba(255,255,255,0.10)` |
| Cam dolgu (açık) | saf beyaz + yumuşak gölge, kenarlık YOK |

Ad hapının sağında küçük bir `›` var (kişi kartına gider).

## 7. Kompozitör — iOS 26 [ÖLÇÜLDÜ]

| Öğe | Ölçü |
|---|---|
| "+" düğmesi | Ø40 daire, sol kenardan 28pt |
| "+" ile alan arası | 12pt |
| Metin alanı | x 80→373.7 (genişlik 294pt), yükseklik 40pt, tam yuvarlak |
| Sağ kenar boşluğu | 28pt |
| Alt kenar | ekran altından 28pt (ana ekran çizgisi altta kalıyor) |
| Dolgu (koyu) | `#191919` ≈ %10 beyaz |
| Dolgu (açık) | beyaz + gölge |

Gölge profili (açık tema, ÖLÇÜLDÜ): kapsül alt kenarında zemin `#f4f4f4`
(≈%4 koyulaşma), 20pt aşağıda `#fbfbfb`'ye sönüyor; üstte 24pt'de beyaza
dönüyor. Karşılığı yaklaşık `opacity .06, radius 18, offsetY 3`.

Metin girilince mikrofon simgesinin yerini **alanın İÇİNDE** mavi yuvarlak
yukarı ok alıyor. Gönder düğmesi alanın dışında ayrı durmuyor.

## 8. Konuşma listesi [ÖLÇÜLDÜ]

| Öğe | Ölçü |
|---|---|
| Avatar | Ø45, merkez x=48.3pt (sol kenardan ~26pt) |
| Metin sütunu başlangıcı | x ≈ 86pt |
| Satır adımı | 86.7pt (iki satırlık önizleme yeri ayrılmış) |
| Ayraç çizgisi | y hizası satır altı, renk `#2a2a2c` (koyu), metin sütunundan başlıyor |
| Sağ blok | tarih + `›` çevron, sağ kenardan ~16pt |

Soldaki ~26pt boşluk keyfi değil: **okunmamış noktası** için ayrılmış oluk.

## 9. Yazıyor göstergesi

Karşı taraf yazarken listenin **en altına**, sol tarafa, alınan mesaj
renginde bir baloncuk giriyor; içinde üç gri nokta sırayla büyüyüp
soluyor (≈1.2 sn döngü, noktalar arası ≈0.2 sn gecikme). Başlıkta değil,
akışın içinde.

## 10. Hareket ve dokunsal

- Gönderme: baloncuk kompozitörden yukarı, hafif aşan bir yayla oturuyor.
- Uzun basma: bağlam menüsü + orta şiddette dokunsal geri bildirim.
- Tapback: hafif dokunsal + rozetin küçükten büyüyerek gelmesi.
- Kaydırırken sağa/sola çekince mesaj saatleri kenardan beliriyor.

## Kaynaklar

- iOS 26.5 Simulator, Messages.app — doğrudan piksel ölçümü (bu belgenin
  [ÖLÇÜLDÜ] satırları)
- Samuel Kraft, "How to create iOS chat bubbles in CSS" — kuyruk geometrisi
  https://samuelkraft.com/blog/ios-chat-bubbles-css
- Apple HIG, Typography — 17pt gövde, 11pt alt sınır
  https://developer.apple.com/design/human-interface-guidelines/typography

---

## Ek: ters çevrilmiş FlatList'te animasyon yönü [ÖLÇÜLDÜ]

Sohbet listesi `inverted` ve kodda "yönlü animasyonlar çevrilmiş eksende
ters görünüyor" diyen bir not vardı. Simülatörde izole bir ekranla ölçüldü:

Altı baloncuğa sabit `transform: [{ translateY: 40 }]` verildi.
Ölçüm (pt, baloncuk üst kenarları):

```
taban        : 461.7  509.7  557.7  605.7  653.7  701.7
translateY+40: 501.7  549.7  597.7  645.7  693.7  741.7
```

Hepsi tam **+40pt aşağı**. Yani hücrenin içindeki pozitif `translateY`
ekranda AŞAĞI gidiyor; eksen ters DÖNMÜYOR.

**Sonuç:** giriş animasyonunu `initialValues: { translateY: +N }` → `0`
diye yazmak baloncuğu aşağıdan (kompozitör tarafından) yukarı getiriyor —
iOS'un gönderim hareketiyle aynı yön. Eski notun uyardığı şey Reanimated'in
HAZIR yardımcıları (`FadeInDown` vb.): onlar ötelemeyi kendileri hesaplıyor
ve ters listede yanlış yöne kuruyorlar. Açık `initialValues` bu tuzağa
düşmüyor.

## Ek: saat sütunu jesti — çalışan yapılandırma [ÖLÇÜLDÜ]

Sola sürükleyip saatleri göstermek, ters listenin kendi DİKEY kaydırmasıyla
yarışıyor. İzole ekranda çalıştığı doğrulanan ayar:

```js
Gesture.Pan()
  .activeOffsetX([-20, 20])   // yatayda 20pt'den önce etkinleşme
  .failOffsetY([-15, 15])     // dikeyde 15pt'de VAZGEÇ → kaydırma kazanır
  .onUpdate((e) => { kayma.value = Math.min(0, Math.max(-56, e.translationX)); })
  .onEnd(() => { kayma.value = withSpring(0, { stiffness: 260, damping: 14 }); });
```

`GestureDetector` **listenin tamamını** sarmalıyor, tek tek satırları değil.

Ölçüm: baloncuğun sağ kenarı 385.7pt → 329.7pt (**tam 56.0pt** kayma),
bırakıldıktan 2 sn sonra 385.7pt'ye dönüyor. Aynı ekranda dikey kaydırma
sınandı: liste 1-14'ten 25-40'a geçti, yani jest kaydırmayı engellemiyor.

Saat sütunu satırın İÇİNDE `right: -56` ile duruyor ve satırla aynı
`translateX`'i alıyor; kapsayıcı tam genişlikte olduğu için baloncuk
genişliğinden bağımsız olarak düz bir sütun oluşuyor.

## Ek: görsel baloncukta kuyruk [ÖLÇÜLDÜ]

Kuyruğun dolgusu baloncuğun ZEMİN RENGİNİ taşıyor. Salt görsel baloncukta
zemin yok — baloncuğu görsel dolduruyor. Çözüm: kuyruk kabı
`overflow:'hidden'` ve içinde aynı görselin ikinci bir kopyası.

**Ölçülen tuzak:** kopya baloncukla AYNI genişlikte olursa çengelin dış
7pt'si boş kalıyor (kaynakta o pikseller yok). Ekranda sonuç: köşe kare
görünüyor ve altında anlamsız bir çentik kalıyor — kuyruk hiç okunmuyor.

**Düzeltme:** kopya `w + 7` genişliğinde ve kuyruk tarafındaki kenara
dayalı. iOS de görseli baloncuk+kuyruk siluetinin tamamına aspect-fill
ediyor. %3'lük genişleme fotoğrafta ve GIF'te görünmüyor; yalnız sentetik
şerit deseninde dikkatle bakınca fark ediliyor.

**Video'da kuyruk yok:** kopyalanacak kare elimizde yok, poster görseli
tutulmuyor. Maskeleme (`@react-native-masked-view`) eklenmedi — yerel
modül, OTA güncellemesini kırar.

## Ek: salt emoji mesajı [ÖLÇÜLDÜ]

iOS, yalnız emoji içeren kısa bir mesajı baloncuğa koymuyor ve büyütüyor:
tek bir "👍" cümle değil, JESTTİR.

Uygulanan kural: metin yalnız emoji + boşluktan oluşuyorsa ve en fazla
**3** emoji varsa baloncuk yok, punto 48.

**Hermes `\p{...}` desteği: VAR** (cihazda doğrulandı). Yine de regex
kurulumu `try/catch` içinde: desteklenmeyen bir motorda `new RegExp`
modül yüklenirken atar ve ekranı hiç açtırmaz. Başarısız olursa özellik
sessizce kapanıyor, mesaj normal baloncukta çiziliyor.

**Ölçülen tuzak — BAYRAKLAR.** 🇹🇷 iki `Regional_Indicator`dan oluşuyor ve
hiçbiri `Extended_Pictographic` DEĞİL. Yalnız piktograf sayılırsa bayrak
için sayım sıfır çıkıyor ve mesaj baloncukta kalıyor. Doğrusu: bölgesel
gösterge sayısının yarısı da toplama ekleniyor.

Cihazda sınanan 12 durum, hepsi doğru: tek/iki/üç emoji ve ten rengi
değiştirici ve ZWJ aile ve varyasyon seçicili kalp ve tek/iki bayrak →
BÜYÜK · dört emoji ve dört bayrak ve "Tamam 👍" ve düz metin → baloncuk.

## Ek: tapback giriş animasyonu [ÖLÇÜLDÜ]

Rozet `ZoomIn.springify().damping(14).stiffness(260)` ile küçükten
yaylanarak geliyor (Reanimated 4.1.1'de API geçerli — cihazda sınandı).
Animasyonun ortasında yakalanan kare: animasyonlu rozet 5.3pt,
yanındaki animasyonsuz referans 22pt.

`entering` yalnız BAĞLANIRKEN çalışıyor, yani tepki eklendiğinde — sohbet
açılırken zaten duran rozetler animasyonsuz geliyor, doğrusu da bu.

## Ek: simülatörde ANIMASYON DOĞRULAMA tuzağı

Bu oturumda saatler harcandı; bir daha harcanmasın.

`swipe` ve `touch_path` parmağı **yol biter bitmez kaldırıyor**. `touch_path`
sonuna aynı noktadan bekleme noktaları koymak dokunuşu basılı TUTMUYOR.
Yaylanarak geri dönen bir etkileşimde (bırakınca 0'a dönen kaydırma gibi)
ekran görüntüsü her zaman OTURMUŞ hâli yakalıyor — özellik çalışsa bile
"çalışmıyor" gibi görünüyor.

**Güvenilir yöntemler:**
1. Geri dönüşü geçici kapat (`.onEnd(() => {})`), ölç, geri al.
2. Paylaşılan değere sabit bir başlangıç ver (`useSharedValue(-56)`), ölç.
3. Worklet'in içine `console.log` koy ve Metro çıktısını oku — EN KESİN
   yöntem: jestin başlayıp başlamadığını, hangi değerin stile ulaştığını
   doğrudan söylüyor.

**Ayrıca: Fast Refresh'e güvenme.** Bu oturumda birkaç ölçüm, dosya
değişmiş ama uygulamaya ulaşmamışken alındı ve yanlış sonuç verdi. Ölçüm
öncesi `simctl terminate` + `launch` ile sert yeniden başlat.
