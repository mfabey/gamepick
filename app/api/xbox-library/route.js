import { NextResponse } from 'next/server';
import { sunucuHatasi } from '../../lib/api-error';
import { cookies } from 'next/headers';

// ── Token zinciri: refresh token → access token → XBL → XSTS ───────────────
async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id:     process.env.XBOX_CLIENT_ID,
    client_secret: process.env.XBOX_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    scope:         'XboxLive.signin offline_access',
  });
  const res = await fetch(
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );
  return res.json();
}

async function getXblToken(accessToken) {
  const res = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${accessToken}` },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  return res.json();
}

async function getXstsToken(xblToken) {
  const res = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] },
      RelyingParty: 'http://xboxlive.com',
      TokenType: 'JWT',
    }),
  });
  return res.json();
}

// ── Oyun geçmişini sayfalı olarak çek ───────────────────────────────────────
async function fetchAllTitles(authHeader, xuid) {
  const titles = [];
  let continuationToken = null;
  const MAX_PAGES = 10; // en fazla 1000 oyun
  let page = 0;

  do {
    const url = new URL(`https://titlehub.xboxlive.com/users/xuid(${xuid})/titles/titlehistory/decoration/detail`);
    if (continuationToken) url.searchParams.set('continuationToken', continuationToken);
    url.searchParams.set('maxItems', '100');

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization':          authHeader,
        'x-xbl-contract-version': '2',
        'Accept':                 'application/json',
        'Accept-Language':        'tr-TR,tr;q=0.9',
      },
      cache:  'no-store',
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) break;
    const data = await res.json();
    const batch = data.titles || [];
    titles.push(...batch);
    continuationToken = data.pagingInfo?.continuationToken || null;
    page++;
  } while (continuationToken && page < MAX_PAGES);

  return titles;
}

// ── Oyun nesnesini formatla ──────────────────────────────────────────────────
function formatTitle(t) {
  // Resim: önce BoxArt, sonra BrandedKeyArt, sonra displayImage
  const images   = t.images || [];
  const boxArt   = images.find(i => i.type === 'BoxArt')?.url
    || images.find(i => i.type === 'BrandedKeyArt')?.url
    || t.displayImage
    || null;

  const lastPlayedRaw = t.titleHistory?.lastTimePlayed;
  const lastPlayed    = lastPlayedRaw ? Math.floor(new Date(lastPlayedRaw).getTime() / 1000) : 0;

  const ach = t.achievement || {};
  const isGamePass = t.gamePass?.isGamePass === true;

  return {
    titleId:            t.titleId,
    name:               t.name,
    image:              boxArt,
    lastPlayed,
    currentGamerscore:  ach.currentGamerscore  ?? 0,
    totalGamerscore:    ach.totalGamerscore    ?? 0,
    currentAchievements: ach.currentAchievements ?? 0,
    totalAchievements:  ach.totalAchievements  ?? 0,
    isGamePass,
    storeUrl: `https://www.xbox.com/tr-TR/games/store/-/${t.titleId}`,
  };
}

