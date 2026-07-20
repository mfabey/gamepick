/** @type {import('next').NextConfig} */
const cspHeader = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' blob: data: https://media.rawg.io https://*.steamstatic.com https://store.steampowered.com https://shared.akamai.steamstatic.com https://cdn.akamai.steamstatic.com https://cdn.cloudflare.steamstatic.com; connect-src 'self' https://api.rawg.io https://*.steampowered.com https://discord.gg; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none';";

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
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
