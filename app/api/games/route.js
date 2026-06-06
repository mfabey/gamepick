import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// Oyun arama veya tek oyun detayı döndürür
// GET /api/games?q=stardew&budget=500
// GET /api/games?id=3498
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q      = searchParams.get('q');
  const id     = searchParams.get('id');
  const budget = parseInt(searchParams.get('budget') || '9999');

  if (!RAWG_KEY) {
    return NextResponse.json({ error: 'RAWG_API_KEY eksik. .env.local dosyasını kontrol edin.' }, { status: 500 });
  }

  try {
    // Tek oyun detayı
    if (id) {
      const res  = await fetch(`${BASE}/games/${id}?key=${RAWG_KEY}`);
      const data = await res.json();

      // Game Pass kontrolü (Xbox platformu + bilinen Game Pass oyunları)
      const platforms = data.platforms?.map(p => p.platform.slug) || [];
      const isOnXbox  = platforms.some(p => p.includes('xbox'));

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
          gamePass:    false, // ITAD'dan fiyat alındığında güncellenir
          rating:      data.rating,
        },
      });
    }

    // Arama
    const searchQuery = q || 'popular';
    const url = `${BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=20&ordering=-rating`;
    const res  = await fetch(url);
    const data = await res.json();

    const results = (data.results || []).map(game => {
      const platforms = game.platforms?.map(p => p.platform.slug) || [];
      return {
        id:          game.id,
        name:        game.name,
        image:       game.background_image,
        metacritic:  game.metacritic,
        released:    game.released,
        genres:      game.genres?.map(g => translateGenre(g.name)).slice(0, 3),
        platforms:   platforms,
        gamePass:    false,       // Gerçek Game Pass verisi ITAD'dan gelir
        price:       null,        // Fiyat ITAD'dan gelir — detay sayfasında yüklenir
        onSale:      false,
        thumbColor:  randomColor(game.id),
      };
    });

    return NextResponse.json({ results });

  } catch (err) {
    console.error('RAWG API hatası:', err);
    return NextResponse.json({ error: 'Oyunlar yüklenemedi.', results: [] }, { status: 500 });
  }
}

// Türkçe tür isimleri
function translateGenre(name) {
  const map = {
    'Action': 'Aksiyon',
    'RPG': 'RPG',
    'Strategy': 'Strateji',
    'Simulation': 'Simülasyon',
    'Adventure': 'Macera',
    'Puzzle': 'Bulmaca',
    'Shooter': 'Nişancı',
    'Platformer': 'Platform',
    'Racing': 'Yarış',
    'Fighting': 'Dövüş',
    'Sports': 'Spor',
    'Indie': 'Indie',
    'Casual': 'Gündelik',
    'Family': 'Aile',
    'Educational': 'Eğitim',
  };
  return map[name] || name;
}

// Oyun ID'sine göre sabit renk üretir (kapak resmi yoksa kullanılır)
function randomColor(id) {
  const colors = ['#1a1a2e', '#16213e', '#0f3460', '#1b1b2f', '#192a56', '#2c3e50', '#1a1a1a', '#2d2d2d'];
  return colors[id % colors.length];
}
