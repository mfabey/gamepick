import { NextResponse } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Hız sınırı yapılandırması (Rate limit configuration)
const LIMIT = 60; // 1 dakikada yapılabilecek maksimum istek sayısı
const WINDOW_SIZE = 60; // Saniye cinsinden zaman dilimi (1 dakika)

export async function middleware(request) {
  // Sadece /api/ altındaki API uç noktalarını sınırla
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Eğer Redis bağlantı bilgileri tanımlı değilse (yerel geliştirme vb.) rate limit'i geç
  if (!REDIS_URL || !REDIS_TOKEN) {
    return NextResponse.next();
  }

  // İstek yapan kullanıcının IP adresini al
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const cleanIp = ip.split(',')[0].trim();
  
  // IP adresi ve zaman dilimine göre benzersiz bir Redis anahtarı oluştur
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(currentTimestamp / WINDOW_SIZE);
  const redisKey = `ratelimit:${cleanIp}:${windowKey}`;

  try {
    // Upstash Redis REST API'ye pipeline (çoklu komut) isteği at
    // INCR komutu sayacı artırır, EXPIRE komutu anahtarın 1 dakika sonra silinmesini sağlar
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
      cache: 'no-store', // Next.js'in bu fetch isteğini önbelleklemesini engelle
    });

    if (response.ok) {
      const data = await response.json();
      // Pipeline sonuçlarında ilk komut (INCR) sayacın yeni değerini döner
      const count = data[0]?.result || 1;

      // Limit aşımı kontrolü
      if (count > LIMIT) {
        return new NextResponse(
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
      }
    }
  } catch (err) {
    console.warn('Rate limiter error:', err.message);
  }

  return NextResponse.next();
}

// Sadece /api/ ile başlayan yollarda çalışmasını sağla
export const config = {
  matcher: '/api/:path*',
};
