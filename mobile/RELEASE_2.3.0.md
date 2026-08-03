# 2.3.0 — App Store Connect metinleri

Kopyala-yapıştır içindir. İlgili alanlara olduğu gibi yapıştırın.

> 2.2.0 için hazırlanan metinler `RELEASE_2.2.0.md` içinde duruyor.
> 2.2.0 App Store'a **gönderilmediyse** bu dosyayı kullanın; gönderildiyse
> 2.3.0 yeni bir sürüm girdisi olarak açılmalı.

---

## What's New in This Version — Türkçe

```
Yenilenen arayüz
Uygulamayı baştan sona sadeleştirdik. Daha az renk gürültüsü, daha net
başlıklar, uzun kullanımda yormayan bir düzen.

Yeni profil
Koleksiyonlar, arkadaşlar ve bağlı hesaplar artık anlamlı gruplarda.
Profilinizde kullanıcı adınız ve içerik sayılarınız görünüyor.

Videolarda yatay mod
Sağ üstteki simgeyle ekranı yatay çevirip videoları tam genişlikte
izleyebilirsiniz. Ekrana basılı tutunca arayüz kaybolur, sadece video kalır;
tek dokunuş duraklatır.

Topluluk listeleri
Gamerisen editör listeleri eklendi: co-op oyunlar, hikâye odaklı yapımlar,
bağımsız başyapıtlar ve daha fazlası.

Kolay gezinme
Sekme simgesine tekrar dokunmak sayfayı başa sarar. Videolarda ise akışı
yeniler.

Düzeltmeler
• İstek listenizdeki indirimli oyunlar artık widget'ta görünüyor
• Oyun sayfaları veri sağlayıcısı yanıt vermediğinde de açılıyor
• Koleksiyonların kaybolmasına yol açan hata giderildi
• Video sekmesinden çıkınca ses kesiliyor
```

## What's New in This Version — English

```
Redesigned interface
We simplified the app throughout. Less colour noise, clearer headings, and a
layout that holds up over long sessions.

New profile
Collections, friends and connected accounts are now in meaningful groups.
Your username and content counts are visible on your profile.

Landscape mode for videos
Tap the icon in the top corner to rotate and watch full width. Press and hold
to hide the interface and see only the video; a single tap pauses.

Community lists
Added Gamerisen editors' lists: co-op games, story-driven titles, indie
masterpieces and more.

Easier navigation
Tap a tab icon again to scroll back to the top — or refresh the feed on the
videos tab.

Fixes
• Discounted games in your follow list now appear in the widget
• Game pages open even when the data provider is unavailable
• Fixed collections disappearing
• Audio stops when you leave the videos tab
```

---

## App Review Information → Notes

`RELEASE_2.2.0.md` içindeki metin geçerliliğini koruyor; yalnızca sürüm
numarasını 2.3.0 olarak değiştirin. Ek olarak şu iki maddeyi listeye ekleyin:

```
12. Landscape video mode — the video feed can be rotated to landscape from an
    in-app control; the rest of the app stays locked to portrait.
13. Editors' lists — curated game lists published by us (clearly labelled
    "EDITORS"), not user-generated content.
```

---

## Demo hesabı — değişmedi, hâlâ kritik

Koleksiyonlar, istek listesi, haftalık rapor ve Steam/Xbox bağlama profil
arkasında. Boş bir demo hesabı, hiç hesap vermemek kadar riskli.

Hesabın hazır olması gerekenler:
- Kullanıcı adı alınmış (yeni profil ekranı bunu gösteriyor)
- En az bir koleksiyon
- İstek listesinde **indirimde olan** birkaç oyun (widget'ı da doğrular)
- Mümkünse bağlı bir Steam hesabı

---

## Bu sürümde native taraf DEĞİŞTİ

2.2.0'dan farklı olarak:
- `expo-screen-orientation` eklendi
- `app.json` → `orientation: "default"`, `ios.requireFullScreen: true`

Yani OTA ile gönderilemez, build zorunlu. Uygulama açılışta dikeye
kilitleniyor; yalnızca video ekranı geçici olarak yatayı açıyor.

---

## Göndermeden önce

1. **Mağaza görselleri güncellenmeli.** Mevcut ekran görüntüleri v1 arayüzünü
   gösteriyor ve arayüz o zamandan beri iki kez değişti. 4.2.2 reddi almış bir
   uygulama için bu, listeleme sayfasında verilen ilk izlenim.
2. **App Privacy** — sosyal özelliklerle kullanıcı adı, arkadaş listesi ve
   etkinlik verisi toplanıyor.
3. **Cihazda doğrulama** — yön kilidi (video ekranından çıkınca dikeye dönmeli),
   sekme çubuğunun geri gelmesi, widget.
