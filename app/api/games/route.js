import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q        = searchParams.get('q');
  const id       = searchParams.get('id');
  const section  = searchParams.get('section');   // free | new | trending
  const genre    = searchParams.get('genre');      // action, rpg, etc.
  const ordering = searchParams.get('ordering');   // -rating, -released, -added, name
  const platform = searchParams.get('platform');   // 1=PC, 2=PlayStation, 3=Xbox
  const pageSize = parseInt(searchParams.get('page_size') || '24');
  const page     = parseInt(searchParams.get('page') || '1');

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik.' }, { status: 500 });
  }

  try {
    // Tek oyun detayı
    if (id) {
      const res  = await fetch(`${BASE}/games/${id}?key=${RAWG_KEY}`);
      const data = await res.json();
      const platforms = data.platforms?.map(p => p.platform.slug) || [];
      return NextResponse.json({
        game: {
          id:          data.id,
          name:        data.name,
          image:       data.background_image,
          description: data.description,
          metacritic:  data.metacritic,
          released:    data.released,
          playtime:    data.playtime,
          developer:   data.developers?.[0]?.name,
          publisher:   data.publishers?.[0]?.name,
          genres:      data.genres?.map(g => translateGenre(g.name)),
          platforms:   platforms,
          gamePass:    false,
          rating:      data.rating,
        },
      });
    }

    // Bölüm bazlı sorgular
    let url;
    if (section === 'free') {
      url = `${BASE}/games?key=${RAWG_KEY}&tags=free-to-play&page_size=${pageSize}&page=${page}&ordering=-added`;
    } else if (section === 'new') {
      const today = new Date();
      const past  = new Date(today);
      past.setMonth(past.getMonth() - 4);
      const from = past.toISOString().slice(0, 10);
      const to   = today.toISOString().slice(0, 10);
      url = `${BASE}/games?key=${RAWG_KEY}&dates=${from},${to}&page_size=${pageSize}&page=${page}&ordering=-added&metacritic=60,100`;
    } else if (section === 'trending') {
      url = `${BASE}/games?key=${RAWG_KEY}&page_size=${pageSize}&page=${page}&ordering=-added&metacritic=70,100`;
    } else if (q) {
      let params = `search=${encodeURIComponent(q)}&page_size=${pageSize}&page=${page}`;
      if (ordering) params += `&ordering=${ordering}`;
      else params += `&ordering=-rating`;
      if (genre)    params += `&genres=${genre}`;
      if (platform) params += `&platforms=${platform}`;
      url = `${BASE}/games?key=${RAWG_KEY}&${params}`;
    } else {
      let params = `page_size=${pageSize}&page=${page}&ordering=${ordering || '-added'}&metacritic=60,100`;
      if (genre)    params += `&genres=${genre}`;
      if (platform) params += `&platforms=${platform}`;
      url = `${BASE}/games?key=${RAWG_KEY}&${params}`;
    }

    const res  = await fetch(url);
    const data = await res.json();

    const results = (data.results || []).map(game => ({
      id:         game.id,
      name:       game.name,
      image:      game.background_image,
      metacritic: game.metacritic,
      released:   game.released,
      genres:     game.genres?.map(g => translateGenre(g.name)).slice(0, 3),
      platforms:  game.platforms?.map(p => p.platform.slug) || [],
      gamePass:   false,
      price:      null,
      onSale:     false,
      isFree:     section === 'free',
      thumbColor: '#f5f5f5',
    }));

    return NextResponse.json({ results, count: data.count });

  } catch (err) {
    console.error('RAWG API hatası:', err);
    return NextResponse.json({ error: 'Oyunlar yüklenemedi.', results: [] }, { status: 500 });
  }
}

function translateGenre(name) {
  const map = {
    'Action': 'Aksiyon', 'RPG': 'RPG', 'Strategy': 'Strateji',
    'Simulation': 'Simülasyon', 'Adventure': 'Macera', 'Puzzle': 'Bulmaca',
    'Shooter': 'Nişancı', 'Platformer': 'Platform', 'Racing': 'Yarış',
    'Fighting': 'Dövüş', 'Sports': 'Spor', 'Indie': 'Indie',
    'Casual': 'Gündelik', 'Family': 'Aile', 'Educational': 'Eğitim',
    'Massively Multiplayer': 'MMO', 'Card': 'Kart', 'Board Games': 'Masa Oyunu',
  };
  return map[name] || name;
}
