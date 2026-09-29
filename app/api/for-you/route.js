import { NextResponse } from 'next/server';

// "Senin İçin" aday havuzu — sunucu-taraflı toplama + paylaşımlı cache.
// Tür havuzları + güncel katalog. Eski sabit trend listesine bağlı değildir.
// GİZLİLİK: sıralama (owned/seen/dismissed/zevk) İSTEMCİDE kalır; buraya özel veri gelmez.
export const revalidate = 600;

const MAX_GENRES = 4;
const MAX_RESULTS = 80;

async function jsonList(url, pick) {
  try {
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();
    const list = pick(data);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// GET /api/for-you?genres=action,role-playing-games-rpg,strategy&num=20
export async function GET(request) {
  const { origin, searchParams } = new URL(request.url);
  const slugs = (searchParams.get('genres') || '')
    .split(',').map((s) => s.trim()).filter(s => /^[a-z-]{2,40}$/.test(s)).slice(0, MAX_GENRES);
  const perGenre = Math.max(1, Math.min(30, parseInt(searchParams.get('num'), 10) || 20));
  // A daily catalogue page avoids pinning every taste to page one for months.
  const page = 1 + Math.floor(Date.now() / 86400000) % 3;

  const jobs = slugs.map((slug) =>
    jsonList(`${origin}/api/games?genres=${encodeURIComponent(slug)}&num=${perGenre}&page=${page}`, (d) => d.results)
  );
  jobs.push(jsonList(`${origin}/api/games?section=new&num=20`, (d) => d.results));
  jobs.push(jsonList(`${origin}/api/games?section=popular&num=20&page=${page}`, (d) => d.results));

  const lists = await Promise.all(jobs);

  // Birleştir + id ile tekilleştir
  const map = new Map();
  // Round-robin keeps new discoveries in the pool even with four favourite genres.
  for (let i = 0; i < Math.max(0, ...lists.map(list => list.length)); i++) {
    for (const list of lists) {
      const g = list[i];
      if (g && g.id != null && !map.has(String(g.id))) map.set(String(g.id), g);
    }
  }
  const results = [...map.values()].slice(0, MAX_RESULTS);
  if (!results.length) {
    return NextResponse.json({ results: [], count: 0 }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }

  return NextResponse.json(
    { results, count: results.length },
    { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
  );
}
