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
