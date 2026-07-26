import { NextResponse } from 'next/server';

// "Senin İçin" aday havuzu — sunucu-taraflı toplama + paylaşımlı cache.
// Tür havuzları (/api/games?genres=) + trend'i birleştirir, tekilleştirir.
// GİZLİLİK: sıralama (owned/seen/dismissed/zevk) İSTEMCİDE kalır; buraya özel veri gelmez.
export const revalidate = 600;

const MAX_GENRES = 4;
const MAX_RESULTS = 80;

async function jsonList(url, pick) {
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return pick(data) || [];
  } catch {
    return [];
  }
}

// GET /api/for-you?genres=action,role-playing-games-rpg,strategy&num=20
export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  const slugs = (searchParams.get('genres') || '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_GENRES);
  const perGenre = Math.min(30, parseInt(searchParams.get('num'), 10) || 20);

  const jobs = slugs.map((slug) =>
    jsonList(`${origin}/api/games?genres=${encodeURIComponent(slug)}&num=${perGenre}&page=1`, (d) => d.results)
  );
  jobs.push(jsonList(`${origin}/api/trending`, (d) => d.results || d.games));

  const lists = await Promise.all(jobs);

  // Birleştir + id ile tekilleştir
  const map = new Map();
  for (const g of lists.flat()) {
    if (g && g.id != null && !map.has(g.id)) map.set(g.id, g);
  }
  const results = [...map.values()].slice(0, MAX_RESULTS);

  return NextResponse.json(
    { results, count: results.length },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
  );
}
