import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';
const COUNTRY  = 'TR';

// Oyun fiyatlarını Steam, Epic ve Xbox'tan çeker
// GET /api/prices?title=Stardew+Valley
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');

  if (!title) {
    return NextResponse.json({ error: 'title parametresi gerekli.' }, { status: 400 });
  }

  if (!ITAD_KEY) {
    // API key yoksa örnek veri döndür (geliştirme modu)
    return NextResponse.json(mockPrices(title));
  }

  try {
    // 1. Oyunu ITAD veritabanında bul
    const searchRes = await fetch(
      `${ITAD}/games/search/v1?key=${ITAD_KEY}&q=${encodeURIComponent(title)}&limit=1`
    );
    const searchData = await searchRes.json();
    const gameId = searchData?.[0]?.id;

    if (!gameId) {
      return NextResponse.json(mockPrices(title));
    }

    // 2. Fiyatları al
    const priceRes = await fetch(
      `${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=${COUNTRY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([gameId]),
      }
    );
    const priceData = await priceRes.json();
    const gameDeals = priceData?.[0]?.deals || [];

    if (gameDeals.length === 0) {
      return NextResponse.json(mockPrices(title));
    }

    // 3. Mağazalara göre en düşük fiyatları çıkar
    const stores = {};
    for (const deal of gameDeals) {
      const shop     = deal.shop?.name?.toLowerCase() || '';
      const price    = Math.round(deal.price?.amount ?? 0);
      const regular  = Math.round(deal.regular?.amount ?? price);
      const url      = deal.url;

      if (shop.includes('steam')) {
        if (!stores.steam || price < stores.steam.price) {
          stores.steam = { price, original: regular, url };
        }
      } else if (shop.includes('epic')) {
        if (!stores.epic || price < stores.epic.price) {
          stores.epic = { price, original: regular, url };
        }
      } else if (shop.includes('xbox') || shop.includes('microsoft') || shop.includes('gamepass')) {
        if (!stores.xbox || price < stores.xbox.price) {
          stores.xbox = { price, original: regular, url };
        }
      }
    }

    // 4. Game Pass kontrolü (fiyat = 0 ise veya "xgpu" mağazası)
    const gpDeal  = gameDeals.find(d => d.shop?.name?.toLowerCase()?.includes('gamepass') || d.price?.amount === 0);
    const gamePass = !!gpDeal;

    return NextResponse.json({
      steam:         stores.steam?.price  ?? null,
      steamOriginal: stores.steam?.original ?? null,
      steamUrl:      stores.steam?.url     ?? `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`,
      epic:          stores.epic?.price   ?? null,
      epicOriginal:  stores.epic?.original ?? null,
      epicUrl:       stores.epic?.url      ?? `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(title)}`,
      xbox:          stores.xbox?.price   ?? null,
      xboxUrl:       stores.xbox?.url      ?? null,
      gamePass,
    });

  } catch (err) {
    console.error('ITAD API hatası:', err);
    // Hata durumunda mock veri döndür
    return NextResponse.json(mockPrices(title));
  }
}

// API key yokken veya hata durumunda kullanılacak örnek veri
function mockPrices(title) {
  const seed  = title.charCodeAt(0) + title.length;
  const steam = 79 + (seed % 8) * 50;
  const epic  = steam - (seed % 3 === 0 ? 20 : 0);
  const onGP  = seed % 5 === 0;

  return {
    steam,
    steamOriginal: steam + 50,
    steamUrl:      `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`,
    epic:          epic,
    epicOriginal:  epic,
    epicUrl:       `https://store.epicgames.com/en-US/browse?q=${encodeURIComponent(title)}`,
    xbox:          null,
    xboxUrl:       null,
    gamePass:      onGP,
    _mock:         true,
  };
}
