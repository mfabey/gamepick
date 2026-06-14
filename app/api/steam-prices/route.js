import { NextResponse } from 'next/server';

const BATCH_SIZE = 100; // Steam handles ~100 appids per request fine

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appidsParam = searchParams.get('appids');
  if (!appidsParam) return NextResponse.json({ error: 'appids required' }, { status: 400 });

  const idList = [...new Set(appidsParam.split(',').map(s => s.trim()).filter(Boolean))];
  if (idList.length === 0) return NextResponse.json({});

  const priceMap = {};

  // Batch requests to Steam store API
  for (let i = 0; i < idList.length; i += BATCH_SIZE) {
    const batch = idList.slice(i, i + BATCH_SIZE);
    const url = `https://store.steampowered.com/api/appdetails?appids=${batch.join(',')}&cc=tr&l=turkish&filters=price_overview`;

    try {
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'tr-TR,tr;q=0.9' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;

      const data = await res.json();

      for (const appid of batch) {
        const entry = data[appid];
        if (!entry?.success) continue;
        const d = entry.data;

        if (d.is_free) {
          priceMap[appid] = { isFree: true, current: 0, original: 0, discount: 0 };
        } else if (d.price_overview) {
          const p = d.price_overview;
          priceMap[appid] = {
            isFree: false,
            current: p.final / 100,        // kuruş → TL
            original: p.initial / 100,
            discount: p.discount_percent,
            currentFormatted: p.final_formatted,
            originalFormatted: p.initial_formatted,
          };
        }
        // No price_overview + not free → delisted / not available in TR
      }
    } catch {
      // Timeout or network error — skip this batch, continue with next
    }
  }

  return NextResponse.json(priceMap);
}
