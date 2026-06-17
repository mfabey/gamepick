/**
 + Adult/NSFW/Hentai content filter utility
 */

export function isAdultContent(game) {
  if (!game) return false;
  const name = (game.name || '').toLowerCase();
  const slug = (game.slug || '').toLowerCase();

  // 1. Kelime bazlı başlık/slug kontrolü (birebir eşleşen sakıncalı kelimeler)
  const forbiddenWords = ['hentai', 'porn', 'erotica', 'nsfw', 'adult-only', 'uncensored', 'nudity', 'boobs', 'r18', 'r-18'];
  if (forbiddenWords.some(word => name.includes(word) || slug.includes(word))) {
    return true;
  }

  // Standalone 'sex' kelimesi kontrolü (sexy gibi kelimeleri dışlamak için)
  const nameWords = name.split(/[^a-z0-9]+/);
  const slugWords = slug.split(/[^a-z0-9]+/);
  if (nameWords.includes('sex') || slugWords.includes('sex')) {
    return true;
  }

  // 2. RAWG Etiket (tag) bazlı kontrol
  if (game.tags && game.tags.length > 0) {
    const forbiddenTags = ['hentai', 'nsfw', 'erotica', 'porn', 'adult-only', 'adult', 'uncensored', 'sex', 'r-18', 'r18'];
    const hasForbiddenTag = game.tags.some(t => {
      const tagSlug = (t.slug || '').toLowerCase();
      const tagName = (t.name || '').toLowerCase();
      // Birebir veya kısmi eşleşme kontrolü (örn: "hentai-game" veya "sex")
      return forbiddenTags.some(ft => tagSlug === ft || tagSlug.startsWith(ft + '-') || tagSlug.endsWith('-' + ft) || tagName === ft);
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

  const forbiddenWords = ['hentai', 'porn', 'erotica', 'nsfw', 'adult-only', 'uncensored', 'nudity', 'boobs', 'r18', 'r-18'];
  if (forbiddenWords.some(word => n.includes(word) || s.includes(word))) {
    return true;
  }

  const nameWords = n.split(/[^a-z0-9]+/);
  const slugWords = s.split(/[^a-z0-9]+/);
  if (nameWords.includes('sex') || slugWords.includes('sex')) {
    return true;
  }

  return false;
}
