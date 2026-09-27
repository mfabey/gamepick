import { NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '../../lib/rate-limit';
import { clientIp } from '../../lib/client-ip';
import { ITAD_KEY, RESMI_MAGAZA, itadGameId, itadHistory } from '../../lib/itad';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

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
// ₺ VE PARA BİRİMİ DÖNEMİ (ölçüldü, 27 Eyl, Hades): Steam Türkiye Kasım
// 2023'te dolara geçti. ITAD günlüğü eski kayıtları ₺ ("20", Aralık 2022),
// yenileri USD ("2.06") veriyor. İkisini aynı eksende göstermek yanlış:
// eski ₺ fiyatı bugünkü ₺'ye çevrilmiş dolar fiyatıyla kıyaslanamaz ve
// "rekor düşük ₺20" yanıltıcı olurdu. Her mağazada yalnız SON kaydın para
// birimindeki kayıtlar tutuluyor, sonra ₺'ye çevriliyor (api/prices ile
// aynı kur). ITAD'ın historylow ucu bu yüzden kullanılmıyor: dönem ayrımı
// yapmıyor.
//
// Örnekleme (3A/6A/1Y/Tümü) ve ortalama İSTEMCİDE: günlük seyrek (fiyat
// değişince bir kayıt), aralık değiştirmek yeni istek gerektirmesin.
//
// PUBLIC: katalog verisi, kişisel veri yok. Yanıt CDN'de 6 saat.
// ─────────────────────────────────────────────────────────────────────────────

const UC_YIL = 3 * 365 * 24 * 3600 * 1000;
// `neden` yalnız debug=1 ile (smart-search'teki gibi): ilk dağıtımda uç her
// oyunda boş döndü ve sunucu günlüğü olmadan sebebi görmek mümkün değildi.
// Teşhisli yanıt önbelleğe alınmıyor.
const bos = (neden, debug) => NextResponse.json(
  debug ? { available: false, neden } : { available: false },
  { headers: { 'Cache-Control': debug ? 'no-store' : 's-maxage=3600' } },
);

export async function GET(request) {
  const rl = await rateLimit(`rl:pricehist:${clientIp(request)}`, 240, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const appid = /^\d{1,10}$/.test(searchParams.get('appid') || '') ? searchParams.get('appid') : null;
  const title = String(searchParams.get('title') || '').trim().slice(0, 120);
  const debug = searchParams.get('debug') === '1';
  if (!appid && !title) return bos('parametre-yok', debug);
  if (!ITAD_KEY) return bos('anahtar-yok', debug);

  try {
    const id = await itadGameId({ appid, title });
    if (!id) return bos('oyun-bulunamadi', debug);

    const [ham, kur] = await Promise.all([itadHistory(id, Date.now() - UC_YIL), getUsdToTry()]);
    // Mağaza başına güncel para birimi = son kaydınki (liste artan sırada).
    const guncelPara = {};
    for (const e of ham) guncelPara[e.shop] = e.currency;
    const events = ham
      .filter((e) => e.currency === guncelPara[e.shop])
      .map((e) => ({
        t: e.t, shop: e.shop, cut: e.cut,
        price: amountToTRY(e.priceInt, e.currency, kur),
        regular: amountToTRY(e.regularInt, e.currency, kur),
      }));
    if (!events.length) return bos('gecmis-bos', debug);

    const sayim = {};
    for (const e of events) sayim[e.shop] = (sayim[e.shop] || 0) + 1;
    const shop = sayim[61] ? 61 : Number(Object.entries(sayim).sort((a, b) => b[1] - a[1])[0][0]);
    const secili = events.filter((e) => e.shop === shop).map(({ t, price, regular, cut }) => ({ t, price, regular, cut }));

    // Rekor düşük: güncel para birimi dönemindeki tüm resmî mağazalar.
    const enDusuk = events.reduce((m, e) => (e.price < m.price ? e : m), events[0]);
    const low = { price: enDusuk.price, regular: enDusuk.regular, cut: enDusuk.cut, t: enDusuk.t, shop: RESMI_MAGAZA[enDusuk.shop] };

    return NextResponse.json(
      { available: true, shop: { id: shop, name: RESMI_MAGAZA[shop] }, events: secili, low },
      { headers: { 'Cache-Control': 's-maxage=21600, stale-while-revalidate=86400' } },
    );
  } catch (e) {
    console.warn('price-history:', e?.message);
    // İleti ITAD'ın durum kodu ve hata gövdesi; URL (anahtar) içermiyor.
    return bos(String(e?.message || 'hata').replace(/key=[^&\s]+/g, 'key=***').slice(0, 200), debug);
  }
}
