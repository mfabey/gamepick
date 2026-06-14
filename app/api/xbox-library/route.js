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
