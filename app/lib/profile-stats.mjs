// Only successful, non-demo provider responses may contribute to profile totals.
export function libraryStatus(data) {
  if (data?.isMock || data?.mock) return 'demo';
  if (data?.private || data?.unavailable) return 'unavailable';
  if (!data || data.error || !Array.isArray(data.games)) return 'error';
  return data.partial ? 'partial' : 'ready';
}

const validNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function summarizeProfile(sources) {
  const steamSources = sources.filter(s => s.platform === 'steam');
  const xboxSources = sources.filter(s => s.platform === 'xbox');
  const usable = s => (s.status === 'ready' || s.status === 'partial') && ['ready', 'partial'].includes(libraryStatus(s.data));
  const steam = new Map();
  for (const source of steamSources.filter(usable)) {
    for (const game of source.data.games) {
      if (!game?.appid || !game.name) continue;
      const key = String(game.appid);
      const previous = steam.get(key);
      steam.set(key, {
        ...game,
        hours: validNumber(game.hours) ? game.hours + (previous?.hours ?? 0) : previous?.hours ?? null,
        hoursRecent: validNumber(game.hoursRecent) ? game.hoursRecent + (previous?.hoursRecent ?? 0) : previous?.hoursRecent ?? null,
      });
    }
  }
  const steamGames = [...steam.values()];
  const xboxGames = xboxSources.filter(usable).flatMap(s => s.data.games).filter(g => g?.titleId && g.name);
  const sum = key => steamGames.length === 0 || steamGames.some(g => validNumber(g[key]))
    ? steamGames.reduce((n, g) => n + (g[key] ?? 0), 0) : null;
  const achievements = xboxGames.filter(g => g.achievementDataAvailable !== false && validNumber(g.totalAchievements) && g.totalAchievements > 0 && validNumber(g.currentAchievements) && g.currentAchievements <= g.totalAchievements);
  return {
    steamGames,
    steamCount: steamSources.some(usable) ? steamGames.length : null,
    xboxCount: xboxSources.some(usable) ? xboxGames.length : null,
    totalHours: steamSources.some(usable) ? sum('hours') : null,
    recentHours: steamSources.some(usable) ? sum('hoursRecent') : null,
    recentGames: steamGames.filter(g => g.hoursRecent > 0).sort((a, b) => b.hoursRecent - a.hoursRecent),
    steamPartial: steamSources.some(s => s.status !== 'ready') || steamGames.some(g => g.hours == null || g.hoursRecent == null),
    xboxPartial: xboxSources.some(s => s.status !== 'ready'),
    achievementCurrent: achievements.reduce((n, g) => n + g.currentAchievements, 0),
    achievementTotal: achievements.reduce((n, g) => n + g.totalAchievements, 0),
    achievementGames: achievements.length,
  };
}
