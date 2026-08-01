# Liquid Glass ikon — durum ve yapılacaklar

## Önce işin gerçeği

Liquid Glass ikonlarda parlama, kırılma ve saydamlığı **siz çizmiyorsunuz —
sistem uyguluyor.** Apple'ın kendi metni (HIG, *App icons*):

> "iOS, iPadOS, macOS ve watchOS uygulama ikonları bir arka plan katmanı ve bir
> ya da daha fazla ön plan katmanı içerir… Bu ikonlar **specular highlight,
> refraction ve translucency gibi Liquid Glass niteliklerini alır**. Bu efektler
> ikonun boyutuna göre otomatik uyarlanır."

Bunun iki sonucu var:

**1. PNG'ye elle cam efekti çizmek YANLIŞ olur.** iOS 26 kendi cam katmanını
zaten üste uyguluyor. Altta sahte parlama varsa iki efekt üst üste biner ve ikon
bozuk görünür. Bu yüzden ürettiğim katmanlarda bilinçli olarak **hiç efekt yok**
— düz renk ve düz şekil.

**2. Gerçek Liquid Glass ikon `.icon` paketi gerektiriyor.** Bunu üreten araç
**Icon Composer** ve Xcode ile geliyor, yani **yalnızca macOS'ta çalışıyor.**
Windows'tan üretilemez. Uydurmaya çalışmak, doğrulanamayan bir paket formatı
elle yazmak demek olurdu; bozuk çıkarsa ancak 30 dakikalık EAS build sonunda
anlaşılırdı.

## Şu an yapılmış olanlar

| Dosya | Ne işe yarıyor |
|---|---|
| `assets/icon-layers/foreground.png` | Logo işareti, saydam zemin, 1024×1024 — Icon Composer'a verilecek ön plan katmanı |
| `assets/icon-layers/background.png` | Düz marka zemini — arka plan katmanı |
| `assets/icon-tinted.png` | Gri tonlamalı sürüm — iOS'un "tinted" görünümü için |

`app.json` içinde görünüm varyantları bağlandı:

```json
"ios": {
  "icon": {
    "light":  "./assets/icon.png",
    "dark":   "./assets/icon.png",
    "tinted": "./assets/icon-tinted.png"
  }
}
```

Tinted varyantı gerçek bir kazanım: sistem o modda ikonu tek renge indirgiyor ve
gri tonlamalı kaynak verilmezse koyu kırmızıyla siyahı ayırt edemiyor.

Katmanları çıkarırken iki tuzağa dikkat edildi (`scripts/make-icon-layers.mjs`):
alfa için parlaklık yerine **en yüksek kanal** kullanıldı (parlaklık kullanılsa
kırmızı yarı saydam kalıp soluk pembeye dönüyordu) ve kenarlardaki siyah
harmanlaması **geri alındı** (yoksa kenarlar kirli kalıyordu).

## Mac'te yapılacak (5 dakikalık iş)

1. Xcode 26 kurulu bir Mac'te **Icon Composer**'ı aç.
2. Yeni ikon oluştur, `assets/icon-layers/foreground.png` dosyasını ön plan
   katmanı olarak içe aktar.
3. Arka plan katmanını siyah yap (ya da `background.png` dosyasını kullan).
4. Ön plan yerleşimini ayarla — Apple ızgarasında kenarlardan içeri boşluk kalsın.
5. Specular highlight / refraction ayarlarını Icon Composer'ın önerdiği gibi bırak;
   **elle abartma**, sistem zaten uyguluyor.
6. Dark ve mono (tinted) varyantlarını Icon Composer içinden işaretle.
7. `Gamerisen.icon` olarak dışa aktar, `mobile/assets/` içine koy.
8. `app.json`'da `ios.icon` alanını tek satıra çevir:

```json
"ios": {
  "icon": "./assets/Gamerisen.icon"
}
```

(SDK 54 ve sonrası `.icon` klasörünü doğrudan destekliyor — Expo dokümanında
açıkça yazıyor.)

## Uyarı

`.icon` geldiğinde yukarıdaki `light/dark/tinted` nesnesi **silinmeli**, tek
string ile değiştirilmeli. İkisi birlikte bırakılırsa hangisinin kazanacağı
belirsiz olur.
