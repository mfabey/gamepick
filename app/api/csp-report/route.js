import { NextResponse } from 'next/server';
import { rateLimit } from '../../lib/rate-limit';
import { clientIp } from '../../lib/rate-guard';

// ─────────────────────────────────────────────────────────────────────────────
// CSP ihlal raporu toplayıcı.
//
// `Content-Security-Policy-Report-Only` başlığındaki `report-uri` buraya
// bakıyor. Tarayıcı, SIKILAŞTIRILMIŞ politikanın engelleyeceği her kaynağı
// buraya bildiriyor — ama engellemiyor. Yani sıkı politikayı yürürlüğe
// almadan önce neyi keseceğini görüyoruz.
//
// KİMLİKSİZ OLMAK ZORUNDA: raporu tarayıcı gönderiyor, oturumdan bağımsız
// olarak ve çıkış yapmış kullanıcıda da. Kimlik şartı koymak raporların
// çoğunu kaybettirirdi.
//
// KAYIT YERİ KONSOL, Redis DEĞİL. Sebep: bu uç kimliksiz bir yazma yüzeyi;
// Redis'e yazsaydı sınırsız anahtar birikimi olurdu. Vercel logları bu iş
// için yeterli ve raporlar geçici — sıkı politika yürürlüğe girince bu uç
// ve `report-uri` satırı tümden kalkacak.
//
// GÖVDE OKUNMADAN ATILIYOR olabilir: tarayıcı `application/csp-report`
// gönderiyor, bazıları `application/reports+json`. İkisi de JSON.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BODY = 8 * 1024; // rapor gövdesi küçüktür; büyüğü kötüye kullanımdır

export async function POST(request) {
  // Kimliksiz olduğu için tek eksen IP. Sınır bol: gerçek bir ihlal, sayfa
  // başına birden fazla rapor üretebiliyor.
  const rl = await rateLimit(`rl:cspreport:${clientIp(request)}`, 120, 3600);
  if (!rl.ok) return new NextResponse(null, { status: 429 });

  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!raw || raw.length > MAX_BODY) return new NextResponse(null, { status: 204 });

  try {
    const data = JSON.parse(raw);
    // İki biçim: klasik `report-uri` → { "csp-report": {...} }
    //            yeni `report-to`   → [{ body: {...} }]
    const r = data['csp-report'] || data?.[0]?.body || data;
    console.warn('[CSP-RAPOR]', JSON.stringify({
      ihlal: r['violated-directive'] || r.effectiveDirective || null,
      engellenen: r['blocked-uri'] || r.blockedURL || null,
      sayfa: r['document-uri'] || r.documentURL || null,
      satir: r['line-number'] || r.lineNumber || null,
    }));
  } catch {
    // Ayrıştırılamayan rapor sessizce düşürülüyor — tarayıcıya hata
    // döndürmenin bir karşılığı yok, raporu tekrar göndermiyor.
  }

  // 204: tarayıcı gövde beklemiyor.
  return new NextResponse(null, { status: 204 });
}
