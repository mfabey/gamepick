# Durum ve açık maddeler

**Son güncelleme:** 3 Ağustos 2026
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

**Kalan iş:** vurgu 125'te. Kalanların çoğu meşru (yükleme göstergeleri,
gerçek CTA'lar) ama cihazda hâlâ yoğun gelen ekran varsa oraya bakılabilir.

`src/theme.js` içindeki belirteçler: `PRESSED_CARD` (kart basma tepkisi),
`NUMERIC` (tablo rakamları), `motion` (süre birliği). Yeni kod ham sayı
yazmamalı.

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

**Not:** RAWG 3 Ağustos'ta çöktü (Cloudflare 522, ~20 sn askıda) ve bu satır
yazılırken hâlâ çökük. Uygulama `app/lib/rawg-fetch.js`'teki zaman aşımı +
devre kesici sayesinde Steam verisiyle ayakta.

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

### 5. Mağaza görselleri eski

Ekran görüntüleri v1 arayüzünü gösteriyor; arayüz o zamandan beri iki kez
değişti. Guideline 4.2.2 reddi almış bir uygulama için listeleme sayfasındaki
ilk izlenim bu.

### 6. Cihazda hiç doğrulanmamış

Geliştirme Windows'ta yapıldığı için görsel hiçbir şey gözle görülmedi.
Özellikle şunlar cihazda test edilmeli:
- Widget ve Share Extension (ikisi de Apple itiraz metninde "native
  işlevsellik" kanıtı olarak sayılıyor)
- Yön kilidi: video ekranından çıkınca dikeye dönüyor mu
- Sekme çubuğunun basılı tutma sonrası geri gelmesi

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

DNS zehirlenmesi bu makinede tekrarlıyor: `git push` ya da `expo` komutları
`SEC_E_WRONG_PRINCIPAL` benzeri TLS hatası verirse DNS önbelleğini temizleyip
tekrar dene (`ipconfig /flushdns`). Kod sorunu değil.
