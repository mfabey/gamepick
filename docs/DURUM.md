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

### Widget — tema ve görseller (4 Ağustos)

**Tema saptı, düzeltildi.** Widget kendi paletini (`AppColors`) taşıyor ve
`withIosWidget.js` Swift dosyasını olduğu gibi kopyaladığı için senkronu
koruyan mekanizma yok. Vurgu kehribar (`#e0a72e`) kalmıştı, uygulama
kırmızıya (`#e8242b`) geçtiği hâlde. Tüm değerler `theme.js` ile hizalandı,
`accentText` eklendi (marka kırmızısı metin olarak 4.5:1'in altında).
**theme.js'te renk değiştirirsen widget'taki paleti de değiştir.**

**Görseller eklendi.** Sorun "gözükmüyor" değildi — veri modelinde görsel
alanı hiç yoktu, widget sadece SF Symbol çiziyordu.

WidgetKit render sırasında ağdan görsel çekemez; uygulama indirip **bayt
olarak** geçirmeli. Mevcut `setWidgetData(key, string)` kanalı base64 ile
kullanıldı — native modüle dokunmaya gerek kalmadı.
`src/utils/widgetImage.js` saf JS (fetch + blob + FileReader), yeni bağımlılık
yok. Boyutlar: fırsat için `header` 460×215, istek listesi için `capsule`
231×87. Tavan 90 KB ham (base64 ~%33 şişiriyor).

Ölçüldü (ekran görüntüsü değil, App Group plist'i):
`gamerisen_deal.image` = 65.688 karakter base64, `/9j/4AAQ...` → JPEG imzası.
Yani yazma tarafı çalışıyor. **Widget'ın kapağı ÇİZDİĞİ görsel olarak teyit
edilmedi** — fırsat widget'ı ana ekranda ekli değildi.

**Açık kalan:** `gamerisen_wishlist` = `[]`. İstek listesine indirimli bir
oyun (GTA V, -%50) eklendiği hâlde filtreden geçen öğe yok. Muhtemelen detay
ekranından eklenen kaydın `appid`'i eksik ve fiyat eşleşmiyor —
`WishlistContext.jsx:33-60`'ta bunun için tamamlama mekanizması var, ya
koşmadı ya çalışmıyor. Görsellerle ilgisi yok, ayrı iş.

**OTA notu:** widget uzantısı native. Bu iki değişiklik (tema + görseller)
OTA ile gidemez, yeni binary gerektirir. Bugünkü diğer her şey saf JS'ti.

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

### 0. Hesap verisi cihaza bağlı — VERİ KARIŞMASI (EN ÖNCELİKLİ)

4 Ağustos'ta bulundu. Ekranda sızıntı değil, **sunucuda kalıcı karışma**.

**5 Ağustos: 1. adım (akış düzeltmesi) YAPILDI — aşağıda "Yapılan" bölümü.
Kalan: sunucudaki kirli kayıtların sıfırlanması.**

**Ölçülen mimari:**

Tablo ilk yazıldığında eksikti: kapsamsız anahtar 4 değil **9**, sunucuya giden
depo 2 değil **3** — zevk profili de `PUT /api/user/data` gövdesinde gidiyor ve
sunucu tür ağırlıklarını **topluyor** (`route.js:113`), yani A'nın zevki B'nin
önerilerine karışıyordu.

| Depo | Anahtar | Kapsam |
|---|---|---|
| Koleksiyonlar | `gr_collections`, `gr_collections_deleted` | AsyncStorage, **hesap kapsamı yok** |
| İstek listesi | `gr_wishlist`, `gr_notif_enabled` | AsyncStorage, **hesap kapsamı yok** |
| Zevk profili | `gr_taste_profile` | AsyncStorage, **hesap kapsamı yok**, sunucuya gidiyor |
| Beğeni/görülen/elenen | `gr_liked`, `gr_seen`, `gr_dismissed` | AsyncStorage, **hesap kapsamı yok** |
| Steam hesapları | `gr_steam_accounts` | AsyncStorage, sunucuya **hiç** gitmiyor |
| Xbox oturumu | `gr_xbox_session` | SecureStore, sunucuya **hiç** gitmiyor |

`signOut()` (`src/services/session.js:65`) yalnızca `persist(null)` yapıyor —
oturum jetonunu siliyor, yerel depoların **hiçbirine dokunmuyor**.
`app/account.jsx` de temizlemiyor.

**Arıza zinciri:**

1. A kullanıcısı koleksiyon yapar → `gr_collections`
2. Çıkar → yalnızca jeton silinir, veri kalır
3. B girer → `WishlistContext.jsx:131` → `syncAccountData` A'nın verisini
   **B'nin jetonuyla** gönderir
4. Sunucu (`app/api/user/data/route.js`) birleştirir, birleşmiş hâli döner
5. **A'nın koleksiyonları artık B'nin hesabında** — B başka cihazdan girse
   bile görür

`syncAccountData` aslında iki yönlü: PUT yanıtı birleşmiş veriyi taşıyor.
`fetchUserData` bu yüzden **0 çağrılı**. Sorun senkronun eksikliği değil,
**kimin verisi olduğunun hiç sorulmaması**.

**Düzeltme yolu — native build GEREKMİYOR:**

| Parça | Nasıl |
|---|---|
| Depoları hesaba göre kapsa, çıkışta temizle | **OTA** (saf JS) |
| Kimin verisi bilinmeden senkron etme | **OTA** (saf JS) |
| Steam/Xbox'ı hesaba bağla | **OTA + Vercel deploy** — sunucu kaydı `steamAccounts` taşımalı |

`AsyncStorage` ve `expo-secure-store` zaten bağlı native modüller.

**KARAR: C — etkilenen hesaplar sıfırlanacak.**

Yerel temizlik, daha önce yanlış hesaba yazılmış kayıtları geri almaz.
Seçenekler A (dokunma) ve B (ayıklamaya çalış) elendi; koleksiyonlarda
sahiplik bilgisi olmadığı için B zaten güvenilir değil.

**Sıfırlama HENÜZ YAPILMADI — betik hazır, kimlik bilgisi bekliyor.**

Onay 5 Ağustos'ta alındı: kayıtlı hesapların hepsi test hesabı, verileri
silinebilir; **hesapların kendisi silinmeyecek**.

`scratch/reset_user_data.mjs` bu iş için yazıldı. Varsayılan kipi **yalnız
ölçüm**: dört anahtar ailesini `SCAN` ile sayar, tekil uid ve koleksiyon
taşıyan hesap sayısını yazdırır (DURUM.md'nin önkoşulları 1 ve 2). Silmek için
açıkça `--sil` gerekiyor; silme sonrası tekrar sayarak doğruluyor.

Siler: `user_taste:*` · `user_wishlist:*` · `user_collections:*` ·
`user_collections_deleted:*`. Kimlik kaydına, sosyal profile, kullanıcı adına
dokunmaz.

**Koşulmadı** — bu makinede `.env.local` yok, `UPSTASH_REDIS_REST_URL/TOKEN`
Vercel panosunda. Betiğin Redis yolu bu yüzden gerçek sunucuda denenmedi;
sözdizimi ve kimlik-bilgisi-yok davranışı denendi.

**Sıra hatırlatması:** OTA cihazlara indikten SONRA koş. Yeni JS eski
kapsamsız anahtarları zaten siliyor (`owner.js:migrateLegacyKeys`), yani
güncellenmiş cihazda geri yüklenecek kirli kopya kalmıyor. Güncellenmemiş bir
cihaz ilk senkronda sıfırlamayı geri alır.

**Sıra:** önce akışı düzelt (yeni karışma dursun), sonra sıfırlama.
Tersi yapılırsa temizlenen hesaplar aynı hatayla yeniden kirlenir.

#### Yapılan — 1. adım, akış düzeltmesi (5 Ağustos, OTA)

Yeni dosya `src/services/owner.js`. Her kalıcı anahtar artık sahibine göre
türetiliyor: `gr_seen__anon` · `gr_seen__u_<uid>`. Depoların **tüketicileri
değişmedi** (25 dosya + `useWishlist`/`useAuth` kullanan 14 dosya); kapsam
depoların içinde.

| Ne | Nerede |
|---|---|
| 9 anahtarın hepsi hesaba kapsandı | 5 servis deposu + 2 context |
| Çıkışta: son senkron → oturumu kapat → yerel kopyayı sil | `session.js:signOut` |
| Sahibi bilinmeyen veri senkron edilmiyor | `sync.js` |
| Hesap değişince 30 sn kısıtlayıcı sıfırlanıyor | `sync.js` |
| Misafir verisi devri artık **soruluyor** | `account.jsx:offerAnonTransfer` |
| Eski kapsamsız anahtarlar tek seferde siliniyor | `owner.js:migrateLegacyKeys` |

**Üç ince nokta, üçü de düzeltmenin parçası:**

1. *Sönümleme yarışı.* Depolar 600–800 ms sönümlemeyle yazıyor. Sahip
   çevrilirken bekleyen zamanlayıcı önce **eski** kovaya indiriliyor; ters
   sırada A'nın verisi B'nin kovasına boşalırdı — düzeltilen hatanın kılık
   değiştirmiş hâli.
2. *Yanıt sırasında hesap değişimi.* `syncAccountData` uid'i başta mühürlüyor;
   jeton alındıktan sonra ve yanıt geldikten sonra iki kez doğruluyor.
3. *Eski veri taşınmıyor, siliniyor.* Sahibi bilinmediği için taşımak
   karışmayı yeni kovaya devrederdi — ve sunucu sıfırlaması kalıcı olmazdı,
   ilk senkronda cihazdaki kirli kopya geri yüklenirdi.

**Ölçüm — iki yöntem:**

1. *Node.* Kaynak dosyalar (yalnız iki native modül saplanarak) koşturuldu:
   depo kapsamı 18/18, senkron sahipliği 11/11. Sönümleme yarışı ve "yanıt
   gelirken hesap değişti" ayrı ayrı sınandı.
2. *Simülatörde, gerçek eski veri üstünde.* Cihazda 4 Ağustos'tan kalma
   kapsamsız `gr_seen`, `gr_taste_profile`, `gr_wishlist` duruyordu. Yeni
   derleme kurulduktan sonra App Group plist'i değil, doğrudan AsyncStorage
   manifest'i okundu:

   | | Kurulum öncesi | Sonrası |
   |---|---|---|
   | Kapsamsız kullanıcı anahtarı | 3 | **0** |
   | `gr_scope_migrated` | yok | **var** |
   | Cihaz düzeyi (`gr_onboarded`, `gr_query_cache`) | 2 | 2 (dokunulmadı) |

   Ardından bir oyun detayı açılıp takibe alındı → yeni kayıtlar
   `gr_seen__anon`, `gr_taste_profile__anon`, `gr_wishlist__anon` olarak düştü.
   Ana sayfa, oyun detayı ve profil ekranı hesapsız durumda doğru render
   ediliyor; depolar sahip çözülmesini beklerken takılmıyor.

**Doğrulanmadı:** iki gerçek hesapla uçtan uca tur (A koleksiyon yap → çık →
B gir). Şifre girmeyi gerektirdiği için yapılmadı — bu turu insan yapmalı.

**Derleme notu:** `npx expo run:ios` bu makinede çalışmıyor; Xcode 26.6'nın
`devicectl` sürüm çıktısını Expo CLI çözemiyor ve simülatörü fiziksel cihaz
sanıp imzalama sertifikası istiyor. `npx expo start` de ayrıca takılıyor
(`modules/gamerisen-widget-module/index.ts` yüzünden TypeScript bağımlılığı
istiyor). İşleyen yol:

```bash
cd mobile/ios && LANG=en_US.UTF-8 xcodebuild -workspace Gamerisen.xcworkspace \
  -scheme Gamerisen -configuration Release -sdk iphonesimulator \
  -destination "id=<UDID>" -derivedDataPath build/dd -quiet build
xcrun simctl install <UDID> build/dd/Build/Products/Release-iphonesimulator/Gamerisen.app
xcrun simctl launch <UDID> com.gamerisen.app
```

Release ŞART: Debug, Metro ister. Temiz derleme ~9 dk.

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

**Widget — ÇALIŞIYOR (4 Ağustos'ta doğrulandı).** Üç çeşidi de galeride
gerçek veriyle render ediliyor ve ana ekrana eklenip görüldü:
- *Günün Fırsatı* (küçük) — canlı veri: %95 indirim, üstü çizili fiyat
- *Kütüphane Özet* (küçük) — Steam bağlı olmadığı için doğru boş durum
- *Takip Listesi* (orta) — istek listesinde indirimli oyun yok, doğru mesaj

**Share Extension — ÇALIŞIYOR (4 Ağustos'ta doğrulandı).** Uçtan uca:
Safari'de Steam sayfası → Paylaş → Gamerisen → "Gamerisen'e Eklendi" uyarısı
→ uygulama açılınca doğrudan o oyunun detayında. Kaynak dosyadaki "Mac/Xcode
olmadan görsel test mümkün değil" notu artık geçersiz.

*Küçük şüphe:* Steam olmayan bir link paylaşıldığında kodun göstermesi
gereken "Desteklenmeyen Bağlantı" uyarısı **çıkmadı** (Google arama sayfasıyla
denendi, sessizce kapandı). Muhtemelen `attachments?.first` URL değil başka
bir tür geliyor. Ana işlev sağlam, bu yalnızca hata yolu.

**Hâlâ görülmedi:**
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
