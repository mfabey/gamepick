/**
 + Adult/NSFW/Hentai content filter utility
 */

export function isAdultContent(game) {
  if (!game) return false;
  const name = (game.name || '').toLowerCase();
  const slug = (game.slug || '').toLowerCase();

  // 1. Kısmi eşleşmesi sakıncalı kelimeler (herhangi bir kelimenin içinde geçmesi durumunda elenir)
  const forbiddenWords = [
    'hentai', 'porn', 'erotica', 'erotic', 'nsfw', 'uncensored', 'boobs', 'boob', 'r18', 'r-18', 
    'fetish', 'vagina', 'penis', 'dildo', 'masturbat', 'panty', 'panties', 'harem', 'lewd', 
    'stripper', 'waifu', 'milf', 'succubus', 'bdsm', 'bondage', 'seduce', 'seduced', 'seduction', 
    'camgirl', 'clitoris', 'orgasm', 'cuckold', 'yuri', 'yaoi', 'striptease'
  ];
  if (forbiddenWords.some(word => name.includes(word) || slug.includes(word))) {
    return true;
  }

  // Standalone/Birebir eşleşen sakıncalı kelimeler (sexy veya bloodlust gibi kelimelerin filtrelenmesini engellemek için)
  const nameWords = name.split(/[^a-z0-9]+/);
  const slugWords = slug.split(/[^a-z0-9]+/);
  const standaloneForbidden = [
    'sex', 'adult', 'nude', 'nudity', 'naked', 'lust', 'sensual', 'sexual', 'ass', 'butt', 
    'xxx', 'ecchi', 'rape', 'raping', 'sadism', 'masochism', 'condom', 'intercourse', 'babe', 
    'eroge', 'oppai', 'porno'
  ];
  if (standaloneForbidden.some(word => nameWords.includes(word) || slugWords.includes(word))) {
    return true;
  }

  // 2. RAWG Etiket (tag) bazlı kontrol
  if (game.tags && game.tags.length > 0) {
    const forbiddenTags = ['hentai', 'nsfw', 'erotica', 'erotic', 'porn', 'adult-only', 'adult', 'uncensored', 'sex', 'r-18', 'r18', 'xxx', 'naked', 'lewd', 'ecchi', 'lust', 'fetish', 'boobs', 'boob', 'ass', 'butt'];
    const hasForbiddenTag = game.tags.some(t => {
      const tagSlug = (t.slug || '').toLowerCase();
      const tagName = (t.name || '').toLowerCase();

      return forbiddenTags.some(ft => {
        // Birebir eşleşme
        if (tagSlug === ft || tagName === ft) return true;

        // Belirli tehlikeli kelimeler için önek/esnek eşleşme yapalım
        const flexMatchWords = ['hentai', 'porn', 'sex', 'erotic', 'erotica', 'nsfw', 'adult'];
        if (flexMatchWords.includes(ft)) {
          return tagSlug.startsWith(ft + '-') || tagSlug.endsWith('-' + ft);
        }
        return false;
      });
    });
    if (hasForbiddenTag) return true;
  }

  // 3. Tür (genres) bazlı kontrol (nadir ama RAWG mature/adult türü koymuş olabilir)
  if (game.genres && game.genres.length > 0) {
    const forbiddenGenres = ['mature-only', 'adult-only', 'erotica', 'hentai'];
    const hasForbiddenGenre = game.genres.some(g => {
      const genreSlug = (g.slug || '').toLowerCase();
      return forbiddenGenres.some(fg => genreSlug === fg || genreSlug.includes(fg));
    });
    if (hasForbiddenGenre) return true;
  }

  return false;
}

export function isAdultTitleOrSlug(name, slug) {
  const n = (name || '').toLowerCase();
  const s = (slug || '').toLowerCase();

  const forbiddenWords = [
    'hentai', 'porn', 'erotica', 'erotic', 'nsfw', 'uncensored', 'boobs', 'boob', 'r18', 'r-18', 
    'fetish', 'vagina', 'penis', 'dildo', 'masturbat', 'panty', 'panties', 'harem', 'lewd', 
    'stripper', 'waifu', 'milf', 'succubus', 'bdsm', 'bondage', 'seduce', 'seduced', 'seduction', 
    'camgirl', 'clitoris', 'orgasm', 'cuckold', 'yuri', 'yaoi', 'striptease'
  ];
  if (forbiddenWords.some(word => n.includes(word) || s.includes(word))) {
    return true;
  }

  const nameWords = n.split(/[^a-z0-9]+/);
  const slugWords = s.split(/[^a-z0-9]+/);
  const standaloneForbidden = [
    'sex', 'adult', 'nude', 'nudity', 'naked', 'lust', 'sensual', 'sexual', 'ass', 'butt', 
    'xxx', 'ecchi', 'rape', 'raping', 'sadism', 'masochism', 'condom', 'intercourse', 'babe', 
    'eroge', 'oppai', 'porno'
  ];
  if (standaloneForbidden.some(word => nameWords.includes(word) || slugWords.includes(word))) {
    return true;
  }

  return false;
}
