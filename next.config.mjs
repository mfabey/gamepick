// Trigger Vercel Build - 2026-07-23
/** @type {import('next').NextConfig} */
// Başlıklar TEK KAYNAKTAN: aynı liste middleware.js tarafından da okunuyor.
// Eskiden CSP burada ve middleware'de ayrı ayrı yazılıydı; ikisi ayrıştığında
// isteğin hangi katmandan geçtiğine göre farklı politika uygulanırdı.
import { SECURITY_HEADERS } from './app/lib/security-headers.js';

const nextConfig = {
  poweredByHeader: false,
  images: {
    domains: ['media.rawg.io', 'cdn.akamai.steamstatic.com', 'cdn.cloudflare.steamstatic.com', 'store.steampowered.com', 'shared.akamai.steamstatic.com'],
  },
  experimental: {
    sri: {
      algorithm: 'sha256',
    },
    // ── firebase-admin PAKETLENMEZ, SUNUCUDA OLDUĞU GİBİ ÇAĞRILIR ───────────
    //
    // NEDEN VAR. `firebase-admin` bağımlılığı `d7b3f34` ile geldi ve Vercel'de
    // İLK KEZ 2.7.x birleştirmesiyle çalıştı; o dal daha önce hiç deploy
    // edilmemişti. Beyan olmadan Next paketi webpack'e katıyor, paket ise
    // dinamik `require` ve isteğe bağlı yerel bağımlılıklar kullanıyor:
    // `next build` YERELDE GEÇİYOR, hata yalnızca sunucuda modül yüklenirken
    // çıkıyor ve rota daha ilk satırına gelmeden 500 dönüyor.
    //
    // ÖLÇÜLDÜ (üretimde, boş gövdeyle): zinciri içe aktaran üç uç 500
    // (mobile-login, mobile-refresh, mobile-logout), aktarmayan dördü sağlam
    // (register, login, auth/action, trending). Kod hatası değil, paketleme.
    //
    // Next 14'te anahtar bu; Next 15'te adı `serverExternalPackages` oldu —
    // sürüm yükseltilirse burası da değişmeli.
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  async redirects() {
    return [
      {
        source: '/game/rawg/:slug',
        destination: '/game/:slug',
        permanent: true,
      },
      {
        source: '/game/epic/:slug',
        destination: '/game/:slug',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
