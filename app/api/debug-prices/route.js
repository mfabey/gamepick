import { NextResponse } from 'next/server';

const ITAD_KEY = process.env.ITAD_API_KEY;
const ITAD     = 'https://api.isthereanydeal.com';

export async function GET() {
  const title = 'Grand Theft Auto V';

  if (!ITAD_KEY) {
    return NextResponse.json({ hata: 'ITAD_API_KEY bulunamadı. Vercel env variables kontrol edin.' });
  }

  // 1. Arama
  const searchUrl = `${ITAD}/games/search/v1?key=${ITAD_KEY}&q=${encodeURIComponent(title)}&limit=3`;
  const searchRes  = await fetch(searchUrl).catch(e => ({ ok: false, error: e.message }));
  const searchData = searchRes.json ? await searchRes.json() : searchRes;

  const gameId = searchData?.[0]?.id;

  if (!gameId) {
    return NextResponse.json({
      adim: 'Arama başarısız',
      searchUrl,
      searchCevap: searchData,
    });
  }

  // 2. Fiyat
  const priceRes  = await fetch(`${ITAD}/games/prices/v3?key=${ITAD_KEY}&country=TR`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([gameId]),
  }).catch(e => ({ ok: false, error: e.message }));
  const priceData = priceRes.json ? await priceRes.json() : priceRes;

  return NextResponse.json({
    adim: 'Tamamlandı',
    arananOyun: title,
    bulunanId: gameId,
    searchCevap: searchData,
    fiyatCevap: priceData,
  });
}
