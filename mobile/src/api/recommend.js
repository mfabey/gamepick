// ─────────────────────────────────────────────────────────────────────────────
// "Senin İçin" aday üretimi. Birincil: sunucu-taraflı toplama (/api/for-you) — tek
// istek + paylaşımlı cache. Fallback: istemci fan-out (backend erişilemezse feed
// çalışmaya devam etsin). Sıralama saf motorda (services/recommend) ve Home'da yapılır.
// ─────────────────────────────────────────────────────────────────────────────
import { apiGet } from './client';
import { fetchGames, fetchTrending } from './games';

// Fallback: adayları cihazdan çok kaynaktan topla (favori türler + trend)
async function clientFanout(genreSlugs) {
  const jobs = genreSlugs.map((slug) =>
    fetchGames({ genres: slug, num: 20 }).then((d) => d.results || []).catch(() => [])
  );
  jobs.push(fetchTrending().then((d) => d.results || d.games || []).catch(() => []));
  const lists = await Promise.all(jobs);
  return lists.flat();
}

export async function fetchForYouCandidates(genreSlugs = []) {
  // Birincil: sunucu-taraflı toplama (5 istek yerine 1, paylaşımlı cache)
  try {
    const data = await apiGet('/api/for-you', { genres: genreSlugs.join(','), num: 20 });
    if (data?.results?.length) return data.results;
  } catch { /* backend erişilemezse fallback */ }
  return clientFanout(genreSlugs);
}
