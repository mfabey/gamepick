import { NextResponse } from 'next/server';

const RAWG_KEY = process.env.RAWG_API_KEY;
const BASE     = 'https://api.rawg.io/api';

// Bazı oyunlar SteamSpy'da farklı isimle geçiyor, RAWG'da bulabilmek için düzelt
const NAME_FIXES = {
  'Counter-Strike 2':           'Counter-Strike 2',
  'PUBG: BATTLEGROUNDS':        'PLAYERUNKNOWN\'S BATTLEGROUNDS',
  'Apex Legends™':              'Apex Legends',
  'Tom Clancy\'s Rainbow Six® Siege': 'Tom Clancy\'s Rainbow Six Siege',
  'Baldur\'s Gate 3':           'Baldur\'s Gate 3',
  'Grand Theft Auto V':         'Grand Theft Auto V',
  'Cyberpunk 2077':             'Cyberpunk 2077',
  'Elden Ring':                 'Elden Ring',
  'Dead by Daylight':           'Dead by Daylight',
  'Warframe':                   'Warframe',
  'Team Fortress 2':            'Team Fortress 2',
  'Rust':                       'Rust',
  'Valheim':                    'Valheim',
  'Lethal Company':             'Lethal Company',
  'Palworld':                   'Palworld',
};

// Bilinen ücretsiz oyunlar
const FREE_SLUGS = new Set([
  'apex-legends', 'warframe', 'dota-2', 'team-fortress-2',
  'path-of-exile', 'destiny-2', 'war-thunder', 'world-of-tanks',
  'enlisted', 'lost-ark', 'genshin-impact',
]);

async function searchRawg(name) {
  const fixedName = NAME_FIXES[name] || name;
  const url = `${BASE}/games?key=${RAWG_KEY}&search=${encodeURIComponent(fixedName)}&page_size=3&search_precise=true`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return null;
  const data = await res.json();

  // İsim benzerliği kontrol et — yanlış eşleşmeleri önle
  const results = data.results || [];
  const nameNorm = fixedName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Önce tam eşleşme dene
  let match = results.find(g => {
    const gn = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return gn === nameNorm;
  });

  // Yoksa başlayan eşleşme
  if (!match) {
    match = results.find(g => {
      const gn = g.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return gn.startsWith(nameNorm.slice(0, 8)) || nameNorm.startsWith(gn.slice(0, 8));
    });
  }

  // Yoksa ilk sonuç
  if (!match) match = results[0];

  if (!match || !match.background_image) return null;
  return match;
}

function formatGame(rawgGame, steamspyGame) {
  const steamStore = rawgGame.stores?.find(s => s.store?.slug === 'steam');
  const epicStore  = rawgGame.stores?.find(s => s.store?.slug === 'epic-games');
  const hasSteam   = !!steamStore || !!steamspyGame?.appid;
  const hasEpic    = !!epicStore;
  const isFree     = FREE_SLUGS.has(rawgGame.slug)
    || !!rawgGame.tags?.some(t => t.slug === 'free-to-play');

  return {
    id:            'rawg_' + rawgGame.id,
    rawgId:        rawgGame.id,
    rawgSlug:      rawgGame.slug,
    name:          rawgGame.name,
    image:         rawgGame.background_image,
    metacritic:    rawgGame.metacritic || null,
    reviewScore:   rawgGame.rating ? Math.round(rawgGame.rating * 20) : 0,
    totalReviews:  rawgGame.ratings_count || 0,
    isFree,
    onSale:        false,
    price:         null,
    noData:        true,
    platforms:     ['pc'],
    hasSteam,
    hasEpic,
    hasStores:     true,
    hasMultipleStores: hasSteam && hasEpic,
    genres:        (rawgGame.genres || []).map(g => g.name).slice(0, 3),
    released:      rawgGame.released || null,
    // Trend verisi
    players2weeks: steamspyGame?.players_2weeks || 0,
    ccu:           steamspyGame?.ccu || 0,
    trendSource:   'steamspy',
  };
}

export async function GET() {
  try {
    if (!RAWG_KEY) throw new Error('RAWG_API_KEY eksik');

    // ── 1. SteamSpy: son 2 haftanın en çok oynanan oyunları ───────────────
    const spyRes = await fetch(
      'https://steamspy.com/api.php?request=top100in2weeks',
      { next: { revalidate: 21600 }, signal: AbortSignal.timeout(8000) }
    );

    if (!spyRes.ok) throw new Error('SteamSpy yanıt vermedi');

    const spyData = await spyRes.json();

    // players_2weeks'e göre sırala → top 20
    const top20 = Object.values(spyData)
      .filter(g => g.name && g.players_2weeks > 0)
      .sort((a, b) => (b.players_2weeks || 0) - (a.players_2weeks || 0))
      .slice(0, 20);

    // ── 2. RAWG'da her oyunu ara (paralel) ────────────────────────────────
    const rawgResults = await Promise.allSettled(
      top20.map(async sg => {
        const rawg = await searchRawg(sg.name);
        if (!rawg) return null;
        return formatGame(rawg, sg);
      })
    );

    const results = rawgResults
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value)
      .slice(0, 16);

    if (results.length < 4) throw new Error('Yeterli sonuç yok, fallback\'e geç');

    return NextResponse.json({
      results,
      total:  results.length,
      source: 'steamspy+rawg',
      label:  'Bu hafta en çok oynanan',
    });

  } catch (err) {
    // ── Fallback: RAWG'dan son 30 günün yüksek puanlı oyunları ────────────
    console.warn('Trending fallback:', err.message);
    try {
      const today    = new Date().toISOString().slice(0, 10);
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const res  = await fetch(
        `${BASE}/games?key=${RAWG_KEY}&ordering=-added&dates=${monthAgo},${today}&metacritic=70,100&page_size=16`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();

      const results = (data.results || []).map(g => ({
        id:           'rawg_' + g.id,
        rawgId:       g.id,
        rawgSlug:     g.slug,
        name:         g.name,
        image:        g.background_image,
        metacritic:   g.metacritic || null,
        reviewScore:  g.rating ? Math.round(g.rating * 20) : 0,
        totalReviews: g.ratings_count || 0,
        isFree:       false,
        onSale:       false,
        price:        null,
        noData:       true,
        platforms:    ['pc'],
        hasSteam:     true,
        hasEpic:      false,
        hasStores:    true,
        genres:       (g.genres || []).map(x => x.name).slice(0, 3),
        released:     g.released || null,
        trendSource:  'rawg-fallback',
      }));

      return NextResponse.json({ results, total: results.length, source: 'rawg-fallback' });
    } catch (e2) {
      return NextResponse.json({ results: [], error: e2.message }, { status: 500 });
    }
  }
}
