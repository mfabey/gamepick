import { NextResponse } from 'next/server';
import { resolveOwnedSteamId } from '../../lib/steam-owner';

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Redis Helper Functions using standard fetch REST API
async function getCachedData(key) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', key]),
      // Don't cache the API fetch itself
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : null;
  } catch (err) {
    console.warn('Redis read error:', err.message);
    return null;
  }
}

async function setCachedData(key, value, expireSeconds = 3600) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', key, JSON.stringify(value), 'EX', expireSeconds]),
      cache: 'no-store',
    });
    return res.ok;
  } catch (err) {
    console.warn('Redis write error:', err.message);
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // SAHİPLİK KONTROLÜ — bkz. app/lib/steam-owner.js
  //
  // Eskiden `?steamId=` verildiğinde çerez kontrolü TÜMDEN atlanıyordu:
  // `let steamId = requestedSteamId` ile başlanıp 401 dalına yalnızca
  // steamId YOKSA giriliyordu. Yani herhangi biri `?steamId=<başkası>` ile
  // o hesabın kütüphanesini bu sunucunun STEAM_API_KEY'i üzerinden
  // çekebiliyordu. Kısıt yalnızca istemcideydi — web ve mobil her zaman
  // kendi kimliğini yolluyor, sunucu ise ayrım yapmıyordu.
  const owner = await resolveOwnedSteamId(request, searchParams.get('steamId'));
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error, games: [] }, { status: owner.status });
  }
  const steamId = owner.steamId;

  if (!STEAM_API_KEY) {
    return NextResponse.json({ error: 'STEAM_API_KEY tanımlı değil', games: [] }, { status: 500 });
  }

  const cacheKey = `steam_library:${steamId}`;

  // 1. Check Redis Cache
  const cachedResult = await getCachedData(cacheKey);
  if (cachedResult) {
    return NextResponse.json({ ...cachedResult, cached: true });
  }

  // 2. Cache Miss - Fetch from Steam Web API
  try {
    const res = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/` +
      `?key=${STEAM_API_KEY}` +
      `&steamid=${steamId}` +
      `&include_appinfo=1` +
      `&include_played_free_games=1` +
      `&format=json`,
      { cache: 'no-store' }
    );

    if (!res.ok) throw new Error(`Steam API returned status ${res.status}`);
    const data = await res.json();

    const raw = data?.response?.games || [];
    const games = raw
      .map(g => ({
        appid: g.appid,
        name: g.name || `App ${g.appid}`,
        hours: parseFloat(((g.playtime_forever || 0) / 60).toFixed(1)),
        hoursRecent: parseFloat(((g.playtime_2weeks || 0) / 60).toFixed(1)),
        image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg`,
        icon: g.img_icon_url
          ? `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`
          : null,
        lastPlayed: g.rtime_last_played || 0,
        storeUrl: `https://store.steampowered.com/app/${g.appid}`,
      }))
      .sort((a, b) => b.hours - a.hours);

    const totalHours = parseFloat(games.reduce((s, g) => s + g.hours, 0).toFixed(1));
    const playedGames = games.filter(g => g.hours > 0).length;

    const responseData = {
      games,
      total: games.length,
      played: playedGames,
      totalHours,
    };

    // 3. Save to Redis Cache (expires in 1 hour)
    await setCachedData(cacheKey, responseData, 3600);

    return NextResponse.json({ ...responseData, cached: false });

  } catch (err) {
    console.error('Steam library fetch error:', err.message);

    if (err.message.includes('401')) {
      return NextResponse.json({
        error: 'Steam Web API Anahtarı geçersiz veya yetkisiz.',
        games: [],
        private: false
      }, { status: 401 });
    }

    if (err.message.includes('403')) {
      return NextResponse.json({
        error: 'Steam profiliniz gizli veya erişilemiyor.',
        games: [],
        private: true
      }, { status: 403 });
    }

    return NextResponse.json({ error: err.message, games: [] }, { status: 500 });
  }
}
