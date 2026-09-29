// Shared by the web, mobile and user-data API. No platform dependencies.
import { canonicalGenre } from './recommend';
export function cleanWeights(input = {}) {
  return Object.fromEntries(Object.entries(input || {})
    .filter(([key, value]) => key.length <= 80 && Number.isFinite(Number(value)) && Number(value) > 0)
    .map(([key, value]) => [key, Math.min(1000000, Number(value))])
    .sort((a, b) => b[1] - a[1]).slice(0, 60));
}

function normalize(input) {
  const values = {};
  for (const [key, weight] of Object.entries(cleanWeights(input))) {
    const name = canonicalGenre(key);
    values[name] = (values[name] || 0) + weight;
  }
  const total = Object.values(values).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value / total]));
}

export function profileWeights(profile = {}) {
  const interaction = normalize(profile.genres);
  const library = normalize(profile.library?.genres);
  if (!Object.keys(library).length) return interaction;
  if (!Object.keys(interaction).length) return library;
  const combined = {};
  for (const weights of [interaction, library]) {
    for (const key in weights) combined[key] = (combined[key] || 0) + weights[key] * 0.5;
  }
  return combined;
}

// Clients send snapshots, not deltas. Adding an already merged snapshot on
// every sync used to multiply the same preferences indefinitely.
export function mergeTasteSnapshot(server = {}, incoming = {}, now = Date.now()) {
  const genres = cleanWeights(server.genres);
  for (const [key, value] of Object.entries(cleanWeights(incoming.genres))) {
    genres[key] = Math.max(genres[key] || 0, value);
  }
  const localLibrary = incoming.library;
  const library = localLibrary && Number(localLibrary.updatedAt) > Number(server.library?.updatedAt || 0)
    ? { genres: cleanWeights(localLibrary.genres), sig: String(localLibrary.sig || '').slice(0, 600), updatedAt: Math.min(now, Number(localLibrary.updatedAt)) }
    : server.library;
  return { ...server, genres: cleanWeights(genres), events: Math.max(Number(server.events) || 0, Number(incoming.events) || 0), updatedAt: now, ...(library ? { library } : {}) };
}

export function addTasteSignal(profile = {}, signal = {}) {
  const weight = { view: 1, wishlist: 3, pick: 4 }[signal?.type];
  if (typeof weight !== 'number' || !Array.isArray(signal?.genres)) return profile;
  const genres = cleanWeights(profile.genres);
  const names = [...new Set(signal.genres.filter(g => typeof g === 'string' && g.length <= 80))].slice(0, 10);
  for (const name of names) genres[name] = (genres[name] || 0) + weight;
  return { ...profile, genres: cleanWeights(genres), events: (profile.events || 0) + (names.length ? 1 : 0), updatedAt: Date.now() };
}

export function libraryWeights(games = [], genresByAppid = {}) {
  const weights = {};
  for (const game of games) {
    for (const name of genresByAppid[game.appid] || []) {
      weights[name] = (weights[name] || 0) + 1 + Math.min(5, Math.max(0, Number(game.hours) || 0) / 40);
    }
  }
  return weights;
}
