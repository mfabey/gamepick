import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

// GET /api/steam-price?appid=271590
// cc=tr ile çağırır; Steam TRY döndürmezse (USD/EUR) → güncel kur ile dönüştürür
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  if (!appid) return NextResponse.json({ error: 'appid gerekli' }, { status: 400 });

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=basic,price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return NextResponse.json({ price: null, isFree: false, isAvailable: false });

    const data  = await res.json();
    const entry = data?.[appid];

    if (!entry?.success || !entry.data) {
      return NextResponse.json({ price: null, isFree: false, isAvailable: false });
    }

    const gameData = entry.data;

    // Gerçekten ücretsiz oyun
    if (gameData.is_free === true) {
      return NextResponse.json({
        price: 0,
        original: 0,
        discount: 0,
        isFree: true,
        isAvailable: true,
        currency: 'TRY',
      });
    }

    // Ücretli ve fiyatı var
    if (gameData.price_overview) {
      const info     = gameData.price_overview;
      const currency = info.currency || 'TRY';

      // cc=tr rağmen USD/EUR dönerse → gerçek zamanlı kur ile TRY'ye çevir
      const usdTryRate = currency !== 'TRY' ? await getUsdToTry() : 1;

      return NextResponse.json({
        price:    amountToTRY(info.final,   currency, usdTryRate),
        original: amountToTRY(info.initial, currency, usdTryRate),
        discount: info.discount_percent ?? 0,
        isFree:   info.final === 0,
        isAvailable: true,
        currency: 'TRY',
      });
    }

    // Fiyat bilgisi yok ve ücretsiz de değilse → Satışta değil/Bulunmuyor
    return NextResponse.json({
      price: null,
      isFree: false,
      isAvailable: false,
    });
  } catch (err) {
    console.error('steam-price hatası:', err.message);
    return NextResponse.json({ price: null, isFree: false, isAvailable: false });
  }
}
