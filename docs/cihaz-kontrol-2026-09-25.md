# Cihaz kontrol listesi — 25 Eylül 2026

`design-v2` dalında 25 Eylül'de yapılan 2.0 geçişlerinin **hiçbiri cihazda
görülmedi**: her iş `npm run check` + `npx expo export` (iOS ve Android) ile
doğrulandı, ama o gün emülatör yoktu. Bu liste o açığı kapatmak için.

**Kapsam:** `0038131` (kart ailesi 3/4) → `ce6d6da` (EmptyState +
CollectionPicker), 12 commit. Ayrıntı ve gerekçeler
`docs/design-migration-progress.md`'de, aynı tarihli kayıtlarda.

## Başlamadan önce

- [ ] **Android SDK yerinde mi?** 25 Eylül'de `ANDROID_HOME`
  (`C:\Users\baymf\AppData\Local\Android\Sdk`) diskte YOKTU: `emulator` ve
  `adb` bulunamadı. Sanal cihaz tanımı duruyor (`~/.android/avd/Gamerisen_API36`).
  Android Studio → SDK Manager'dan SDK yeniden kurulunca aynı AVD açılmalı.
- [ ] Dal `design-v2`, son commit `ce6d6da` ya da sonrası.
- [ ] Her ekranı **koyu ve açık temada** gör (Ayarlar → Tema).
- [ ] Metin taşması için en az bir kez **Almanca** (en uzun çeviriler) —
  Ayarlar → Dil.
- [ ] Mümkünse bir kez **dar ekran** (iPhone SE / 375 pt ya da küçük Android).

İşaretleme: `[x]` geçti · sorun varsa satırın altına ne görüldüğünü yaz.

## Her ekranda ortak

- [ ] Üst çubuk (NavBar): geri oku solda, başlık ortada, geri çalışıyor.
- [ ] Kart yüzeyleri kenarlıksız, zeminden ayrışıyor (açık temada da).
- [ ] Android'de anahtarlar (Switch) kitin çizdiği 51×31 anahtar, Material değil.
- [ ] Sekme çubuğu olmayan ekranlarda liste sonunda gereksiz büyük boşluk yok.

## Giriş ve filtreler (gece yarısı commit'leri)

**Giriş — `account.jsx` (G-03)** · Profil → Giriş yap
- [ ] Logo, büyük başlık, alt metin; Apple (iOS) ve Google düğmeleri 50 pt.
- [ ] Sözleşme onayı sağlayıcı düğmelerinin ÜSTÜNDE; kayıtta onaysız Apple/Google açılmıyor.
- [ ] Ayrı alanlar; şifre göster/gizle; kullanıcı adı uygunluğu alanın altında.
- [ ] "Şifremi unuttum" sağa yaslı; en altta "Hesabın yok mu? Hesap oluştur".
- [ ] Kırmızı CTA (bilerek — kullanıcı kararı).

**Filtre sayfası — `FilterSheet` (G-06b)** · Oyunlar → Filtrele
- [ ] Alttan açılıyor, 24 köşe, tutamaç; "Sıfırla" solda, × sağda, başlık ortada.
- [ ] Almanca "Zurücksetzen" başlıkla çakışmıyor.
- [ ] Alt çubukta "Uygula (n)" 52 pt.

**Oyunlar sonuçları (G-06)** · Oyunlar
- [ ] "⚙ Filtrele ②" hapı bölüm çiplerinin başında, sayı rozeti doğru.
- [ ] Etkin filtre çipleri × ile kalkıyor.

**Kütüphane kutucukları (kart ailesi 3/4)** · Ayarlar → Kütüphane
- [ ] 3 sütun küçük kart; alt satır "134 sa · ₺1.299" (Steam), "1.250 G" (Xbox).
- [ ] Almanca/İspanyolca'da alt satır kesiliyor mu?
- [ ] Xbox'ta Game Pass etiketi kapak üstünde.

## Tasarım dışı ekranlar

**Arkadaşlar — Grup A (`6da0257`)**
- [ ] `friends` · Topluluk → sağ üst kişiler ikonu: "Arkadaşlar · n", arama,
  gelen istek bandı (yüz yığını + sayı rozeti, kırmızı zemin YOK).
- [ ] Satıra **uzun basma** → kişi menüsü açılıyor (profil / mesaj / çıkar / engelle / şikâyet).
- [ ] Geliştirici rozeti adın yanında; uzun adda ad kısalıyor, rozet kesilmiyor.
- [ ] `friend-requests` · istek bandına dokun: Kabul et / Yoksay eşit 44 pt; işlem sürerken yalnız o satır kilitli.
- [ ] `steam-friends` · Ayarlar → Steam arkadaşları: kart açılıp kapanıyor (ok 180° dönüyor), "46 sa".

**Hesap / ayar — Grup B (`ddaa05f`)**
- [ ] `social-settings` · Ayarlar → Gizlilik: dört satır ikon + açıklama + anahtar; anahtar anında dönüyor.
- [ ] Ayarlar → **Engellenenler**: sayfa engellenenler bölümüne kayarak açılıyor.
- [ ] Engellenen yokken "Engellenen kimse yok" satırı; varken "Engeli kaldır" 34 pt.
- [ ] (Ağ kapalıyken) "Gizlilik ayarların okunamadı" bandı + Tekrar dene; anahtarlar devre dışı.
- [ ] `username-setup` · kullanıcı adı olmayan hesapla profil: kontrol sürerken gösterge, sonuç alanın altında, "Devam et" yalnız uygunken.
- [ ] `delete-account` · Ayarlar → Hesabı sil: uyarı kartı kırmızı tonda (açık temada okunuyor mu?), şifre göster/gizle, silme düğmesi kırmızı tonlu.
- [ ] `auth` · Ayarlar → Steam bağla → dönüş: "bağlanıyor → bağlandı" ekranı, sonra profile yönlendirme.

