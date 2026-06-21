const trendGames = [
  {
    id:            'rawg_4704690',
    rawgId:        4704690,
    rawgSlug:      'meccha-chameleon',
    name:          'Meccha Chameleon',
    image:         'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/163e2a742e5fb8e1f5d1e3a890da98f04ab809d4/header.jpg?t=1781108224',
  },
  {
    id: 'rawg_41494',
    name: 'Cyberpunk 2077',
  }
];

const popularGames = [
  {
    id: 'rawg_730',
    name: 'Counter-Strike 2',
  },
  {
    id: 'rawg_4704690',
    name: 'MECCHA CHAMELEON',
    image: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/4704690/header.jpg'
  },
  {
    id: 'rawg_1091500',
    name: 'Cyberpunk 2077',
  }
];

const combined = [...trendGames, ...popularGames];

const cleaned = combined.filter(g => g && g.name);
const uniqueMap = new Map();

for (const game of cleaned) {
  const nameKey = game.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const existing = uniqueMap.get(nameKey);

  if (existing) {
    const existingHasImg = existing.image && !existing.image.includes('placeholder') && !existing.image.includes('capsule') && !existing.image.includes('logo');
    const currentHasImg = game.image && !game.image.includes('placeholder') && !game.image.includes('capsule') && !game.image.includes('logo');
    if (!existingHasImg && currentHasImg) {
      uniqueMap.set(nameKey, game);
    }
  } else {
    uniqueMap.set(nameKey, game);
  }
}

const arr = Array.from(uniqueMap.values());
console.log('Unique Array Names:', arr.map(g => g.name));
