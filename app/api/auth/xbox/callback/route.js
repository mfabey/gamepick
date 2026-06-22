import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getUserConnections(uid) {
  if (!REDIS_URL || !REDIS_TOKEN) return {};
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['GET', `user_connections:${uid}`]),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : {};
  } catch (err) {
    console.warn('Redis read user connections error:', err.message);
    return {};
  }
}

async function saveUserConnection(uid, platform, connectionData) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const current = await getUserConnections(uid);
    current[platform] = connectionData;
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', `user_connections:${uid}`, JSON.stringify(current)]),
      cache: 'no-store',
    });
    return res.ok;
  } catch (err) {
    console.warn('Redis write user connection error:', err.message);
    return false;
  }
}

// ── 1. Microsoft erişim tokeni al ────────────────────────────────────────────
async function getMsTokens(code, redirectUri) {
  const body = new URLSearchParams({
    client_id:     process.env.XBOX_CLIENT_ID,
    client_secret: process.env.XBOX_CLIENT_SECRET,
    code,
    redirect_uri:  redirectUri,
    grant_type:    'authorization_code',
  });
  const res = await fetch(
    'https://login.microsoftonline.com/consumers/oauth2/v2.0/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }
  );
  return res.json();
}

// ── 2. Xbox Live kullanıcı tokeni al ────────────────────────────────────────
async function getXblToken(accessToken) {
  const res = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName:   'user.auth.xboxlive.com',
        RpsTicket:  `d=${accessToken}`,
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType:    'JWT',
    }),
  });
  return res.json();
}

// ── 3. XSTS tokeni al ───────────────────────────────────────────────────────
async function getXstsToken(xblToken) {
  const res = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      Properties: {
        SandboxId:  'RETAIL',
        UserTokens: [xblToken],
      },
      RelyingParty: 'http://xboxlive.com',
      TokenType:    'JWT',
    }),
  });
  return res.json();
}

export async function GET(request) {
  const { searchParams, origin } = request.nextUrl;
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${origin}/library?xbox_error=cancelled`);
  }

  const redirectUri = `${origin}/api/auth/xbox/callback`;

  try {
    // 1. Microsoft token
    const msTokens = await getMsTokens(code, redirectUri);
    if (msTokens.error) throw new Error(msTokens.error_description || msTokens.error);

    // 2. XBL token
    const xblData = await getXblToken(msTokens.access_token);
    if (!xblData.Token) throw new Error('Xbox Live token alınamadı');
    const xblToken = xblData.Token;

    // 3. XSTS token
    const xstsData = await getXstsToken(xblToken);
    if (!xstsData.Token) {
      // XSTS hata kodu 2148916233: hesapta Xbox profili yok
      const errCode = xstsData.XErr;
      if (errCode === 2148916233) throw new Error('Bu Microsoft hesabına bağlı Xbox profili yok');
      if (errCode === 2148916238) throw new Error('Çocuk hesabı — ebeveyn onayı gerekli');
      throw new Error(`XSTS hatası: ${errCode}`);
    }

    const xui      = xstsData.DisplayClaims.xui[0];
    const xuid     = xui.xid;
    const gamertag = xui.gtg;
    const userHash = xui.uhs;
    const authHeader = `XBL3.0 x=${userHash};${xstsData.Token}`;

    // 4. Profil resmi çek
    let avatar = null;
    try {
      const profileRes = await fetch(
        'https://profile.xboxlive.com/users/me/profile/settings?settings=GameDisplayName,GameDisplayPicRaw,Gamerscore',
        {
          headers: {
            'Authorization':        authHeader,
            'x-xbl-contract-version': '2',
            'Accept':               'application/json',
          },
          signal: AbortSignal.timeout(6000),
        }
      );
      const profileData = await profileRes.json();
      const settings = profileData.profileUsers?.[0]?.settings || [];
      const picSetting = settings.find(s => s.id === 'GameDisplayPicRaw');
      if (picSetting?.value) avatar = picSetting.value;
    } catch { /* avatar opsiyonel */ }

    // Oturumu cookie'ye kaydet (refreshToken ile yeniden token alınabilir)
    const session = { xuid, gamertag, avatar, refreshToken: msTokens.refresh_token };
    
    // ── 5. Oturumu veri tabanına (Redis) kaydet ──────────────────────────────
    const cookieStore = await cookies();
    const userSession = cookieStore.get('gp_user_session');
    if (userSession && userSession.value) {
      try {
        const user = JSON.parse(userSession.value);
        await saveUserConnection(user.uid, 'xbox', session);
      } catch (err) {
        console.error('Failed to save Xbox connection to Redis:', err.message);
      }
    }

    cookieStore.set('gp_xbox_session', JSON.stringify(session), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   60 * 60 * 24 * 30,
      path:     '/',
      sameSite: 'lax',
    });

    return NextResponse.redirect(`${origin}/library`);
  } catch (err) {
    console.error('Xbox auth error:', err.message);
    return NextResponse.redirect(`${origin}/library?xbox_error=${encodeURIComponent(err.message)}`);
  }
}
