/**
 * Adult / NSFW / Hentai / 18+ content filter utility
 */

const ADULT_REGEX_PATTERNS = [
  /\b(?:18\+|\+18|18plus|18-plus|18_plus|r-?18\+?|r-?18g|r-?18x|21\+|adults?\s*only|mature\s*18\+?)\b/i,
  /(?:^|\s|\W)(?:18\s*\+|\+\s*18)(?:$|\s|\W)/i,
  /\b(?:being\s+a\s+dik|dik|freshwomen|college\s+kings|milfy\s+city|acting\s+lessons|treasure\s+of\s+nadia|genesis\s+order|summertime\s+saga)\b/i,
  /\b(?:xxx|x-rated|hentai|eroge|ecchi|nsfw|uncensored|ahegao|futanari|bukkake|creampie|doujinshi)\b/i,
  /\b(?:succubus|stripper|peeping|voyeur|futa|oppai|waifu|milf|femdom|pegging|dildo|masturbat\w*)\b/i,
  /\b(?:boobs?|tits?|titties|titty|pussy|vagina|penis|clitoris|orgasm|cuckold|camgirl|striptease)\b/i,
  /\b(?:erotica|erotic|porn|porno|fetish|bdsm|bondage|seduce|seduced|seduction|lingerie|thong)\b/i,
  /\b(?:yuri|yaoi|harem|lewd|panty|panties|ejaculat\w*|intercourse|sensual|sexual)\b/i,
  /\b(?:sexy\s*(?:girl|anime|waifu|babe|beach|puzzle|match|cards?|simulator)|hot\s*(?:girl|anime|babe|waifu)s?)\b/i,
  /\b(?:hentai\s*\w+|anime\s*girls?\s*18\+|erotic\s*\w+|adult\s*game|adult\s*novel|nude\s*\w+)\b/i,
  /\b(?:toys\s*18\+?|toy\s*18\+?|naughty\s*\w+|horny\s*\w+|smut|smutty|busty\s*\w+)\b/i,
  /\b(?:stepmom|stepsister|stepdaughter|stepmother|step-mom|step-sister|step-daughter|step-mother)\b/i,
  /\b(?:blowjob|handjob|footjob|cumshot|deepthroat|facial|gangbang|thicc\s*\w+)\b/i,
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
  'being a dik', 'being-a-dik', 'freshwomen', 'fresh-women', 'college kings', 'college-kings',
  'milfy city', 'milfy-city', 'acting lessons', 'acting-lessons', 'treasure of nadia',
  'genesis order', 'summertime saga', 'stepmom', 'stepsister', 'stepdaughter', 'stepmother',
  'naughty', 'horny', 'kinky', 'smut', 'smutty', 'pervert', 'perverted', 'busty',
  'blowjob', 'handjob', 'footjob', 'cumshot', 'gangbang',
];

const STANDALONE_FORBIDDEN = new Set([
  'sex', 'adult', 'adults', 'nude', 'nudity', 'naked', 'lust', 'xxx', 'rape', 'raping',
  'sadism', 'masochism', 'condom', 'babe', 'babes', 'slut', 'sluts', 'whore', 'whores',
  'pussy', 'dick', 'dik', 'cock', 'cum', 'anal', 'eroge', 'oppai', 'porno', 'lewd', 'waifu',
  'harem', 'milf', 'stripper', 'bdsm', 'yuri', 'yaoi', 'hentai', 'erotic', 'erotica',
  'ecchi', 'nsfw', 'uncensored', 'boob', 'boobs', 'tits', 'tit', 'titties', 'titty',
  'dildo', 'vagina', 'penis', 'masturbation', 'masturbate', 'clitoris', 'orgasm',
  'panties', 'panty', 'fetish', 'toys18', 'r18', '18plus', '18+', 'naughty', 'horny',
  'kinky', 'smut', 'busty', 'thicc', 'blowjob', 'handjob', 'cumshot', 'freshwomen',
]);

const FORBIDDEN_TAGS = new Set([
  'hentai', 'nsfw', 'erotica', 'erotic', 'porn', 'adult-only', 'uncensored',
  'r-18', 'r18', 'r18+', 'xxx', 'lewd', 'ecchi', 'eroge', 'visual-novel-18',
  'dating-sim-18', 'fetish', 'oppai', 'ahegao', 'futanari', 'futa', 'bukkake',
  'creampie', 'doujinshi', 'camgirl', 'striptease', 'femdom', 'pegging', 'dildo', 'masturbation'
]);

// Steam içerik tanımlayıcıları:
//   1 = Some Nudity or Sexual Content      2 = Frequent Violence or Gore
//   3 = Adult Only Sexual Content          4 = Frequent Nudity or Sexual Content
//   5 = General Mature Content
// 3 her zaman engellenir. 1 ve 4 TEK BAŞINA ayırt edici DEĞİL (ölçüldü,
// 2026-09-24): GTA V Enhanced ile Strip Fighter 5 aynı [1,2,5]'i, Persona 5
// Royal ile Sakura Beach aynı [1,5]'i taşıyor. 1/4 hepsini engellediğinde AAA
// oyunlar kayboluyordu; hiçbirini engellemediğinde cinsel içerikli oyunlar
// aramaya sızdı. Ayıran şey RESMÎ YAŞ DERECESİ — bkz. hasOfficialRating.
const FORBIDDEN_STEAM_DESCRIPTOR_IDS = new Set([3]);
const SEXUAL_CONTENT_DESCRIPTOR_IDS = new Set([1, 4]);

