import { NextResponse } from 'next/server';

// Oyun adından Steam fiyatı çek (storesearch ile)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name     = searchParams.get('name')     || '';
  const hasSteam = searchParams.get('hasSteam') === 'true';

  if (!name || !hasSteam) return NextResponse.json({ price: null });

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=tr&l=tr&category1=998`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return NextResponse.json({ price: null });

    const data  = await res.json();
    const items = data?.items || [];

    // İsim eşleşmesi — tam veya en yakın
    const target = name.toLowerCase().trim();
    const match  = items.find(i => i.name?.toLowerCase().trim() === target)
                || items.find(i => i.name?.toLowerCase().includes(target.slice(0, 12)))
                || items[0];

    if (!match) return NextResponse.json({ price: null });

    const p = match.price;
    if (!p)   return NextResponse.json({ price: null, isFree: true, appid: match.id });

    return NextResponse.json({
      price:    Math.round((p.final   ?? 0) / 100),
      original: Math.round((p.initial ?? 0) / 100),
      discount: p.discount_percent ?? 0,
      isFree:   (p.final ?? -1) === 0,
      appid:    match.id,
    });
  } catch (err) {
    return NextResponse.json({ price: null });
  }
}
