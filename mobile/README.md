# Gamerisen — Mobil Uygulama (Expo / React Native)

Bu klasör, Gamerisen web sitesinin **native mobil uygulamasıdır** (iOS + Android).
Kendi backend'i **yoktur** — mevcut Next.js (Vercel) API'lerinizi tüketir. Yani
sunucu tarafını yeniden yazmıyoruz; sadece native bir arayüz ekliyoruz.

```
Next.js (Vercel)  ── /api/games, /api/trending, /api/card-price ...  (değişmedi)
       ▲
       │ fetch
Expo App (bu klasör)  ── native arayüz (iOS + Android)
```

## Teknoloji
- **Expo SDK 57** · React 19 · React Native 0.86 (New Architecture)
- **expo-router** — dosya tabanlı yönlendirme (Next.js App Router gibi, `app/` klasörü)
- **expo-image** — akıcı, önbellekli görseller · **expo-linear-gradient** · **@expo/vector-icons**

## Klasör yapısı
```
app/
  _layout.jsx           # kök stack + provider'lar
  (tabs)/
    _layout.jsx         # alt tab bar (Anasayfa / Oyunlar / Kütüphane / Profil)
    index.jsx           # Anasayfa (hero + trend)
    games.jsx           # Oyunlar — arama, bölüm & mod filtreleri, sonsuz scroll
    library.jsx         # (yer tutucu — sıradaki adım)
    profile.jsx         # (yer tutucu — sıradaki adım)
  game/[id].jsx         # Oyun detay
src/
  api/                  # API katmanı (client + endpoint'ler)
  context/              # LanguageContext (tr/en + ₺ fiyat biçimi)
  components/GameCard.jsx
  theme.js              # renkler (web ile uyumlu koyu tema)
```

## 1) API adresini ayarlayın (ZORUNLU)
`app.json` → `expo.extra.apiBase` değerini kendi adresinizle değiştirin:

```jsonc
"extra": {
  "apiBase": "https://alan-adiniz.vercel.app"   // ← canlı Vercel adresiniz
}
```

**Yerel test için** (telefonla bilgisayarınızdaki dev sunucusuna bağlanmak):
`localhost` telefonda çalışmaz — bilgisayarınızın LAN IP'sini kullanın:
```jsonc
"apiBase": "http://192.168.1.20:3000"
```
IP'yi `ipconfig` ile öğrenin, web tarafını `npm run dev` ile çalıştırın, telefon ve
bilgisayar aynı Wi‑Fi'de olsun. (Native uygulamada CORS sorunu olmaz.)

## 2) Çalıştırma
```bash
cd mobile
npm install          # (ilk kez)
npx expo start       # QR kod çıkar
```
Telefonunuza **Expo Go** uygulamasını kurun, QR kodu okutun → uygulama açılır.
Kod değişiklikleri anında yenilenir (Fast Refresh).

## 3) Mağazaya çıkarma (App Store + Play Store)
Expo'nun bulut derleyicisi **EAS Build** ile:
```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android        # .aab (Play Store)
eas build -p ios            # .ipa (App Store — Apple Developer hesabı gerekir)
eas submit -p android       # mağaza gönderimi
eas submit -p ios
```
> iOS derlemesi için Mac gerekmez (EAS bulutta derler), ama **Apple Developer**
> ($99/yıl) ve **Google Play Developer** ($25 tek sefer) hesapları gerekir.

## Sıradaki adımlar (yapılacaklar)
- [ ] **Kütüphane** ekranı (Steam/Xbox) — auth sonrası
- [ ] **Profil** ekranı
- [ ] **Steam/Xbox girişi** — `expo-web-browser` + deep link (`gamerisen://`) ile OAuth
- [ ] İstek listesi, oyun detay zenginleştirme (ekran görüntüleri, açıklama)
- [ ] Push bildirim (indirim uyarıları) — `expo-notifications`
- [ ] Liste performansı için `@shopify/flash-list`'e geçiş (opsiyonel)

## Notlar
- Bu klasör ana repo içinde ayrı bir uygulamadır; ana `npm run build` (web) bundan
  etkilenmez. `mobile/node_modules` git tarafından yok sayılır.
- Backend'de değişiklik gerekmez; herkese açık GET endpoint'leri (games, trending,
  card-price) auth istemez, mobil doğrudan çağırır.
