/**
 * Adult / NSFW / Hentai / 18+ content filter utility
 */

const ADULT_REGEX_PATTERNS = [
  /\b(?:18\+|\+18|18plus|18-plus|18_plus|r-?18\+?|r-?18g|r-?18x|21\+|adults?\s*only|mature\s*18\+?)\b/i,
  /(?:^|\s|\W)(?:18\s*\+|\+\s*18)(?:$|\s|\W)/i,
  /\b(?:xxx|x-rated|hentai|eroge|ecchi|nsfw|uncensored|ahegao|futanari|bukkake|creampie|doujinshi)\b/i,
  /\b(?:succubus|stripper|peeping|voyeur|futa|oppai|waifu|milf|femdom|pegging|dildo|masturbat\w*)\b/i,
  /\b(?:boobs?|tits?|titties|titty|pussy|vagina|penis|clitoris|orgasm|cuckold|camgirl|striptease)\b/i,
  /\b(?:erotica|erotic|porn|porno|fetish|bdsm|bondage|seduce|seduced|seduction|lingerie|thong)\b/i,
  /\b(?:yuri|yaoi|harem|lewd|panty|panties|ejaculat\w*|intercourse|sensual|sexual)\b/i,
  /\b(?:sexy\s*(?:girl|anime|waifu|babe|beach|puzzle|match|cards?|simulator)|hot\s*(?:girl|anime|babe|waifu)s?)\b/i,
  /\b(?:hentai\s*\w+|anime\s*girls?\s*18\+|erotic\s*\w+|adult\s*game|adult\s*novel|nude\s*\w+)\b/i,
  /\b(?:toys\s*18\+?|toy\s*18\+?)\b/i,
];

const FORBIDDEN_SUBSTRINGS = [
  'hentai', 'porn', 'porno', 'erotica', 'erotic', 'eroge', 'ecchi', 'nsfw', 'uncensored',
  'boobs', 'boob', 'tits', 'titties', 'oppai', 'vagina', 'penis', 'dildo', 'masturbat',
  'panty', 'panties', 'harem', 'lewd', 'stripper', 'waifu', 'milf', 'succubus', 'bdsm',
  'bondage', 'seduce', 'seduced', 'seduction', 'camgirl', 'clitoris', 'orgasm', 'cuckold',
  'yuri', 'yaoi', 'striptease', 'ahegao', 'futanari', 'futa', 'bukkake', 'creampie',
  'ejaculat', 'voyeur', 'lingerie', 'thong', 'intercourse', 'fetish', 'sensual', 'sexual',
  'r18', 'r-18', '18+', '+18', '18plus', '18-plus', '18_plus', 'adultsonly', 'adult-only',
  'erocart', 'doujin', 'doujinshi', 'nudity', 'naked', 'submissive', 'dominatrix',
  'deepthroat', 'femdom', 'footfetish', 'foot-fetish', 'pegging', 'incest',
];

const STANDALONE_FORBIDDEN = new Set([
  'sex', 'adult', 'adults', 'nude', 'nudity', 'naked', 'lust', 'xxx', 'rape', 'raping',
  'sadism', 'masochism', 'condom', 'babe', 'babes', 'slut', 'sluts', 'whore', 'whores',
  'pussy', 'dick', 'cock', 'cum', 'anal', 'eroge', 'oppai', 'porno', 'lewd', 'waifu',
  'harem', 'milf', 'stripper', 'bdsm', 'yuri', 'yaoi', 'hentai', 'erotic', 'erotica',
  'ecchi', 'nsfw', 'uncensored', 'boob', 'boobs', 'tits', 'tit', 'titties', 'titty',
  'dildo', 'vagina', 'penis', 'masturbation', 'masturbate', 'clitoris', 'orgasm',
  'panties', 'panty', 'fetish', 'toys18', 'r18', '18plus', '18+',
]);

const FORBIDDEN_TAGS = new Set([
  'hentai', 'nsfw', 'erotica', 'erotic', 'porn', 'adult-only', 'adult', 'uncensored', 'sex',
  'r-18', 'r18', 'xxx', 'naked', 'lewd', 'ecchi', 'lust', 'fetish', 'boobs', 'boob', 'ass',
  'butt', 'nudity', 'sexual-content', 'mature', 'eroge', 'visual-novel-18', 'sexual',
  'dating-sim-18', '18+', 'r18+', 'mature-content', 'sexual-themes',
]);

