import { NextResponse } from 'next/server';
import { readValue } from '../../lib/session-cookie';
import { cookies } from 'next/headers';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getCachedData(key) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', key]),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch { return null; }
}

async function setCachedData(key, value, expireSeconds = 3600) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', expireSeconds]),
      cache: 'no-store',
    });
  } catch {}
}

async function fetchGamesForAccount(account) {
  const { steamId } = account;
  if (!steamId || !STEAM_API_KEY) return [];

  const cacheKey = `steam_library:${steamId}`;
  const cached = await getCachedData(cacheKey);
  if (cached?.games) return cached.games;

  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const games = (data?.response?.games || []).map(g => ({
      appid:       g.appid,
      name:        g.name || `App ${g.appid}`,
      hours:       parseFloat(((g.playtime_forever || 0) / 60).toFixed(1)),
      hoursRecent: parseFloat(((g.playtime_2weeks || 0) / 60).toFixed(1)),
      image:       `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
      lastPlayed:  g.rtime_last_played || 0,
      storeUrl:    `https://store.steampowered.com/app/${g.appid}`,
    }));

    const totalHours = parseFloat(games.reduce((s, g) => s + g.hours, 0).toFixed(1));
    await setCachedData(cacheKey, { games, total: games.length, played: games.filter(g => g.hours > 0).length, totalHours }, 3600);
    return games;
  } catch { return []; }
}

// GET /api/oyun-merged  →  Tüm bağlı Steam hesaplarının birleşik oyun listesi
export async function GET() {
  const cookieStore = await cookies();

  // Tüm Steam hesaplarını al
  let accounts = [];
  try {
    const c = cookieStore.get('gp_steam_accounts');
    if (c?.value) accounts = (await readValue(c.value)) || [];
  } catch {}

  // Geriye uyumluluk: eski tek hesap
  if (accounts.length === 0) {
    try {
      const s = cookieStore.get('gp_steam_session');
      if (s?.value) { const v = await readValue(s.value); if (v) accounts = [v]; }
    } catch {}
  }

  if (accounts.length === 0) {
    return NextResponse.json({ error: 'Giriş yapılmamış', games: [], accounts: [] }, { status: 401 });
  }

  // Tüm hesapların oyunlarını paralel çek
  const results = await Promise.all(
    accounts.map(async (account) => ({
      account,
      games: await fetchGamesForAccount(account),
    }))
  );

  // Oyunları birleştir: aynı appid'yi merge et, hangi hesapta olduğunu etiketle
  const gameMap = new Map(); // appid → merged game object

  for (const { account, games } of results) {
    for (const game of games) {
      if (gameMap.has(game.appid)) {
        // Mevcut kayda bu hesabı ekle
        const existing = gameMap.get(game.appid);
        existing.accounts.push({
          steamId:   account.steamId,
          name:      account.name,
          avatar:    account.avatar,
          hours:     game.hours,
          hoursRecent: game.hoursRecent,
          lastPlayed: game.lastPlayed,
        });
        existing.hours       += game.hours;         // Toplam saat
        existing.hoursRecent += game.hoursRecent;
        if (game.lastPlayed > existing.lastPlayed) {
          existing.lastPlayed = game.lastPlayed;
        }
      } else {
        gameMap.set(game.appid, {
          ...game,
          hours:       game.hours,
          hoursRecent: game.hoursRecent,
          accounts: [{
            steamId:    account.steamId,
            name:       account.name,
            avatar:     account.avatar,
            hours:      game.hours,
            hoursRecent: game.hoursRecent,
            lastPlayed: game.lastPlayed,
          }],
        });
      }
    }
  }

  const merged = Array.from(gameMap.values()).sort((a, b) => b.hours - a.hours);
  const totalHours = parseFloat(merged.reduce((s, g) => s + g.hours, 0).toFixed(1));

  return NextResponse.json({
    games:      merged,
    total:      merged.length,
    played:     merged.filter(g => g.hours > 0).length,
    totalHours,
    accounts:   accounts.map(a => ({ steamId: a.steamId, name: a.name, avatar: a.avatar })),
  });
}