**Koleksiyon / liste — Grup C (`df08571`)**
- [ ] `collections` · Ayarlar → Koleksiyonlar: satırlar 2×2 kapak mozaiği; uzun basma → sil onayı.
- [ ] Sağ üst **+** → ad penceresi: emoji seçimi (seçili kırmızı çerçeve), alan, Vazgeç / Oluştur; **klavye açıkken pencere görünüyor mu?**
- [ ] Boş koleksiyon listesinde öneri kartları çalışıyor.
- [ ] `collection/[id]`: başlık "emoji ad" + "n oyun"; sağ üstte paylaş + **⋯**.
- [ ] ⋯ → Yeniden adlandır / Sil / Vazgeç — **Android'de üç düğmenin sırası** doğru mu?
- [ ] `lists` · Ayarlar → Listeler: Popüler/Yeni segmenti; **seçili sekmeye tekrar basınca liste kaybolmuyor** (düzeltilen hata).
- [ ] Editör listesinde "EDİTÖR" rozeti; beğeni kalbi dolu/kırmızı.
- [ ] `list/[id]`: yüklenirken geri düğmesi var; ⋯ → sahipse yayından kaldır onayı, değilse Şikâyet et → şikâyet sayfası.

**İstatistik — Grup D (`0342425`)** · Ayarlar → İstatistikler
- [ ] Büyük sayı kartı, 2×2 kutular, tür çubukları, indirim satırları.
- [ ] Almanca "Spiele in deinen Listen" kutuda kesiliyor mu (özellikle dar ekran)?

**Swipe / oyun kartları / reels — Grup E (`07e195a`)**
- [ ] `swipe` · Ana sayfa selamlamasındaki "Senin için" bağlantısı: kartta tür etiketleri ve puan okunuyor.
- [ ] Sağa/sola kaydırırken "BEĞEN / GEÇ" damgaları; bırakınca kart uçuyor; geri al (sağ üst) çalışıyor, desteye dönüyor.
- [ ] Alt düğmeler: geç (kırmızı) · bilgi · beğen (yeşil).
- [ ] `game-cards` · Ayarlar → Oyun kartları: özet kartı; **şehir anahtarı** açınca şehir çözülüyor, kapatınca kalkıyor.
- [ ] Sıra satırlarında paylaş düğmesi; liste sonunda sekme boşluğu yok.
- [ ] `reels` · Videolar → Kısa Klipler: geri düğmesi cam daire; yan düğmeler cam daire.
- [ ] **Açık renkli sahnelerde** cam daireler seçilebiliyor mu?
- [ ] Takip / Kaydet etkinken ikon kırmızı ve dolu — videoda görünüyor mu?
- [ ] Duraklatınca ortada 2.0 oynat düğmesi; basılı tutunca arayüz soluyor.
- [ ] Yatay modda yan düğmeler küçük (34) ve satır hâlinde; döndürme düğmesi yerinde.

**Kütüphane gövdesi (`14839fa`)** · Ayarlar → Kütüphane
- [ ] Hesap bağlı değilken: ikon + başlık + Steam/Xbox bağlama satırları (Ayarlar'la aynı).
- [ ] Profil yokken yalnız "Profil oluştur" düğmesi.
- [ ] Kaynak çipleri (Genel · Steam · Xbox); seçili çip dolu.
- [ ] Genel görünümde avatar yığını (halkalı); Steam kartında 4 hücre sığıyor mu (değer sütunu)?
- [ ] Arama kutusu + temizle; sıralama segmenti + sağda sayı.

## Ortak bileşenler (`ce6d6da`)

**Boş durum — `EmptyState` (19 ekran)**. Örnekler: boş koleksiyon
(koleksiyon detayı), oturumsuz Mesajlar, arama sonucu yok (Kütüphane'de
anlamsız bir arama), İstatistikler (yeni hesap).
- [ ] 84'lük ikon kutusu + başlık + açıklama + 260 pt nötr düğme.
- [ ] **Dar ekranda / klavye açıkken** taşma yok.
- [ ] Nötr (kırmızı olmayan) düğme yeterince çağırıcı mı? — tasarım kararı, not al.
- [ ] Liste içi kısa boy (ör. profilde boş sekme, Kütüphane'de sonuç yok) sıkışmıyor.
- [ ] İkonlar anlamlı: çevrimdışı → wifi yok, hesap gerekli → kişi+, kilitli → kilit.

**Koleksiyon seçici — `CollectionPicker`** · Oyun detayı → koleksiyona ekle; Reels → Kaydet
- [ ] Alttan açılıyor, tutamaç; koleksiyonlar tek kutuda; seçim dairesi dokununca kırmızı + tik.
- [ ] "Yeni koleksiyon" → alan + Oluştur; oluşturunca oyun yeni koleksiyona ekleniyor.
- [ ] Klavye açıkken alan ve düğme görünüyor.
- [ ] Alt kenarda "Kaydet" güvenli alanın üstünde.

## Bulunan sorunlar

(Kontrol sırasında buraya: ekran · tema · dil · ne görüldü · ekran görüntüsü yolu.)
