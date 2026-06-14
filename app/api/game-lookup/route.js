import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const name = searchParams.get('name');
  if (!name) return NextResponse.redirect(`${origin}/games`);

  try {
    const res = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(name)}&page_size=1&search_exact=true`,
      { cache: 'no-store', signal: AbortSignal.timeout(6000) }
    );
    const data = await res.json();
    const game = data.results?.[0];

    if (game?.slug) {
      return NextResponse.redirect(`${origin}/game/rawg/${game.slug}`);
    }

    // Exact match bulunamadıysa normal arama ile dene
    const res2 = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(name)}&page_size=1`,
      { cache: 'no-store', signal: AbortSignal.timeout(6000) }
    );
    const data2 = await res2.json();
    const game2 = data2.results?.[0];

    if (game2?.slug) {
      return NextResponse.redirect(`${origin}/game/rawg/${game2.slug}`);
    }
  } catch {
    // RAWG erişilemez — arama sayfasına düş
  }

  // Oyun bulunamadıysa arama sayfasına yönlendir
  return NextResponse.redirect(`${origin}/games?q=${encodeURIComponent(name)}`);
}
