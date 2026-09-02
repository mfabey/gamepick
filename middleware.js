import { NextResponse } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Hız sınırı yapılandırması (Rate limit configuration)
const LIMIT = 60;
const WINDOW_SIZE = 60;

// Başlıklar TEK KAYNAKTAN — next.config.mjs da aynı listeyi okuyor.
// Eskiden CSP burada ve next.config'te ayrı ayrı yazılıydı; ikisi ayrıştığında
// isteğin hangi katmandan geçtiğine göre farklı politika uygulanırdı.
import { SECURITY_HEADERS } from './app/lib/security-headers.js';

function addSecurityHeaders(headers) {
  for (const { key, value } of SECURITY_HEADERS) headers.set(key, value);
  headers.delete('x-powered-by');
}

export async function middleware(request) {
  // Sadece /api/ altındaki API uç noktalarını hız sınırına tabi tut
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (REDIS_URL && REDIS_TOKEN) {
      const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
      const cleanIp = ip.split(',')[0].trim();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const windowKey = Math.floor(currentTimestamp / WINDOW_SIZE);
      const redisKey = `ratelimit:${cleanIp}:${windowKey}`;

      try {
        const response = await fetch(REDIS_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            ['INCR', redisKey],
            ['EXPIRE', redisKey, WINDOW_SIZE],
          ]),
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          const count = data[0]?.result || 1;

          if (count > LIMIT) {
            const limitedRes = new NextResponse(
              JSON.stringify({
                error: 'Çok fazla istek gönderdiniz. Lütfen bir dakika sonra tekrar deneyin.',
                message: 'Rate limit exceeded. Please try again in a minute.'
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'Retry-After': String(WINDOW_SIZE),
                },
              }
            );
            addSecurityHeaders(limitedRes.headers);
            return limitedRes;
          }
        }
      } catch (err) {
        console.warn('Rate limiter error:', err.message);
      }
    }
  }

  const res = NextResponse.next();
  addSecurityHeaders(res.headers);
  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
