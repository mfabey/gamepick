import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

// Steam fiyatı: storesearch ile appid bul → appdetails cc=tr → TRY
// Para birimi TRY değilse güncel kur ile dönüştür
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name     = searchParams.get('name')     || '';
  const hasSteam = searchParams.get('hasSteam') === 'true';
  if (!name || !hasSteam) return NextResponse.json({ price: null });

  try {
    // 1. Oyunu Steam'de ara → appid bul
    const sRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=tr&l=tr&category1=998`,
      { next: { revalidate: 3600 } }
    );
    if (!sRes.ok) return NextResponse.json({ price: null });
    const sData  = await sRes.json();
    const items  = sData?.items || [];
    const target = name.toLowerCase().trim();

    // Birebir eşleşme önce, sonra çift yönlü kısmi — yanlış oyun fallback'i kaldırıldı
    const match = items.find(i => i.name?.toLowerCase().trim() === target)
               || items.find(i => {
                    const n = (i.name || '').toLowerCase();
                    return n.includes(target.slice(0, 15)) || target.includes(n.slice(0, 15));
                  });

    if (!match?.id) return NextResponse.json({ price: null });

    // 2. appdetails cc=tr → fiyat detayı
    const dRes = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${match.id}&cc=tr&filters=price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!dRes.ok) return NextResponse.json({ price: null });
    const dData    = await dRes.json();
    const info     = dData?.[match.id]?.data?.price_overview;
    if (!info)     return NextResponse.json({ price: null, isFree: true });

    const currency = info.currency || 'TRY';

    // cc=tr rağmen USD/EUR gelirse → güncel kur ile TRY'ye çevir
    const usdTryRate = currency !== 'TRY' ? await getUsdToTry() : 1;

    return NextResponse.json({
      price:    amountToTRY(info.final,   currency, usdTryRate),
      original: amountToTRY(info.initial, currency, usdTryRate),
      discount: info.discount_percent ?? 0,
      isFree:   info.final === 0,
      appid:    match.id,
    });
  } catch {
    return NextResponse.json({ price: null });
  }
}