// ── Ana handler ──────────────────────────────────────────────────────────────
export async function GET(request) {
  const cookieStore = await cookies();
  let sessionRaw = cookieStore.get('gp_xbox_session')?.value || null;

  // Mobil: httpOnly cookie olmadığından session'ı header ile kabul et (base64 JSON)
  if (!sessionRaw) {
    const hdr = request?.headers?.get('x-xbox-session');
    if (hdr) {
      try { sessionRaw = Buffer.from(hdr, 'base64').toString('utf8'); } catch { /* geçersiz */ }
    }
  }

  if (!sessionRaw) {
    return NextResponse.json({ error: 'Oturum yok' }, { status: 401 });
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch {
    return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 });
  }

  if (session.isMock) {
    const isGPActive = session.gamepassType === 'ultimate' || session.gamepassType === 'pc';
    const GAME_POOL = [
      { titleId: "2532454", name: "Halo Infinite", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1240440/header.jpg", baseAchievements: 60, gamerscore: 1000 },
      { titleId: "1858582", name: "Forza Horizon 5", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg", baseAchievements: 70, gamerscore: 1000 },
      { titleId: "1738234", name: "Starfield", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg", baseAchievements: 50, gamerscore: 1000 },
      { titleId: "2461850", name: "Senua's Saga: Hellblade II", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/2461850/header.jpg", baseAchievements: 11, gamerscore: 1000 },
      { titleId: "1932060", name: "Minecraft", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1932060/header.jpg", baseAchievements: 125, gamerscore: 2500 },
      { titleId: "1172620", name: "Sea of Thieves", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172620/header.jpg", baseAchievements: 60, gamerscore: 1000 },
      { titleId: "1817230", name: "Hi-Fi RUSH", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817230/header.jpg", baseAchievements: 61, gamerscore: 1000 },
      { titleId: "1245620", name: "Elden Ring", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg", baseAchievements: 42, gamerscore: 1000 },
      { titleId: "2933080", name: "Call of Duty: Black Ops 6", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/2933080/header.jpg", baseAchievements: 45, gamerscore: 1000 },
      { titleId: "782330", name: "Doom Eternal", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/782330/header.jpg", baseAchievements: 34, gamerscore: 1000 },
      { titleId: "1097840", name: "Gears 5", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1097840/header.jpg", baseAchievements: 75, gamerscore: 1000 },
      { titleId: "1126810", name: "Grounded", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/962000/header.jpg", baseAchievements: 45, gamerscore: 1000 },
      { titleId: "3612", name: "Hades", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg", baseAchievements: 49, gamerscore: 1000 },
      { titleId: "1091500", name: "Cyberpunk 2077", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg", baseAchievements: 44, gamerscore: 1000 },
      { titleId: "271590", name: "Grand Theft Auto V", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg", baseAchievements: 77, gamerscore: 1250 },
      { titleId: "1190460", name: "Deathloop", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1252330/header.jpg", baseAchievements: 58, gamerscore: 1000 },
      { titleId: "501300", name: "Psychonauts 2", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/607080/header.jpg", baseAchievements: 57, gamerscore: 1000 },
      { titleId: "230410", name: "Gears Tactics", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1184050/header.jpg", baseAchievements: 46, gamerscore: 1000 },
      { titleId: "582010", name: "Monster Hunter: World", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/582010/header.jpg", baseAchievements: 50, gamerscore: 1000 },
      { titleId: "219540", name: "Ori and the Blind Forest", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/261570/header.jpg", baseAchievements: 50, gamerscore: 1000 },
      { titleId: "1057090", name: "Ori and the Will of the Wisps", image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1057090/header.jpg", baseAchievements: 37, gamerscore: 1000 }
    ];

    let hash = 0;
    const tag = session.gamertag || 'MasterChief117';
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const gameCount = 6 + (hash % 7); // 6 ile 12 arasında oyun
    const selectedGames = [];
    const poolCopy = [...GAME_POOL];
    
    for (let i = 0; i < gameCount; i++) {
      const idx = (hash + i * 17) % poolCopy.length;
      const baseGame = poolCopy[idx];
      poolCopy.splice(idx, 1);

      const gameHash = hash + Number(baseGame.titleId.replace(/[^\d]/g, ''));
      const isGamePassVal = isGPActive && ((gameHash % 3) !== 0);
      const playedWeeksAgo = (gameHash % 30) + 1;
      const lastPlayed = Math.floor(Date.now() / 1000) - 3600 * 24 * 7 * playedWeeksAgo;
      
      const totalAchievements = baseGame.baseAchievements;
      const currentAchievements = Math.round(totalAchievements * (0.2 + (gameHash % 70) / 100)); // %20 ile %90 tamamlama oranı
      const currentGamerscore = Math.round(baseGame.gamerscore * (currentAchievements / totalAchievements));

      selectedGames.push({
        titleId: baseGame.titleId,
        name: baseGame.name,
        image: baseGame.image,
        lastPlayed,
        currentGamerscore,
        totalGamerscore: baseGame.gamerscore,
        currentAchievements,
        totalAchievements,
        isGamePass: isGamePassVal,
        storeUrl: `https://www.xbox.com/tr-TR/games/store/-/${baseGame.titleId}`
      });
    }

    const games = selectedGames.sort((a, b) => b.lastPlayed - a.lastPlayed);
    const gamePassCount = games.filter(g => g.isGamePass).length;

    return NextResponse.json({
      games,
      total:         games.length,
      gamePassCount,
      totalGamerscore: games.reduce((s, g) => s + (g.currentGamerscore || 0), 0),
    });
  }

  try {
    // Refresh token ile yeni access token al
    const msTokens = await refreshAccessToken(session.refreshToken);
    if (msTokens.error) {
      return NextResponse.json({ error: 'Oturum süresi doldu, tekrar giriş yapın', expired: true }, { status: 401 });
    }

    // XBL + XSTS token zinciri
    const xblData  = await getXblToken(msTokens.access_token);
    if (!xblData.Token) return NextResponse.json({ error: 'Xbox Live token alınamadı' }, { status: 502 });

    const xstsData = await getXstsToken(xblData.Token);
    if (!xstsData.Token) return NextResponse.json({ error: 'XSTS token alınamadı' }, { status: 502 });

    const userHash   = xstsData.DisplayClaims.xui[0].uhs;
    const authHeader = `XBL3.0 x=${userHash};${xstsData.Token}`;

    // Oyun listesini çek
    const rawTitles = await fetchAllTitles(authHeader, session.xuid);

    // Sadece gerçek oyunları al (uygulama, medya vs. filtrele)
    const games = rawTitles
      .filter(t => t.name && t.titleId)
      .map(formatTitle)
      .sort((a, b) => b.lastPlayed - a.lastPlayed);

    const gamePassCount = games.filter(g => g.isGamePass).length;

    return NextResponse.json({
      games,
      total:         games.length,
      gamePassCount,
      totalGamerscore: games.reduce((s, g) => s + (g.currentGamerscore || 0), 0),
    });
  } catch (err) {
    console.error('Xbox library error:', err.message);
    return sunucuHatasi(err, 'xbox-library');
  }
}