// Cinsel içerik sinyali taşıyan bir oyun, resmî bir kurulun (ESRB/PEGI/USK)
// derecesini taşıyorsa geçer. Ölçüm (appdetails → ratings, 2026-09-24):
//   geçmesi gereken — GTA V Enhanced esrb:m pegi:18 · Mass Effect LE esrb:m
//     pegi:18 · Persona 5 Royal esrb:m pegi:16 · Persona 3 Portable esrb:m
//     pegi:12 · Phantom Liberty (DLC) esrb:m pegi:18 · Witcher 3 DLC esrb:m
//   engellenmesi gereken — Strip Fighter 5: yalnız dejus/steam_germany/igrs
//     (Steam'in kendi ürettiği dereceler) · Sakura Beach: esrb/pegi ANAHTARI
//     var ama DEĞERİ yok
// Popülerlik tek başına ayırmıyordu: 50.000 öneri eşiği Persona 3 Portable'ı
// (4.734) ve Phantom Liberty'yi (22.363) de gizliyordu. Eşik yalnız resmî
// derecesi olmayan çok popüler PC oyunları için ikinci bir geçiş kapısı.
const OFFICIAL_RATING_BOARDS = ['esrb', 'pegi', 'usk'];
const POPULAR_RECOMMENDATIONS = 50000;

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

  // 2. Content Descriptors (Steam Descriptor 3 is Adult Only Sexual Content)
  if (steamData.content_descriptors && Array.isArray(steamData.content_descriptors.ids)) {
    if (steamData.content_descriptors.ids.some(id => FORBIDDEN_STEAM_DESCRIPTOR_IDS.has(id))) {
      return true;
    }
  }

  // 3. Genres check
  if (Array.isArray(steamData.genres)) {
    const forbiddenGenres = ['erotica', 'hentai', 'adult only', 'adults only'];
    if (steamData.genres.some(g => {
      const desc = (g.description || '').toLowerCase();
      return forbiddenGenres.some(fg => desc === fg || desc.includes('adult only') || desc.includes('hentai') || desc.includes('erotica'));
    })) {
      return true;
    }
  }

  // 4. Categories & Descriptions check (legal disclaimers on Steam 18+ adult games)
  const desc = ((steamData.short_description || '') + ' ' + (steamData.about_the_game || '')).toLowerCase();
  if (
    desc.includes('all characters are 18') ||
    desc.includes('all characters depicted in this game are 18') ||
    desc.includes('all characters are over 18') ||
    desc.includes('all characters are at least 18') ||
    desc.includes('18 years of age or older') ||
    desc.includes('uncensored patch') ||
    desc.includes('adults only') ||
    desc.includes('adult only sexual') ||
    desc.includes('explicit sexual')
  ) {
    return true;
  }

  // 5. ESRB "Adults Only"
  if (String(steamData.ratings?.esrb?.rating || '').toLowerCase() === 'ao') {
    return true;
  }

  // 6. Cinsel içerik sinyali + resmî derece yok + popüler değil
  if (hasSexualContentSignal(steamData, desc) && !hasOfficialRating(steamData) && !isPopularOnSteam(steamData)) {
    return true;
  }

  return false;
}

// Anahtarın varlığı YETMEZ: Sakura Beach'te esrb/pegi anahtarları değersiz
// duruyor. "rp" (rating pending) da henüz derece değil.
function hasOfficialRating(steamData) {
  const ratings = steamData?.ratings;
  if (!ratings || typeof ratings !== 'object') return false;
  return OFFICIAL_RATING_BOARDS.some(board => {
    const value = String(ratings[board]?.rating ?? '').trim().toLowerCase();
    return value !== '' && value !== 'rp' && value !== 'ao';
  });
}

function isPopularOnSteam(steamData) {
  return (Number(steamData?.recommendations?.total) || 0) >= POPULAR_RECOMMENDATIONS;
}

// ac93b12'de kaldırılan kontroller burada geri geliyor, ama tek başına
// engellemiyorlar: yalnız resmî derecesi olmayan ve popüler olmayan oyunda
// engelliyorlar.
function hasSexualContentSignal(steamData, desc) {
  const ids = steamData.content_descriptors?.ids;
  if (Array.isArray(ids) && ids.some(id => SEXUAL_CONTENT_DESCRIPTOR_IDS.has(id))) return true;

  const notes = String(steamData.content_descriptors?.notes || '').toLowerCase();
  if (notes && FORBIDDEN_SUBSTRINGS.some(sub => notes.includes(sub))) return true;

  if (Array.isArray(steamData.genres) && steamData.genres.some(g => {
    const d = (g.description || '').toLowerCase();
    return d === 'nudity' || d === 'sexual content';
  })) return true;

  return desc.includes('contains nudity') || desc.includes('sexual content');
}
