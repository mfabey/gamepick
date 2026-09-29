// ─────────────────────────────────────────────────────────────────────────────
// "Senin İçin" aday üretimi. Birincil: sunucu-taraflı toplama (/api/for-you) — tek
// istek + paylaşımlı cache. Fallback: istemci fan-out (backend erişilemezse feed
// çalışmaya devam etsin). Sıralama saf motorda (services/recommend) ve Home'da yapılır.
// ─────────────────────────────────────────────────────────────────────────────
import { apiGet } from './client';
import { fetchGames } from './games';

// Fallback: the same daily catalogue sources, never the retired trend list.
async function clientFanout(genreSlugs) {
  const page = 1 + Math.floor(Date.now() / 86400000) % 3;
  const jobs = genreSlugs.map((slug) =>
    fetchGames({ genres: slug, num: 20, page }).then((d) => d.results || []).catch(() => [])
  );
  jobs.push(fetchGames({ section: 'new', num: 20 }).then(d => d.results || []).catch(() => []));
  jobs.push(fetchGames({ section: 'popular', num: 20, page }).then(d => d.results || []).catch(() => []));
  const lists = await Promise.all(jobs);
  return lists.flat();
}

export async function fetchForYouCandidates(genreSlugs = []) {
  // Birincil: sunucu-taraflı toplama (5 istek yerine 1, paylaşımlı cache)
  try {
    const data = await apiGet('/api/for-you', { genres: genreSlugs.join(','), num: 20, day: Math.floor(Date.now() / 86400000) });
    if (data?.results?.length) return data.results;
  } catch { /* backend erişilemezse fallback */ }
  const fallback = await clientFanout(genreSlugs);
  if (!fallback.length) throw new Error('Recommendations unavailable');
  return fallback;
}
