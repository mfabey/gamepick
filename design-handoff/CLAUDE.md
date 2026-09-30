# Gamerisen — tasarımı koda geçirme kuralları

> Bu dosyayı reponun kökündeki `CLAUDE.md` dosyasına ekle (varsa altına yapıştır). Claude Code her oturumda okur.

Uygulama: Expo SDK 54, React Native, expo-router. Arayüz, `design-handoff/` klasöründeki Gamerisen 2.0 tasarımının **birebir** karşılığı olacak.

## Doğruluk kaynağı (öncelik sırasıyla)

1. `design-handoff/design/source/*.dc.html`: her ekranın kaynağı. Tüm ölçüler satır içi `style` olarak yazılı. Bir değer konusunda şüphen varsa buraya bak; tahmin etme.
2. `design-handoff/design/reference/*.png`: aynı ekranların 2x görüntüsü (780 px = 390 pt). Görsel karşılaştırma için. DS 1–6 panoları 1x, DS 7 2x.
3. `design-handoff/design/kit/*.py`: tasarımı üreten kod. Her fonksiyon bir bileşen (`c.py`, `k.py`) ya da bir ekran (`s1.py`–`s4.py`). Bileşen ölçülerinin en derli toplu hâli burada.
4. `design-handoff/design/COMPONENTS.md` ve `SCREENS.md`: bileşen envanteri ve ekran haritası.

## Ölçü kuralı

- Tasarım 390 pt genişliğinde. **Tasarımdaki px = RN'de pt.** Ölçeklendirme yok, `PixelRatio`/`scale()` yok.
- iPhone 15/16'da genişlik 393 pt; aradaki fark esnek yerleşimle karşılanır. Sabit genişlikli kartlar (148, 264, 300, 334…) aynı kalır.
- Üst güvenli alan tasarımda 54, alt güvenli alan 34. Kodda sabit sayı yerine `useSafeAreaInsets()` kullan; tasarımdaki 54/34 bu değerlere karşılık gelir.
- Sekme çubuğu: iOS'ta 62 pt kapsül, alttan (güvenli alan − 13); Android'de 64 + sistem alanı. Uzun ekranlarda tasarımda en altta görünen sekme çubuğu, uygulamada ekrana sabittir.

## Değerler

- Renk, yazı, boşluk, köşe, gölge, degrade ve hareket değerlerinin **hepsi** `theme/tokens.ts` içinden gelir. Bileşen içinde hex, rgba ya da rastgele sayı yazma. Tasarımda token'da olmayan bir değer görürsen önce `tokens.ts`'e ekle.
- Gölge: RN'in `boxShadow` stili (CSS dizesi) ile, `shadow.*` değerlerinden.
- Degrade: `expo-linear-gradient` + `gradients.*`.
- Cam: `expo-blur` (`tint="dark"`) + üstüne `colors.darkGlass` / `colors.tabBar` katmanı.
- Görsel: `expo-image`. `contentFit="cover"`, tasarımdaki `object-position` → `contentPosition`.
- İkonlar yalnızca `components/Icon.tsx` (`<Icon name=… />`, `<TabIcon />`). Başka ikon kütüphanesi kullanma. Eksik ikon varsa aynı 24×24 çizgi stilinde ekle.
- Logo yalnızca `components/brand/Logo.tsx` (`<Mark />`, `<Wordmark />`, `<Lockup />`).
- Sekme çubuğu yalnızca `components/navigation/TabBar.tsx` (`GamerisenTabBar`). **Etiket yok, sadece ikon.** iOS'ta yüzen cam kapsül, Android'de Material 3 çubuk. Sekme ekranlarında içeriğin alt boşluğu `useTabBarInset()` ile verilir; iOS'ta içerik kapsülün altından akar.

## Marka kırmızısı: baskın değil, işaretleyici

- **Kırmızı kullanılan yerler:** logo ve "risen", seçili sekme, okunmamış rozeti ve noktası, canlı ve son dakika, kalp ve istek listesi, metin bağlantısı ve odak halkası.
- **Kırmızı kullanılmayan yerler:**
  - Birincil butonlar: nötr beyaz `#F5F5F7`, üstünde siyah metin.
  - Fiyat ve indirim: yeşil.
  - Kart ve sayfa zeminleri, geniş alanlar ve degradeler.
- Metin/ikon kırmızısı `colors.red` (`#F34545`), dolgu kırmızısı `colors.brand` (`#BC0C0C`).

## Etkileşim ve erişilebilirlik

- Dokunulabilir her şey en az 44×44 pt (`hitSlop` kullanılabilir).
- Basma durumu: `scale 0.97 + opacity 0.9`, 150 ms (`motion.press`). Reanimated ile, tek bir `PressableScale` bileşeni üzerinden.
- Geçişler 150–250 ms; kalp ve beğeni "pop" 240 ms (`motion.pop`). Yalnızca transform ve opaklık canlandır; düzen kaymasın.
- "Hareketi azalt" açıksa (`useReducedMotion`) döngüler ve pop animasyonu çalışmaz.
- `.dc.html` içindeki her `aria-label` → `accessibilityLabel`; `aria-pressed`/`aria-selected`/`role="switch"` → `accessibilityState` / `accessibilityRole`.
- Dinamik yazı boyutu: gövde metinlerinde `maxFontSizeMultiplier={1.3}`; rozetlerde, sekme etiket balonunda ve fiyat etiketlerinde `allowFontScaling={false}`.
- Tasarımdaki satır sınırı (`c1`/`c2` sınıfları) → `numberOfLines={1|2}`.

## Çalışma biçimi

- **Mevcut ekranların veri, navigasyon ve iş mantığını koru.** Yalnızca görünümü yeni bileşenlerle değiştir. Route adlarını gereksiz yere değiştirme.
- Bir oturumda tek ekran ya da tek bileşen grubu yap. Her ekrandan sonra commit at.
- Her ekranı bitirince iOS simülatöründe (iPhone 16) ekran görüntüsü al: `xcrun simctl io booted screenshot /tmp/<ekran>.png`. Sonra `design/reference/<ekran>.png` ile yan yana karşılaştır ve farkları listele. Fark kalmayana kadar düzelt.
- Uzun ekranlar (Ana Sayfa, Oyun Detayı) için ekranı kaydırıp parça parça karşılaştır.
- Referans görüntülerdeki sekme çubuğu iOS görünümüdür. Android'de sekme çubuğunu `design/reference/G-DS-7-TabBar.png` ile karşılaştır.
- Tasarımdaki içerik örnek veridir. Gerçek veri API'den gelir. Veri henüz yoksa `design/sample-art/` görselleri ve tasarımdaki metinlerle mock oluştur.
