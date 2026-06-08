import { NextResponse } from 'next/server';

// GET /api/steam-price?appid=271590
// Steam appdetails API'sini cc=tr ile çağırır → TRY fiyatı döndürür
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const appid = searchParams.get('appid');
  if (!appid) return NextResponse.json({ error: 'appid gerekli' }, { status: 400 });

  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=tr&filters=price_overview`,
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) return NextResponse.json({ price: null });

    const data  = await res.json();
    const entry = data?.[appid];

    // Oyun bulunamadıysa
    if (!entry?.success) return NextResponse.json({ price: null });

    // Ücretsiz oyunlar
    if (!entry.data) return NextResponse.json({ price: 0, isFree: true });

    const info = entry.data?.price_overview;
    // price_overview yoksa → oyun ücretsiz
    if (!info) return NextResponse.json({ price: 0, isFree: true });

    // Steam kuruş bazında döner (örn: 68900 = ₺689)
    return NextResponse.json({
      price:    Math.round(info.final   / 100),
      original: Math.round(info.initial / 100),
      discount: info.discount_percent ?? 0,
      isFree:   info.final === 0,
      currency: 'TRY',
    });
  } catch (err) {
    console.error('steam-price hatası:', err.message);
    return NextResponse.json({ price: null });
  }
}
