import { NextResponse } from 'next/server';

// Steam appdetails ile appid → tür listesi. Türler değişmez → uzun cache.
export const revalidate = 3600;

async function genresForAppid(appid) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&filters=genres&l=english`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 604800 } } // 7 gün (Vercel Data Cache)
    );
    if (!res.ok) return [];
    const data = await res.json();
    const entry = data?.[appid];
    if (!entry?.success) return [];
    return (entry.data?.genres || []).map((g) => g.description).filter(Boolean);
  } catch {
    return [];
  }
}

// GET /api/steam-genres?appids=730,570,...  →  { "730": ["Action","Free to Play"], ... }
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('appids') || '';
  const appids = [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 40);
  if (appids.length === 0) return NextResponse.json({});

  const out = {};
  const CONCURRENCY = 5; // Steam'i boğmadan
  for (let i = 0; i < appids.length; i += CONCURRENCY) {
    const batch = appids.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async (id) => [id, await genresForAppid(id)]));
    results.forEach(([id, genres]) => { out[id] = genres; });
  }

  return NextResponse.json(out, {
    headers: { 'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800' },
  });
}
