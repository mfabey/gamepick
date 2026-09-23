# Claude Code komutları, adım adım

Her fazı ayrı bir oturumda çalıştır. Fazlar arasında `/clear` yap. Komutları olduğu gibi yapıştırabilirsin; köşeli parantezli yerleri doldur.

Her fazın sonunda uygulamayı simülatörde aç ve kendin de bak. Beğenmediğin bir şey varsa aynı oturumda söyle, sonra commit at.

---

## Hazırlık (sen yaparsın, 5 dakika)

1. `gamerisen-handoff.zip` dosyasını aç. İçindeki klasörü reponun köküne `design-handoff/` adıyla koy.
2. `design-handoff/CLAUDE.md` dosyasının içeriğini reponun kökündeki `CLAUDE.md` dosyasının sonuna yapıştır. Dosya yoksa kopyala.
3. Yeni bir dal aç: `git checkout -b design-v2`.
4. Referans PNG'ler yaklaşık 27 MB. Repoda tutmak istemezsen `.gitignore` dosyasına `design-handoff/design/reference/` satırını ekle.

---

## Faz 0: Keşif ve eşleme (kod yazılmaz)

```
design-handoff/README.md, design-handoff/design/SCREENS.md ve COMPONENTS.md dosyalarını oku.
Sonra repodaki mevcut arayüzü incele: app/ altındaki route'lar, bileşen klasörleri, tema/renk dosyaları, kullanılan UI kütüphaneleri.

docs/design-migration.md adında bir plan yaz. İçinde şunlar olsun:
1. Ekran eşlemesi: tasarımdaki 25 ekranın her biri için mevcut route (varsa), yoksa önerilen route; ekranın veri kaynağı (hook, API, store).
2. Bileşen eşlemesi: COMPONENTS.md'deki her bileşen için repoda karşılığı olan bileşen (varsa) ve kararın: "yeniden yaz", "yeni stil ver", "yeni".
3. Mevcut tema dosyasının yeni tokens.ts ile nasıl değiştirileceği. Eski adlar geçici olarak yeni değerlere yönlendirilebilir.
4. Eklenecek paketler ve sürüm uyumu (Expo SDK 54).
5. Riskler: veri, navigasyon ya da iş mantığında dokunulmaması gereken yerler.

Kod değiştirme. Sadece planı yaz ve bana özetle.
```

---

## Faz 1: Temel (değerler, ikonlar, logo, simge, splash)

```
docs/design-migration.md planına göre temeli kur:

1. Paketler: npx expo install react-native-svg expo-image expo-blur expo-glass-effect expo-linear-gradient expo-haptics react-native-reanimated react-native-safe-area-context expo-font @expo-google-fonts/inter
   Zaten kuruluysa sürümlerine dokunma.
2. design-handoff/code/theme/tokens.ts ve index.ts dosyalarını reponun tema klasörüne kopyala. Değerleri değiştirme.
   Eski tema dosyası varsa eski adları yeni değerlere yönlendir, böylece mevcut ekranlar bozulmaz.
3. design-handoff/code/components/Icon.tsx, brand/Logo.tsx ve navigation/TabBar.tsx dosyalarını bileşen klasörüne kopyala, import yollarını düzelt.
   app/(tabs)/_layout.tsx içinde <Tabs tabBar={...}> ile GamerisenTabBar'ı bağla (kullanım örneği dosyanın başında). Sekme başlıkları (title) erişilebilirlik adı olarak kalsın, ekranda etiket görünmesin.
   Sekme ekranlarının kaydırılan içeriğine paddingBottom olarak useTabBarInset() ver.
4. Android için Inter fontlarını (400, 500, 600, 700) kök layout'ta useFonts ile yükle. Fontlar yüklenene kadar splash açık kalsın.
5. design-handoff/assets/ klasörünü ./assets/brand/ altına kopyala. design-handoff/config/app.json.snippet.jsonc dosyasındaki alanları app.json dosyasına işle.
6. Kök layout'ta arka plan #0A0A0B olsun, StatusBar "light" olsun.
7. Geçici bir app/(dev)/icons.tsx ekranı yap: ICON_NAMES listesindeki tüm ikonları, Mark (onDark / onLight), Wordmark ve Lockup bileşenlerini göster.

Bitince npx tsc --noEmit çalıştır. Simülatörde dev ekranının ekran görüntüsünü al (xcrun simctl io booted screenshot) ve design-handoff/design/reference/G-DS-1-Foundations.png ile karşılaştır.
```

---

## Faz 2: Bileşen kütüphanesi

Tek oturumda bitmezse iki oturuma böl: önce bölüm 1–3, sonra 4–7.

