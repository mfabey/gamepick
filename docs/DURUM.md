# Durum ve açık maddeler

**Son güncelleme:** 4 Ağustos 2026
**Mobil sürüm:** 2.3.0 (App Store'a gönderildi)

Yeni bir oturuma başlarken bu dosyayı ve `CLAUDE.md`'yi oku. Karar
gerekçelerinin ayrıntısı commit mesajlarında — `git log` gerçek bir kaynak,
son 30 commit'te 496 satır açıklama var.

---

## Nerede duruyoruz

**Mobil (Expo SDK 54, `mobile/`)** — 2.3.0 App Store incelemesinde. Native
tarafta `expo-screen-orientation` var ve `app.json` `orientation: "default"`;
uygulama açılışta dikeye kilitleniyor, yalnızca video ekranı geçici olarak
yatayı açıyor.

`runtimeVersion` politikası `appVersion`. Yani sürümü yükseltmek OTA erişimini
kesiyor — 2.3.0 kurulumlarına ancak 2.3.0 çalışma zamanlı OTA ulaşır.

**Web (Next.js 14, kök dizin)** — Vercel, `main` dalından otomatik deploy.

---

## Devam eden tasarım işi

Sadeleştirme turu tamamlandı (dört adım). Ölçülen sonuç:

| | Önce | Sonra |
|---|---|---|
| Ham `fontSize` | 250 | 0 |
| Tipografi belirteci | 7 | 257 |
| Vurgu rengi kullanımı | 150 | 125 |

Taslak: https://claude.ai/code/artifact/65fc45fc-ee2e-42f7-9415-c9ccc52a7646

İlkeler: ekran başına tek vurgu · seçimi renkle değil ağırlıkla göstermek ·
çizgi yerine boşlukla ayırmak · ölçeği zorunlu kılmak.

`src/theme.js` içindeki belirteçler: `PRESSED_CARD` (kart basma tepkisi),
`NUMERIC` (tablo rakamları), `motion` (süre birliği). Yeni kod ham sayı
yazmamalı.

### 4 Ağustos turu — cihazda denetim

İlk kez simülatörde gezilerek yapıldı (bkz. Ortam notu). Yedi ekran, ölçümlü.

| | 3 Ağu | 4 Ağu |
|---|---|---|
| Vurgu rengi kullanımı | 125 | **109** |
| Ham hex (theme.js dışı) | — | **102** |
| Metacritic eşik kuralı kopyası | 3 | **1** |
| Seçimi vurgu rengiyle gösteren yer | 8 | 2 (yalnız radyo/onay kutusu) |

Ekran başına eşzamanlı kırmızı: haberler 8→2, ana sayfa 7→3, oyunlar 5→3.

**En önemli bulgu:** kod sayımı ekrandaki yoğunluğu **olduğundan az
gösteriyor**. Tek satır kod liste öğesi başına yeniden çiziliyor —
haberlerde dört haberin dördü de kırmızı "ENDÜSTRI" taşıyordu. Doğru soru
"kaç kullanım" değil, "ekranda eşzamanlı kaç vurgu".

**Kurulan iki kural:**
1. *Renk değere bağlıysa kalır, sabit etiketse nötrleşir.* Kodda karşılığı:
   `theme.js` → `scale` grubu + `metacriticColor()`. Metacritic ve yorum
   oranı renkli kalır; tür etiketi, kategori, "Tümü ›" nötrdür.
2. *Seçim dolu nötr yüzey + koyu metin + ağırlıkla gösterilir.*
   `colors.text` zemin, `colors.bg` metin. Altı yerde tek dile indi.
   İstisna bilinçli: radyo ve onay kutusu (form denetimi) vurgu rengini
   korur.

**Kenar sönümlemesi** (`src/components/EdgeFade.jsx`): içerik ekran
kenarında zemine karışıyor. Bu **blur değil**, sönümleme — gerçek optik blur
`expo-blur` + maskeleme ister, ikisi de native bağımlılık, ikisi de OTA
yolunu kapatır. Yerleşim ekran başına değişir: bant ya opak bir şeyin altına
ya boşluğa konur, **asla doğrudan içeriğin üstüne**. Ana sayfada üst bant
bilerek yok (başlık üst kenarda başlıyor, bandın altında okunmaz hâle
geliyordu).

**Kalan:** yığın ekranlarına (~18 sayfa) sönümleme uygulanmadı. `#fff`
denetimi yarım — 102'nin ~80'i beyaz/siyah ve **çoğu meşru** (vurgu zemini
üstünde metin, kapak görseli üstünde metin). Kör kodmod görünümü bozar.
`#00d26e` ile `#4ade80` aynı kavram için iki farklı yeşil.

### Ölçüm yöntemi — dikkat

Bu turda üç kez yanlış sayı raporlandı, üçü de `grep`'e doğrulamadan
güvenmekten kaynaklandı:

- `grep -h` dosya adını sildiği için `| grep -v theme.js` hiçbir şeyi
  elemiyor; theme.js kendi tanımlarını saymış oluyor
- Yalnız tek tırnak arayan desen JSX prop'larını (`color="#fff"`) kaçırıyor
- Yanlış dizinde koşan komut `src/` klasörünü hiç görmeden "temiz" diyor

Ham hex için doğrusu:
```
grep -rEo "['\"]#[0-9a-fA-F]{3,8}['\"]" app src --include='*.jsx' \
  | grep -v '^src/theme.js:' | wc -l
```
Bir sayıyı rapora ya da commit mesajına yazmadan önce ikinci bir yöntemle
doğrula.

### Tekrar eden hata sınıfı — SafeAreaView + mutlak konum

Bugün **üç ayrı örneği** bulundu ve düzeltildi. Yoga'da mutlak konumlu çocuk
`top: 0` derken ebeveynin `paddingTop`'unu yok sayar; `SafeAreaView` ise
güvenli alanı tam olarak `paddingTop` ile uygular. Sıra yanlışsa öğe durum
çubuğunun altına girer.

- `games.jsx` başlığı saatin üstüne biniyordu
- `videos.jsx` döndürme düğmesi pilin üstündeydi — üstelik iOS'un "başa sar"
  hareketi dokunuşu yutuyordu, düğme hiç çalışmıyordu
- `videos.jsx` yatayda bilgi bloğu çentiğin altında kırpılıyordu

**Doğru desen:** mutlak konum DIŞA, `SafeAreaView` İÇE. `videos.jsx:356` bunu
gösteriyor. Yeni katlanır başlık yazarken oradan kopyala.

---

## Açık maddeler

### 1. Kimlik alanı çakışması — ZAMANLA BÜYÜYEN HATA

Kod tabanı tek bir `rawg_` öneki kullanıyor ama onu **iki uyumsuz sayı
uzayından** besliyor:

| Kaynak | GTA V kimliği |
|---|---|
| RAWG | `rawg_3498` |
| Steam yedeği | `rawg_271590` (Steam appid) |

RAWG ayaktayken görünmüyor. Çöktüğünde bütün uçlar Steam yedeğine düşüyor ve
kimlikler değişiyor → istek listesi, koleksiyon üyeliği, "sahipsin" rozeti
eşleşmiyor; aynı oyun koleksiyona iki kez eklenebiliyor.

Ayrıntı ve çözüm seçenekleri: `docs/VERI-KAYNAGI-GECISI.md`

### 2. RAWG geçişi — planlandı, ertelendi

RAWG'dan Steam + ITAD'a geçiş kararı alındı, App Store gönderimi öncelikli
olduğu için sonraya bırakıldı. Plan, ölçümler ve fazlar:
`docs/VERI-KAYNAGI-GECISI.md`

**Not:** RAWG 3 Ağustos'ta çöktü (Cloudflare 522, ~20 sn askıda) ve **4
Ağustos akşamı hâlâ çökük — ikinci gün**. Ölçüm:

```
api.rawg.io            yanıt yok (15 sn zaman aşımı)
store.steampowered.com HTTP 200
api.isthereanydeal.com HTTP 302
```

Kontrol testi ağın bizde olmadığını gösteriyor; sorun RAWG tarafında.
Uygulama `app/lib/rawg-fetch.js`'teki zaman aşımı + devre kesici sayesinde
Steam verisiyle ayakta — 4 Ağustos'ta simülatörde tüm listeler doldu, yani
yedek yol gerçekten çalışıyor.

**Bu, geçişi ertelemenin bedelini gösteriyor:** iki gündür tek bir sağlayıcının
çökük olması uygulamayı yedek yolda tutuyor ve o yedek yol 1. maddedeki kimlik
çakışmasını tetikleyen şey.

### 3. Google ile giriş — yarım

- **Site:** hazır (`app/components/GoogleSignInButton.jsx`,
  `app/api/auth/google-signin/route.js`). `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  Vercel'e eklenmeden buton kendini gizliyor.
- **Mobil:** hiç yok. `expo-auth-session` gerekiyor → native bağımlılık →
  yeni build.

Gereken: Firebase Console'da Google sağlayıcısını etkinleştirmek, Web ve iOS
istemci kimliklerini almak.

### 4. `/api/epic` bozuk

Boş dönüyor, Epic GraphQL çağrısı çalışmıyor. RAWG'dan bağımsız, ayrı arıza.

### 5. Mağaza görselleri eski — ARTIK ÜRETİLEBİLİR

Ekran görüntüleri v1 arayüzünü gösteriyor; arayüz o zamandan beri **üç kez**
değişti (sonuncusu 4 Ağustos). Guideline 4.2.2 reddi almış bir uygulama için
listeleme sayfasındaki ilk izlenim bu.

Değişen şey: simülatör artık çalışıyor, yani görseller üretilebilir. Bu
maddenin önündeki teknik engel kalktı.

### 6. Cihazda doğrulama — kısmen yapıldı

4 Ağustos'ta ilk kez simülatörde (iPhone 17 Pro / iOS 26.5, Release derlemesi)
gezildi.

**Görüldü:** onboarding · ana sayfa · oyunlar · haberler · profil · oyun
detayı · reels (dikey **ve yatay**) · katlanır başlığın açık/kapalı hâli ·
yön geçişi dikey→yatay→dikey.

**Hâlâ görülmedi:**
- **Widget ve Share Extension** — hedefleri derleniyor (`GamerisenWidget`,
  `GamerisenShare`) ama kurulup çalıştırılmadı. Apple itiraz metninde "native
  işlevsellik" kanıtı olarak sayılıyorlar, öncelikli.
- Sekme çubuğunun basılı tutma sonrası geri gelmesi
- **Hesap arkasındaki her şey:** sosyal akış, kütüphane çipleri, topluluk
  listeleri sekmeleri, reels "Takip/Kaydet" aktif hâli. Bu ekranlara yapılan
  renk değişiklikleri kod olarak diğerleriyle aynı desende ama **gözle teyit
  edilmedi**. Bir demo hesabı bunların hepsini tek turda kapatır — Apple
  gönderimi için zaten gerekiyor (aşağıya bak).

---

## Apple gönderimi

- İtiraz metni: `mobile/APPEAL_4.2.2.md` (2.2.0 için yazıldı, 2.3.0'da iki
  madde eklenmeli — bkz. `RELEASE_2.3.0.md`)
- Sürüm notları: `mobile/RELEASE_2.3.0.md` (TR + EN, kopyala-yapıştır)

**Demo hesabı kritik:** koleksiyonlar, istek listesi, rapor ve Steam/Xbox
bağlama profil arkasında. Boş bir demo hesabı, hiç hesap vermemek kadar
riskli — incelemeci giriş yapar ama yine boş ekran görür.

**Bilinen risk (Guideline 5.1.1v):** koleksiyon ve istek listesi tamamen
cihazda çalışıyor ama profil arkasında kilitli. Apple hesap gerektirmeyen
özellikler için kayıt zorunluluğuna itiraz edebiliyor. Ret gelirse çözüm tek
satır: o iki karonun kilidini açıp Steam/Xbox bağlamayı kilitli bırakmak.

---

## Ortam notu

### macOS (4 Ağustos'tan beri)

iOS simülatörü bu makinede çalışıyor. Kurulan zincir:

| Bileşen | Sürüm |
|---|---|
| Xcode | 26.6 · iOS 26.5 runtime |
| Node | 22.23.2 (nodejs.org `.pkg`) |
| Homebrew | 6.0.15 |
| CocoaPods | 1.17.0 (`brew install cocoapods`) |

**Sistem Ruby'siyle CocoaPods kurulamaz** — macOS'unki 2.6, CocoaPods ≥3.0
istiyor (`ffi` bağımlılığı). Homebrew'unki kendi Ruby'siyle geldiği için tek
makul yol o.

Bu proje `ios/` klasörünü repoda tutmuyor (CNG, `.gitignore:48`) ve widget +
share-extension native eklentileri var → **Expo Go ile açılmıyor**, gerçek
derleme gerekiyor:

```bash
cd mobile && npm install
npx expo prebuild -p ios --no-install
cd ios && pod install
```

İlk derleme ~13 dk, sonrakiler ~30 sn.

**Tuzaklar:**
- `pod install` `LANG` boşken `Encoding::CompatibilityError` veriyor.
  `LANG=en_US.UTF-8` ile çalıştır.
- `xcode-select -p` doğru yolu yazdırsa bile seçim yapılmamış olabilir:
  `/var/db/xcode_select_link` yoksa değer geri düşüşle geliyor demektir.
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` gerekiyor.

### Windows

DNS zehirlenmesi o makinede tekrarlıyordu: `git push` ya da `expo` komutları
`SEC_E_WRONG_PRINCIPAL` benzeri TLS hatası verirse DNS önbelleğini temizleyip
tekrar dene (`ipconfig /flushdns`). Kod sorunu değil.
