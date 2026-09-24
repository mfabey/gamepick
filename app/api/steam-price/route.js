import { NextResponse } from 'next/server';
import { getUsdToTry, amountToTRY } from '../../lib/exchange';

// GET /api/steam-price?appid=271590
// cc=tr ile çağırır; Steam TRY döndürmezse (USD/EUR) → güncel kur ile dönüştürür
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  const name  = searchParams.get('name') || '';
  if (!appid && !name) return NextResponse.json({ error: 'appid veya name gerekli' }, { status: 400 });

  try {
    let gameData = null;

    if (appid) {
      const res = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=basic,price_overview`,
        { next: { revalidate: 1800 } }
      );
      if (res.ok) {
        const data = await res.json();
        const entry = data?.[appid] || (data && typeof data === 'object' ? Object.values(data)[0] : null);
        if (entry?.success && entry.data) {
          gameData = entry.data;
        }
      }
    }

    // 1. Gerçekten ücretsiz oyun
    if (gameData?.is_free === true) {
      return NextResponse.json({
        price: 0,
        original: 0,
        discount: 0,
        isFree: true,
        isAvailable: true,
        currency: 'TRY',
      });
    }

    // 2. Ücretli ve price_overview var
    if (gameData?.price_overview) {
      const info     = gameData.price_overview;
      const currency = info.currency || 'TRY';
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

    // 3. Fallback: Paket/Bundle satılan veya storesearch üzerinden fiyatı bulunan oyunlar (örn: GTA V)
    const searchTerm = name || gameData?.name;
    if (searchTerm) {
      const sRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchTerm)}&cc=tr&l=turkish`,
        { next: { revalidate: 1800 } }
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        const items = sData?.items || [];
        const match = (appid ? items.find(i => String(i.id) === String(appid)) : null)
                   || items.find(i => i.name?.toLowerCase().trim() === searchTerm.toLowerCase().trim())
                   || items[0];

        if (match?.price) {
          const currency = match.price.currency || 'USD';
          const usdTryRate = currency !== 'TRY' ? await getUsdToTry() : 1;
          const finalPrice = amountToTRY(match.price.final, currency, usdTryRate);
          const initialPrice = amountToTRY(match.price.initial, currency, usdTryRate);
          const discount = match.price.discount_percent || (match.price.initial > match.price.final ? Math.round((1 - match.price.final / match.price.initial) * 100) : 0);

          return NextResponse.json({
            price: finalPrice,
            original: initialPrice,
            discount,
            isFree: match.price.final === 0,
            isAvailable: true,
            currency: 'TRY',
          });
        }
      }
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