const FORBIDDEN_STEAM_DESCRIPTOR_IDS = new Set([1, 3, 4, 5]);

export function isAdultTitleOrSlug(name, slug) {
  const rawName = String(name || '');
  const rawSlug = String(slug || '');
  const n = rawName.toLowerCase();
  const s = rawSlug.toLowerCase();

  // 1. Regex pattern matches
  if (ADULT_REGEX_PATTERNS.some(re => re.test(rawName) || re.test(rawSlug) || re.test(n) || re.test(s))) {
    return true;
  }

  // 2. Substring matches
  if (FORBIDDEN_SUBSTRINGS.some(sub => n.includes(sub) || s.includes(sub))) {
    return true;
  }

  // 3. Standalone words
  const nameWords = n.split(/[^a-z0-9+]+/);
  const slugWords = s.split(/[^a-z0-9+]+/);
  if (nameWords.some(w => STANDALONE_FORBIDDEN.has(w)) || slugWords.some(w => STANDALONE_FORBIDDEN.has(w))) {
    return true;
  }

  return false;
}

export function isAdultContent(game) {
  if (!game) return false;
  if (isAdultTitleOrSlug(game.name, game.slug || game.rawgSlug)) {
    return true;
  }

  // 1. RAWG Tags
  if (game.tags && Array.isArray(game.tags)) {
    const hasForbiddenTag = game.tags.some(t => {
      const tagSlug = (t.slug || '').toLowerCase();
      const tagName = (t.name || '').toLowerCase();
      if (FORBIDDEN_TAGS.has(tagSlug) || FORBIDDEN_TAGS.has(tagName)) return true;
      if (FORBIDDEN_SUBSTRINGS.some(sub => tagSlug.includes(sub) || tagName.includes(sub))) return true;
      return false;
    });
    if (hasForbiddenTag) return true;
  }

  // 2. RAWG Genres
  if (game.genres && Array.isArray(game.genres)) {
    const forbiddenGenres = ['mature-only', 'adult-only', 'erotica', 'hentai', 'sexual'];
    const hasForbiddenGenre = game.genres.some(g => {
      const genreSlug = (g.slug || g.name || '').toLowerCase();
      return forbiddenGenres.some(fg => genreSlug.includes(fg));
    });
    if (hasForbiddenGenre) return true;
  }

  // 3. Age / ESRB Rating
  if (game.esrb_rating?.slug === 'adults-only' || game.esrb_rating?.id === 5) {
    return true;
  }

  return false;
}

export function isSteamDataAdult(steamData) {
  if (!steamData) return false;

  // 1. Title check
  if (steamData.name && isAdultTitleOrSlug(steamData.name, steamData.name)) {
    return true;
  }

  // 2. Content Descriptors
  if (steamData.content_descriptors && Array.isArray(steamData.content_descriptors.ids)) {
    if (steamData.content_descriptors.ids.some(id => FORBIDDEN_STEAM_DESCRIPTOR_IDS.has(id))) {
      return true;
    }
  }
  if (steamData.content_descriptors?.notes) {
    const notes = String(steamData.content_descriptors.notes).toLowerCase();
    if (FORBIDDEN_SUBSTRINGS.some(sub => notes.includes(sub))) return true;
  }

  // 3. Genres check
  if (Array.isArray(steamData.genres)) {
    const forbiddenGenres = ['nudity', 'sexual content', 'erotica', 'hentai', 'adult', 'mature'];
    if (steamData.genres.some(g => {
      const desc = (g.description || '').toLowerCase();
      return forbiddenGenres.some(fg => desc.includes(fg));
    })) {
      return true;
    }
  }

  // 4. Categories & Descriptions check (legal disclaimers on Steam 18+ games)
  const desc = ((steamData.short_description || '') + ' ' + (steamData.about_the_game || '')).toLowerCase();
  if (
    desc.includes('all characters are 18') ||
    desc.includes('all characters depicted in this game are 18') ||
    desc.includes('all characters are over 18') ||
    desc.includes('all characters are at least 18') ||
    desc.includes('18 years of age or older') ||
    desc.includes('uncensored patch') ||
    desc.includes('adult only') ||
    desc.includes('contains nudity') ||
    desc.includes('sexual content') ||
    desc.includes('explicit sexual')
  ) {
    return true;
  }

  return false;
}
