# Gamerisen 2.0: tasarımdan koda teslim paketi

Bu paket, Claude Design tuvalindeki "Gamerisen 2.0" tasarımını (25 ekran ve 7 tasarım sistemi panosu) Expo SDK 54 / React Native / expo-router uygulamasına **birebir** taşımak için hazırlandı.

Ölçü kuralı basit: tasarım 390 pt genişliğinde; tasarımdaki her px, React Native'de aynı sayıda pt'dir.

## İçindekiler

```
gamerisen-handoff/
├─ README.md                 ← bu dosya
├─ CLAUDE.md                 ← Claude Code kuralları (repo kökündeki CLAUDE.md'ye ekle)
├─ PROMPTS.md                ← faz faz yapıştırılacak Claude Code komutları
├─ code/                     ← hazır, tip kontrolünden geçmiş kod
│  ├─ theme/tokens.ts        renk, yazı, boşluk, köşe, gölge, degrade, hareket, sekme çubuğu
│  ├─ theme/index.ts
│  ├─ components/Icon.tsx    tasarımdaki 77 çizgi ikon + 4 dolgulu sekme ikonu
│  ├─ components/brand/Logo.tsx   Mark (koyu/açık zemin), Wordmark, Lockup
│  └─ components/navigation/TabBar.tsx   yalnızca ikon sekme çubuğu: iOS cam kapsül, Android Material 3
├─ assets/
│  ├─ app-icon/              iOS açık / koyu / tonlu (1024), Android ön plan + tek renk
│  ├─ splash/splash-icon.png yerel açılış ekranı işareti
│  ├─ logo/                  işaretin SVG'si ve 4096 px PNG'si (koyu ve açık zemin)
│  ├─ icon-composer/         iOS 26 Liquid Glass için katmanlar (R, G)
│  └─ tab-icons/             sekme ikonları, beyaz şablon PNG (@1x/@2x/@3x); NativeTabs kullanılırsa
├─ config/app.json.snippet.jsonc   simge ve splash ayarları
└─ design/
   ├─ SCREENS.md             ekran haritası: route, içerik, bileşenler, bağlantılar
   ├─ COMPONENTS.md          bileşen envanteri ve ölçüleri
   ├─ source/*.dc.html       her ekranın kaynağı; tüm ölçüler satır içi (doğruluk kaynağı)
   ├─ reference/*.png        her ekranın 2x görüntüsü (karşılaştırma için)
   ├─ kit/*.py               tasarımı üreten kod; her fonksiyon bir bileşen ya da ekran
   └─ sample-art/*.jpg       tasarımdaki örnek oyun görselleri (mock veri için)
```

## Nasıl ilerleriz

1. **Hazırlık:** klasörü reponun köküne `design-handoff/` olarak koy, `CLAUDE.md` içeriğini kök `CLAUDE.md`'ye ekle, `design-v2` dalını aç.
2. **Faz 0, keşif:** Claude Code mevcut ekranları tasarımla eşler ve bir geçiş planı yazar. Kod yazılmaz.
3. **Faz 1, temel:**
   - Değerler, ikonlar ve logo.
   - Fontlar (Android'de Inter).
   - Uygulama simgesi ve splash.
4. **Faz 2, bileşenler:** Tüm ortak bileşenler ve bunları gösteren bir galeri ekranı. Galeri DS panolarıyla karşılaştırılır.
5. **Faz 3, ekranlar:**
   - Sıra: Ana Sayfa → Oyun Detayı → Fiyat Karşılaştırma → Topluluk → diğerleri.
   - Her ekran ayrı bir oturumda yapılır, sonunda commit atılır.
   - Mevcut veri ve navigasyon korunur, sadece görünüm değişir.
6. **Faz 4, hareket:** Mikro etkileşimler ve dokunsal geri bildirim.
7. **Faz 5 ve 6:**
   - Erişilebilirlik ve kalite kontrolü.
   - TestFlight derlemesi.

Her fazın komutu `PROMPTS.md` içinde hazır.

## Bilmen gerekenler

- **Referans görüntüler** Inter yazı tipiyle üretildi ve harf aralığı SF Pro genişliğine yaklaştırıldı. Satır kırılımları iOS'tan birkaç yerde farklı olabilir. Ölçüde tereddüt olursa `.dc.html` kaynağı esastır.
- **Uzun ekranlarda** (Ana Sayfa 3824 pt, Oyun Detayı 3869 pt) tasarım tüm kaydırmayı tek parça gösterir. Sekme çubuğu tasarımda en altta durur, uygulamada ekrana sabitlenir.
- **Kırmızı:** `#BC0C0C` logo ve dolgu kırmızısı, `#F34545` metin ve ikon kırmızısıdır. Birincil butonlar nötr beyaz, fiyatlar yeşildir.
- **Simgeler:** `ios.icon` içinde açık, koyu ve tonlu ayrı tanımlanır; SDK 54 bunu ve Icon Composer `.icon` dosyasını destekler.
- **Sekme çubuğu:** yalnızca ikon ve platforma özel. iOS'ta yüzen cam kapsül (iOS 26'da gerçek Liquid Glass), Android'de Material 3 çubuk. Hazır bileşen: `TabBar.tsx`; tasarım: DS 7. Tuvalde sekmeli ekranların Tweaks panelinden platform değiştirilebilir. Alternatif olarak expo-router'ın NativeTabs'ı da kullanılabilir (etiket gizlenebilir); o durumda `assets/tab-icons/` PNG'leri kullanılır, ama mercek ve gösterge rengi sistemden gelir.
- **Tasarım tuvaliyle aynı:** Bu paket, tuvalin şu anki sürümüyle (sekme çubuğu güncellemesi dahil) eşleşir. Hazırlarken 5 taşma hatasını düzelttim: Giriş, Arama, Fiyat Karşılaştırma, Gönderi Oluştur ve Profili Düzenle ekranlarındaydı. DS 5'teki sekme demosunu da onardım. Tuvalde ileride değişiklik yaparsan paketi yeniden üretmek gerekir.
