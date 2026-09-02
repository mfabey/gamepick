# Gamerisen — Claude Code Proje Rehberi

## Çalışma Biçimi

Bu bölüm nasıl çalışılmasını istediğimizi tarif eder; koda başlamadan önce oku.

**Tek seferde tek iş.** Aynı anda birden fazla değişikliğe girme. Bir iş bitince
DUR ve onay bekle — sıradakine kendiliğinden geçme.

**Koddan önce dört başlık.** Her iş için sırayla yaz:
1. Mevcut durum analizi
2. Sorunlar
3. Yapacağın geliştirmeler
4. Beklenen kazanımlar

**Öncelik sırası:** 1. Performans · 2. Kullanıcı deneyimi · 3. Algoritma ·
4. Yeni özellik.

**Tahmin değil ölçüm.** "Yavaş", "karışık", "yorucu" gibi sezgisel şikâyetlerde
önce ölç (süre, kullanım sayısı, kontrast oranı), sonra teşhis koy. Bu repoda
alınan tasarım ve mimari kararların çoğu ölçüme dayanıyor; commit mesajlarında
sayılar duruyor.

**Doğrulama zorunlu.** Mobil değişikliklerden sonra `npx expo export
--platform ios`, web değişikliklerinden sonra `npm run build`. Kodmod
yazdıysan sonucunu ayrıca denetle — bu repoda kodmodlar birkaç kez sessizce
hata yaptı.

