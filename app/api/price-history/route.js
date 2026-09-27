import { NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '../../lib/rate-limit';
import { clientIp } from '../../lib/client-ip';
import { ITAD_KEY, RESMI_MAGAZA, itadGameId, itadHistory, itadHistoryLow } from '../../lib/itad';

// ─────────────────────────────────────────────────────────────────────────────
// FİYAT GEÇMİŞİ — mobil G-08 "Rekor düşük", "12 aylık ortalama" ve
// "Fiyat Geçmişi" grafiği (27 Eyl).
//
// GET /api/price-history?appid=271590&title=GTA+V
//   → { available: true, shop: { id, name }, events: [{ t, price, regular, cut }], low }
//   → { available: false }   ITAD anahtarı yok / oyun bulunamadı / ITAD hata
//
// TEK MAĞAZANIN GÜNLÜĞÜ. ITAD her mağaza için ayrı değişim kaydı tutuyor;
// mağazaları karıştırıp "en ucuz" çizgisi çizmek, bir mağaza verisi eksik
// olduğunda sahte düşüşler üretirdi. Steam varsa Steam, yoksa en çok kaydı
// olan resmî mağaza. Rekor düşük ise TÜM resmî mağazalar arasında.
//
// Örnekleme (3A/6A/1Y/Tümü) ve ortalama İSTEMCİDE: günlük seyrek (fiyat
// değişince bir kayıt), aralık değiştirmek yeni istek gerektirmesin.
//
// PUBLIC: katalog verisi, kişisel veri yok. Yanıt CDN'de 6 saat.
// ─────────────────────────────────────────────────────────────────────────────

const UC_YIL = 3 * 365 * 24 * 3600 * 1000;
const bos = () => NextResponse.json({ available: false }, { headers: { 'Cache-Control': 's-maxage=3600' } });

export async function GET(request) {
  const rl = await rateLimit(`rl:pricehist:${clientIp(request)}`, 240, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const appid = /^\d{1,10}$/.test(searchParams.get('appid') || '') ? searchParams.get('appid') : null;
  const title = String(searchParams.get('title') || '').trim().slice(0, 120);
  if ((!appid && !title) || !ITAD_KEY) return bos();

  try {
    const id = await itadGameId({ appid, title });
    if (!id) return bos();

    const [events, lowAll] = await Promise.all([itadHistory(id, Date.now() - UC_YIL), itadHistoryLow(id).catch(() => null)]);
    if (!events.length) return bos();

    const sayim = {};
    for (const e of events) sayim[e.shop] = (sayim[e.shop] || 0) + 1;
    const shop = sayim[61] ? 61 : Number(Object.entries(sayim).sort((a, b) => b[1] - a[1])[0][0]);
    const secili = events.filter((e) => e.shop === shop).map(({ t, price, regular, cut }) => ({ t, price, regular, cut }));

    // ITAD'ın rekoru resmî olmayan bir mağazadaysa (itadHistoryLow null
    // döndürür) günlükteki resmî mağazaların en düşüğü.
    let low = lowAll;
    if (!low) {
      const enDusuk = events.reduce((m, e) => (e.price < m.price ? e : m), events[0]);
      low = { price: enDusuk.price, regular: enDusuk.regular, cut: enDusuk.cut, t: enDusuk.t, shop: RESMI_MAGAZA[enDusuk.shop] };
    }

    return NextResponse.json(
      { available: true, shop: { id: shop, name: RESMI_MAGAZA[shop] }, events: secili, low },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } },
    );
  } catch (e) {
    console.warn('price-history:', e?.message);
    return bos();
  }
}
