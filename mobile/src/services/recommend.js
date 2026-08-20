// ─────────────────────────────────────────────────────────────────────────────
// Öneri motoru — SAF (ağdan bağımsız), test edilebilir.
// Bir oyunu zevk profiline (tür ağırlıkları) göre puanlar ve adayları sıralar.
// ─────────────────────────────────────────────────────────────────────────────

// Tür adı → RAWG genre slug (aday üretiminde /api/games?genres=<slug> için)
export const GENRE_SLUG = {
  'Action': 'action',
  'RPG': 'role-playing-games-rpg',
  'Role-Playing': 'role-playing-games-rpg',
  'Adventure': 'adventure',
  'Strategy': 'strategy',
  'Shooter': 'shooter',
  'Puzzle': 'puzzle',
  'Racing': 'racing',
  'Sports': 'sports',
  'Indie': 'indie',
  'Simulation': 'simulation',
  'Fighting': 'fighting',
  'Arcade': 'arcade',
  'Platformer': 'platformer',
  'Casual': 'casual',
  'Family': 'family',
  'Board Games': 'board-games',
  'Card': 'card',
  'Educational': 'educational',
  'Massively Multiplayer': 'massively-multiplayer',
};

// Aday kaynakları tür adlarını KARIŞIK dilde veriyor (RAWG İngilizce; curated/trending
// pinned + static-free Türkçe). Zevk profili İngilizce. Kanonik (İngilizce) forma indirge
// → skorlama ve çeşitlilik birleşik sözlük kullanır. Eşleşmeyen değişmeden geçer.
export const GENRE_CANON = {
  'Aksiyon': 'Action',
  'Macera': 'Adventure',
  'Bağımsız': 'Indie',
  'Nişancı': 'Shooter',
  'Atıcılık': 'Shooter',
  'Strateji': 'Strategy',
  'Simülasyon': 'Simulation',
  'Bulmaca': 'Puzzle',
  'Spor': 'Sports',
  'Yarış': 'Racing',
  'Platform': 'Platformer',
  'Dövüş': 'Fighting',
  'Rol Yapma': 'RPG',
  'Kart': 'Card',
  'Aile': 'Family',
  'Gündelik': 'Casual',
};

export function canonicalGenre(name) {
  return GENRE_CANON[name] || name;
}

// En sevilen türlerden RAWG slug listesi (aday üretimi için)
export function genreSlugsFor(topGenres = [], max = 3) {
  const slugs = [];
  for (const item of topGenres) {
    const name = typeof item === 'string' ? item : item?.name;
    const slug = GENRE_SLUG[name];
    if (slug && !slugs.includes(slug)) slugs.push(slug);
    if (slugs.length >= max) break;
  }
  return slugs;
}

export function normalizeName(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ratingNorm(game) {
  if (game.metacritic) return Math.min(1, game.metacritic / 100);
  if (game.reviewScore) return Math.min(1, game.reviewScore / 100);
  return 0.5; // bilinmiyorsa nötr
}

const YEAR = 365 * 86400000;

/**
 * Bir oyunu zevk profiline göre puanlar. Yüksek = daha uygun.
 * @param genreWeights normalize tür ağırlıkları (toplam ~1)
 */
export function scoreGame(game, genreWeights = {}, { ownedNames, seenIds } = {}) {
  // Tür eşleşmesi — ana kişiselleştirme sinyali (kanonik tür ile)
  let genreMatch = 0;
  for (const g of game.genres || []) genreMatch += genreWeights[canonicalGenre(g)] || 0;
  genreMatch = Math.min(1, genreMatch); // birden çok eşleşmede doygunluk

  let score = genreMatch * 1.0 + ratingNorm(game) * 0.3;

  // İndirim / ücretsiz teşviki
  if (game.isFree) score += 0.12;
  if (game.onSale) score += 0.10;

  // Yenilik teşviki (son 1 yıl)
  if (game.released) {
    const age = Date.now() - new Date(game.released).getTime();
    if (age >= 0 && age < YEAR) score += 0.06 * (1 - age / YEAR);
  }

  // Zaten sahip olunan → ceza; yakında gösterilmiş → çeşitlilik cezası
  if (ownedNames?.has?.(normalizeName(game.name))) score -= 0.6;
  if (seenIds?.has?.(String(game.id))) score -= 0.25;

  // Görsel yoksa veya boşsa puanı ciddi şekilde düşürerek listenin en arkasına itilmesini sağla
  const hasImage = !!(game && game.image && typeof game.image === 'string' && game.image.trim() !== '');
  if (!hasImage) {
    score -= 10.0;
  }

  return score;
}

/**
 * Adayları tekilleştirir, puanlar ve ÇEŞİTLİLİK ile sıralar; ilk `limit` oyunu döner.
 *
 * MMR-lite: her adımda `alâka − diversity·(seçilenlerle kanonik tür örtüşmesi)` en
 * yükseği seç. İlk seçim daima en alâkalı (örtüşme 0); sonrası alâka↔çeşitlilik dengesi.
 * @param diversity 0 = saf alâka (kapalı); ~0.2 = dengeli çeşitlilik.
 */
export function rankCandidates(candidates, { genreWeights = {}, ownedNames, seenIds, dismissedIds, limit = 20, diversity = 0.2 } = {}) {
  const map = new Map();
  for (const g of candidates || []) {
    if (!g || g.id == null || map.has(g.id)) continue;
    if (dismissedIds?.has?.(String(g.id))) continue; // "İlgilenmiyorum" → sert eleme
    map.set(g.id, g);
  }

  const pool = [...map.values()]
    .map((g) => ({ g, s: scoreGame(g, genreWeights, { ownedNames, seenIds }) }))
    .sort((a, b) => b.s - a.s);

  if (!diversity || pool.length <= 1) return pool.slice(0, limit).map((x) => x.g);

  // Greedy çeşitli seçim: seçilen türlerin tekrarını cezalandır
  const picked = [];
  const genreCount = {};
  while (picked.length < limit && pool.length) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const { g, s } = pool[i];
      let overlap = 0;
      for (const gen of g.genres || []) overlap += genreCount[canonicalGenre(gen)] || 0;
      const adj = s - diversity * overlap;
      if (adj > bestAdj) { bestAdj = adj; bestIdx = i; }
    }
    const [chosen] = pool.splice(bestIdx, 1);
    picked.push(chosen.g);
    for (const gen of chosen.g.genres || []) {
      const c = canonicalGenre(gen);
      genreCount[c] = (genreCount[c] || 0) + 1;
    }
  }
  return picked;
}