**Dürüstlük tıkıştırmaya yeğdir.** Bir şeyi doğrulayamıyorsan (ör. görsel
değişiklikler Windows'ta gözle görülemiyor) bunu açıkça söyle. Yarım kalan
işi tamamlanmış gibi raporlama.

## Proje Özeti
Next.js 14 (App Router) tabanlı oyun keşif platformu. Kullanıcılar PC oyunlarını keşfedebilir, Steam/Epic fiyatlarını görebilir, kütüphanelerini bağlayabilir.

## Teknoloji Stack
- **Framework:** Next.js 14 App Router (`'use client'` bileşenler)
- **Stil:** CSS Variables (`globals.css`), inline styles
- **Auth:** NextAuth.js — Steam OAuth + Xbox/Microsoft OAuth
- **API'ler:** RAWG (oyun veritabanı), SteamSpy (trend), ITAD (fiyat), Steam Store API

## Önemli Ortam Değişkenleri (`.env.local`)
```
RAWG_API_KEY=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
STEAM_API_KEY=...
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
```

## Klasör Yapısı
```
app/
  page.jsx              # Anasayfa — hero mosaic, typewriter, trend/yeni/indirim bölümleri
  games/page.jsx        # Oyunlar listesi — arama, filtre, kategori, sonsuz scroll
  game/rawg/[slug]/     # Oyun detay sayfası
  components/
    GameCard.jsx        # Oyun kartı — Steam/Epic logo, fiyat, hover efekti
    Navbar.jsx          # Üst navigasyon
  api/
    games/route.js      # Ana oyun listesi API — RAWG + Steam merge
    trending/route.js   # Trend oyunlar — curated streamer listesi + RAWG
    card-price/route.js # Kart başına lazy fiyat — ITAD + Steam
    auth/[...nextauth]/ # Steam + Xbox OAuth
  context/
    AuthContext.jsx     # Global auth state — Steam kütüphanesi, Xbox, Game Pass
```

## Önemli Tasarım Kararları

### Anasayfa (`app/page.jsx`)
- Hero: `calc(100vh - 56px)` yükseklik, 5×4 grid (20 panel), her kare blurlu oyun görseli
- Fisher-Yates shuffle ile her sayfa açılışında farklı oyunlar (`useMemo`)
- Typewriter animasyonu: oyun isimleri arasında geçiş (typing → pause → erasing)
- 3 bölüm: "🔥 Bu Hafta Trend" (trendGames), "🗓️ Yeni Çıkanlar" (newGames), "🏷️ İndirimdekiler" (saleGames)
- CSS animasyonlar: `glow-pulse` (başlık), `scale-in` (arama kutusu), `blink` (cursor), `pulse-badge` (CANLI)

### GameCard (`app/components/GameCard.jsx`)
- Steam ve Epic Games SVG logoları — simpleicons path'leri
- Logolar kart görselinin sol alt köşesinde (20×20px badge)
- `IntersectionObserver` ile lazy fiyat yükleme (`/api/card-price`)
- Sahiplik rozetleri: "✓ Sahipsin" (Steam), "✓ Xbox'ta", "🎮 Game Pass"

### Trend API (`app/api/trending/route.js`)
- RAWG'dan curated oyun ID listesi (`STREAMER_GAME_IDS`)
- Her 3 saatte bir liste rotate ediyor (zaman tabanlı seed)
- Meccha Chameleon custom viral oyun olarak en başa pinlenmiş
- 6 saat cache (`next: { revalidate: 21600 }`)

### Oyunlar Sayfası (`app/games/page.jsx`)
- Sonsuz scroll — `IntersectionObserver` sentinel
- Debounce 400ms arama
- Kategoriler: 12 tür (RAWG genre slug)
- `seenIds` ile duplicate önleme

## Geliştirme Komutları
```bash
npm run dev           # localhost:3000
npm run build         # production build (önce erişim politikasını denetler)
npm run lint          # ESLint
npm run check:access  # erişim politikası denetimi (tek başına)
```

## Erişim Politikası — varsayılan REDDET

Bu projede Firestore rules / Supabase RLS gibi **bildirimsel bir kural katmanı
yok**. Veri Upstash Redis'te, Redis jetonu yalnızca sunucuda, her erişim
`app/api/**` route handler'ından geçiyor. Yani *kural* = route'un içindeki
yetki kontrolü. Bunun zayıflığı: kontrolü eklemeyi unutan yeni bir route
sessizce herkese açık doğuyor — 2026-09-02 denetiminde bulunan dört açığın
dördü de böyle oluşmuştu.

`app/lib/access-policy.js` her ucu altı kategoriden birine yazıyor (PUBLIC,
AUTH_ENTRY, SESSION, AUTH, CRON, DEV_ONLY). `scripts/check-access-policy.mjs`
`prebuild` olarak koşuyor: **sınıflandırılmamış bir route varsa build düşer.**

Yeni route eklerken build "SINIFLANDIRILMAMIŞ" diyerek duracak — ucu manifeste
ekle. Hangi kategori olduğundan emin değilsen doğru cevap PUBLIC değildir.

Denetleyici auth'u kaynaktan **çıkarsamıyor**, yalnızca beyan eksikliğine
bakıyor. Sebebi ölçüldü: çıkarsama denendi ve iki kez yanıldı — bir route'un
yorumunda geçen `verifyMobileToken` onu korunuyor gösterdi, ve kaynaktaki
`.replace(/\/+$/, '')` gibi ifadeler blok-yorum ayıklamasını şaşırtıp
`cron/price-alerts` ile OAuth callback'lerini "kimliksiz" gösterdi.

## Bilinen Sorunlar / Dikkat Edilecekler
- Xbox OAuth `?xbox_error=cancelled` hatası — `prompt=select_account` fix denendi, Vercel'de test edilmedi
- `KNOWN_DELISTED_SLUGS` listesi `games/route.js` içinde — yeni delisted oyunlar eklenebilir
- Sale bölümü ITAD API'sine bağımlı, yavaş olabilir (paralel fetch yapılıyor)
- Hero blur efekti için `filter: blur(5px)` + `transform: scale(1.12)` — scale olmadan kenarlarda beyazlık çıkıyor

## Deployment
Vercel'e bağlı. `main` branch'e push → otomatik deploy.
Environment variables Vercel dashboard'da tanımlı.
