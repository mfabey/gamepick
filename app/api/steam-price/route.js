import { NextResponse } from 'next/server';

// Bilinen appid ile Steam TRY fiyatı çek — appdetails cc=tr garantili TRY
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  if (!appid) return NextResponse.json({ price: null });

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return NextResponse.json({ price: null });
    const data = await res.json();
    const info = data?.[appid]?.data?.price_overview;
    if (!info) return NextResponse.json({ price: null });

    return NextResponse.json({
      price:    Math.round(info.final   / 100),
      original: Math.round(info.initial / 100),
      discount: info.discount_percent ?? 0,
      isFree:   info.final === 0,
      currency: info.currency,
    });
  } catch {
    return NextResponse.json({ price: null });
  }
}
