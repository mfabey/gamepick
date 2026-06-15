import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ── Token zinciri: refresh token → access token → XBL → XSTS ───────────────
async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id:     process.env.XBOX_CLIENT_ID,
    client_secret: process.env.XBOX_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
    scope:         'XboxLive.signin XboxLive.read offline_access',
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
async function fetchAllTitles(authHeader) {
  const titles = [];
  let continuationToken = null;
  const MAX_PAGES = 10; // en fazla 1000 oyun
  let page = 0;

  do {
    const url = new URL('https://titlehub.xboxlive.com/users/me/titles/titlehistory/decoration/detail');
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
export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('gp_xbox_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Oturum yok' }, { status: 401 });
  }

  let session;
  try {
    session = JSON.parse(sessionCookie.value);
  } catch {
    return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 });
  }

  if (session.isMock) {
    const isGPActive = session.gamepassType === 'ultimate' || session.gamepassType === 'pc';
    const mockGames = [
      {
        titleId: "2532454",
        name: "Halo Infinite",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1240440/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 2, // 2 saat önce
        currentGamerscore: 650,
        totalGamerscore: 1000,
        currentAchievements: 42,
        totalAchievements: 60,
        isGamePass: true,
      },
      {
        titleId: "1858582",
        name: "Forza Horizon 5",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 24, // 1 gün önce
        currentGamerscore: 820,
        totalGamerscore: 1000,
        currentAchievements: 53,
        totalAchievements: 70,
        isGamePass: true,
      },
      {
        titleId: "1738234",
        name: "Starfield",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1716740/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 48, // 2 gün önce
        currentGamerscore: 400,
        totalGamerscore: 1000,
        currentAchievements: 25,
        totalAchievements: 50,
        isGamePass: true,
      },
      {
        titleId: "2461850",
        name: "Senua's Saga: Hellblade II",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/2461850/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 12, // 12 saat önce
        currentGamerscore: 1000,
        totalGamerscore: 1000,
        currentAchievements: 11,
        totalAchievements: 11,
        isGamePass: true,
      },
      {
        titleId: "1932060",
        name: "Minecraft",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1932060/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 120, // 5 gün önce
        currentGamerscore: 1120,
        totalGamerscore: 2500,
        currentAchievements: 85,
        totalAchievements: 125,
        isGamePass: false, // Owned
      },
      {
        titleId: "1172620",
        name: "Sea of Thieves",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172620/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 200, 
        currentGamerscore: 450,
        totalGamerscore: 1000,
        currentAchievements: 30,
        totalAchievements: 60,
        isGamePass: true,
      },
      {
        titleId: "1817230",
        name: "Hi-Fi RUSH",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1817230/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 500,
        currentGamerscore: 750,
        totalGamerscore: 1000,
        currentAchievements: 40,
        totalAchievements: 61,
        isGamePass: true,
      },
      {
        titleId: "1245620",
        name: "Elden Ring",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 72, // 3 gün önce
        currentGamerscore: 600,
        totalGamerscore: 1000,
        currentAchievements: 28,
        totalAchievements: 42,
        isGamePass: false, // Owned
      },
      {
        titleId: "2933080",
        name: "Call of Duty: Black Ops 6",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/2933080/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 4, // 4 saat önce
        currentGamerscore: 240,
        totalGamerscore: 1000,
        currentAchievements: 15,
        totalAchievements: 45,
        isGamePass: true,
      },
      {
        titleId: "782330",
        name: "Doom Eternal",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/782330/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 1000,
        currentGamerscore: 900,
        totalGamerscore: 1000,
        currentAchievements: 32,
        totalAchievements: 34,
        isGamePass: true,
      },
      {
        titleId: "1097840",
        name: "Gears 5",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/1097840/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 1500,
        currentGamerscore: 150,
        totalGamerscore: 1000,
        currentAchievements: 12,
        totalAchievements: 75,
        isGamePass: true,
      },
      {
        titleId: "1126810",
        name: "Grounded",
        image: "https://cdn.cloudflare.steamstatic.com/steam/apps/962000/header.jpg",
        lastPlayed: Math.floor(Date.now() / 1000) - 3600 * 2000,
        currentGamerscore: 380,
        totalGamerscore: 1000,
        currentAchievements: 18,
        totalAchievements: 45,
        isGamePass: true,
      }
    ].map(g => ({
      ...g,
      isGamePass: isGPActive ? g.isGamePass : false,
      storeUrl: `https://www.xbox.com/tr-TR/games/store/-/${g.titleId}`
    }));

    const games = mockGames.sort((a, b) => b.lastPlayed - a.lastPlayed);
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
    const rawTitles = await fetchAllTitles(authHeader);

    // Sadece gerçek oyunları al (uygulama, medya vs. filtrele)
    const games = rawTitles
      .filter(t => t.name && t.titleId && t.titleHistory)
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