```
design-handoff/design/COMPONENTS.md dosyasındaki bileşenleri sırayla yaz: önce Temel, sonra Butonlar ve kontroller, sonra Gezinme…
Her bileşen için:
- Ölçüleri COMPONENTS.md'den al. Emin olmadığın değeri design-handoff/design/kit/k.py ya da c.py içindeki ilgili fonksiyondan oku; tahmin etme.
- Değerler yalnızca tokens.ts'ten gelsin.
- Erişilebilirlik etiketlerini ve durumlarını ekle (CLAUDE.md'deki kurallar).
- Basma davranışı için tek bir PressableScale bileşeni kullan.

Sonra app/(dev)/design-system.tsx adında bir galeri ekranı yap. DS 2 (Kontroller), DS 3 (İçerik Kartları) ve DS 4 (Durumlar) panolarındaki örnekleri aynı sırayla ve tasarımdaki örnek metinlerle göster. Görseller için design-handoff/design/sample-art/ kullan.
Galerinin ekran görüntülerini al, design-handoff/design/reference/G-DS-2-Controls.png, G-DS-3-Cards.png ve G-DS-4-States.png ile karşılaştır. Farkları listele ve düzelt.
```

---

## Faz 3: Ekranlar (her ekran için ayrı oturum)

Sıra: 04 Ana Sayfa → 07 Oyun Detayı → 08 Fiyat Karşılaştırma → 10 Topluluk → kalan sekmeler (14, 18, 21) → diğerleri. Sekme çubuğu Faz 1'de hazır bağlanır; iOS ve Android'de DS 7 ile karşılaştır.

Her ekran için bu şablonu kullan. `[..]` yerlerini doldur:

```
Ekran: [04 Ana Sayfa] (design-handoff/design/source/[G-04-Home].dc.html)
Referans: design-handoff/design/reference/[G-04-Home].png
Açıklama: design-handoff/design/SCREENS.md içindeki "[04 · Ana Sayfa]" bölümü

Bu ekranı yeni tasarıma geçir:
1. Mevcut route'u ve veri akışını koru (docs/design-migration.md). Yalnızca görünümü Faz 2 bileşenleriyle yeniden kur.
2. Bölüm sırası, boşluklar ve metin stilleri .dc.html kaynağıyla birebir aynı olsun. Uzun listelerde FlatList ya da FlashList, yatay raylarda horizontal FlatList kullan (snap aralıkları COMPONENTS.md'de).
3. Tasarımda olup veride karşılığı olmayan alanlar için TODO bırak ve bana listele. Uydurma veri gösterme; gerekiyorsa mock kullan.
4. Bağlantılar: SCREENS.md'deki "Gittiği ekranlar" listesine göre router.push ekle.
5. Simülatörde (iPhone 16) ekran görüntüsü al. Uzun ekranları kaydırarak parça parça al. Referansla yan yana karşılaştır ve fark listesini yaz: boşluk, yazı, renk, köşe, hizalama. Fark kalmayana kadar düzelt.
6. npx tsc --noEmit temiz olsun. Commit at: "design-v2: [ekran adı]".
```

---

## Faz 4: Hareket ve dokunuş

```
design-handoff/design/reference/G-DS-5-Motion.png panosundaki mikro etkileşimleri uygula (tokens.ts → motion):
- Kalp / beğeni pop (240 ms) + expo-haptics hafif darbe
- Takip butonu renk geçişi (200 ms), Switch, Segmented kayması (250 ms)
- Fiyat düşüşü göstergesi (yalnızca ilk görünümde bir kez)
- İskelet yükleme (1,3 sn), canlı nokta nabzı (1,8 sn)
- Alt sayfa (250 ms + zemin karartması), yenilemek için çek (logo işareti)
- Video kartında uzun basınca sessiz önizleme
Reanimated kullan; yalnızca transform ve opaklık canlandır. useReducedMotion açıkken döngüleri ve pop animasyonunu kapat.
```

---

## Faz 5: Son kontrol

```
Tüm ekranlarda şunları kontrol et ve bulduklarını bir tablo olarak ver:
1. Dokunma alanları 44 pt'den küçük olan her şey
2. accessibilityLabel eksikleri (.dc.html içindeki aria-label'larla karşılaştır)
3. Yazı boyutu en büyükteyken taşma ya da kesilme (maxFontSizeMultiplier kuralı)
4. Kırmızının kurala aykırı kullanımı: birincil buton, fiyat, geniş alan
5. tokens.ts dışında kalan sabit renk ya da sayı
6. Android'de font ağırlıkları (fontFor) ve gölgeler
Sonra app/(dev) ekranlarını üretim derlemesinden çıkar.
```

---

## Faz 6: Yayın

```
eas build --platform ios --profile production --auto-submit ile derle ve TestFlight'a gönder.
Cihazda ana ekranı Özelleştir menüsünden Açık, Koyu ve Tonlu yaparak simgeyi kontrol et.
Android için: eas build --platform android --profile preview ile derleyip sekme çubuğunu gerçek cihazda dene.
```
