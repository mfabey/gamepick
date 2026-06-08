import { NextResponse } from 'next/server';

// storesearch → appid al, sonra appdetails ile TRY fiyatı çek
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name     = searchParams.get('name')     || '';
  const hasSteam = searchParams.get('hasSteam') === 'true';

  if (!name || !hasSteam) return NextResponse.json({ price: null });

  try {
    // 1. Appid bul
    const searchRes = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=tr&l=tr&category1=998`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return NextResponse.json({ price: null });

    const searchData = await searchRes.json();
    const items      = searchData?.items || [];

    const target = name.toLowerCase().trim();
    const match  = items.find(i => i.name?.toLowerCase().trim() === target)
                || items.find(i => i.name?.toLowerCase().includes(target.slice(0, 10)))
                || items[0];

    if (!match?.id) return NextResponse.json({ price: null });

    // 2. appdetails ile TRY fiyatı çek (storesearch USD dönebilir, appdetails cc=tr ile TRY verir)
    const detailRes = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${match.id}&cc=tr&filters=price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!detailRes.ok) return NextResponse.json({ price: null });

    const detailData = await detailRes.json();
    const info       = detailData?.[match.id]?.data?.price_overview;

    if (!info) return NextResponse.json({ price: null, isFree: true, appid: match.id });

    return NextResponse.json({
      price:    Math.round(info.final   / 100),
      original: Math.round(info.initial / 100),
      discount: info.discount_percent ?? 0,
      isFree:   info.final === 0,
      appid:    match.id,
    });
  } catch (err) {
    return NextResponse.json({ price: null });
  }
}
