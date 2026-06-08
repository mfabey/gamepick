import { NextResponse } from 'next/server';

// Steam fiyatını sunucu tarafından çeker (CORS yok)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');

  if (!appid) return NextResponse.json({ error: 'appid eksik' }, { status: 400 });

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error(`Steam HTTP ${res.status}`);
    const data = await res.json();
    const info = data?.[appid]?.data?.price_overview;

    if (!info) return NextResponse.json({ price: null });

    return NextResponse.json({
      price: {
        store:    'Steam',
        price:    Math.round(info.final   / 100),
        original: Math.round(info.initial / 100),
        discount: info.discount_percent,
        url:      `https://store.steampowered.com/app/${appid}`,
        isFree:   info.final === 0,
      }
    });
  } catch (err) {
    console.error('Steam price hatasi:', err.message);
    return NextResponse.json({ price: null, error: err.message });
  }
}
