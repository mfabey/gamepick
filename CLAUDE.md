# GamePick — Claude Code Proje Rehberi

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
npm run dev    # localhost:3000
npm run build  # production build
npm run lint   # ESLint
```

## Bilinen Sorunlar / Dikkat Edilecekler
- Xbox OAuth `?xbox_error=cancelled` hatası — `prompt=select_account` fix denendi, Vercel'de test edilmedi
- `KNOWN_DELISTED_SLUGS` listesi `games/route.js` içinde — yeni delisted oyunlar eklenebilir
- Sale bölümü ITAD API'sine bağımlı, yavaş olabilir (paralel fetch yapılıyor)
- Hero blur efekti için `filter: blur(5px)` + `transform: scale(1.12)` — scale olmadan kenarlarda beyazlık çıkıyor

## Deployment
Vercel'e bağlı. `main` branch'e push → otomatik deploy.
Environment variables Vercel dashboard'da tanımlı.
