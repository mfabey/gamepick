import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisCmd, redisGetJSON, redisSetJSON } from '../../../../lib/redis';

// Mobil deep-link güvenliği: yalnızca uygulama şemalarına yönlendirmeye izin ver
// (açık yönlendirme / token sızıntısı engeli).
export function isAllowedAppRedirect(url) {
  if (!url) return false;
  return /^(gamerisen:\/\/|exp(\+[\w-]+)?:\/\/|https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/i.test(url);
}

// Verinin app'e URL üzerinden güvenli aktarımı için base64
function encodeMobilePayload(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

const STEAM_API_KEY = process.env.STEAM_API_KEY;
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

export async function GET(request) {
  const baseUrl = request.nextUrl.origin;
  const { searchParams } = new URL(request.url);

  // ── 1. Steam'e doğrulama isteği gönder ──────────────────────────────────
  const verifyParams = new URLSearchParams(searchParams);
  verifyParams.set('openid.mode', 'check_authentication');

  let verified = false;
  try {
    const verifyRes  = await fetch('https://steamcommunity.com/openid/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    verifyParams.toString(),
    });
    const verifyText = await verifyRes.text();
    verified = verifyText.includes('is_valid:true');
  } catch {
    verified = false;
  }

  if (!verified) {
    return NextResponse.redirect(`${baseUrl}/?steam_error=dogrulanamadi`);
  }

  // ── 2. Steam ID'yi çıkar ─────────────────────────────────────────────────
  const claimedId = searchParams.get('openid.claimed_id') || '';
  const steamId   = claimedId.match(/\/(\d+)$/)?.[1];
  if (!steamId) {
    return NextResponse.redirect(`${baseUrl}/?steam_error=id_bulunamadi`);
  }

  // ── 3. Profil bilgilerini al ─────────────────────────────────────────────
  let profile = {
    steamId,
    name:       'Steam Kullanıcısı',
    avatar:     null,
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
  };

  if (STEAM_API_KEY) {
    try {
      const pRes  = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`,
        { next: { revalidate: 0 } }
      );
      const pData = await pRes.json();
      const p     = pData?.response?.players?.[0];
      if (p) {
        profile = {
          steamId,
          name:       p.personaname  || 'Steam Kullanıcısı',
          avatar:     p.avatarfull   || p.avatarmedium || p.avatar || null,
          profileUrl: p.profileurl   || profile.profileUrl,
        };
      }
    } catch { /* profil opsiyonel */ }
  }

  // ── 3.5 Mobil akış: cookie yerine uygulamanın deep link'ine dön ─────────
  const isMobile = searchParams.get('mobile') === '1';
  if (isMobile) {
    const appRedirect = searchParams.get('app_redirect') || 'gamerisen://auth';
    if (!isAllowedAppRedirect(appRedirect)) {
      return NextResponse.redirect(`${baseUrl}/?steam_error=gecersiz_yonlendirme`);
    }
    const sep = appRedirect.includes('?') ? '&' : '?';
    const payload = encodeMobilePayload({ platform: 'steam', account: profile });
    return NextResponse.redirect(`${appRedirect}${sep}data=${encodeURIComponent(payload)}`);
  }

  // ── 4. Mevcut hesap listesini oku, yeni hesabı ekle ─────────────────────
  const cookieStore = await cookies();
  let steamAccounts = [];
  try {
    const existing = cookieStore.get('gp_steam_accounts');
    if (existing?.value) {
      steamAccounts = JSON.parse(existing.value);
    } else {
      // Eski tek-hesap cookie'sinden geçiş
      const oldSession = cookieStore.get('gp_steam_session');
      if (oldSession?.value) {
        const oldProfile = JSON.parse(oldSession.value);
        if (oldProfile?.steamId && oldProfile.steamId !== steamId) {
          steamAccounts = [oldProfile]; // Mevcut hesabı koru
        }
      }
    }
  } catch {}

  // Aynı steamId zaten varsa güncelle, yoksa ekle (max 5 hesap)
  const existingIdx = steamAccounts.findIndex(a => a.steamId === steamId);
  if (existingIdx >= 0) {
    steamAccounts[existingIdx] = profile;
  } else if (steamAccounts.length < 5) {
    steamAccounts.push(profile);
  }

  // ── 5. Oturumu Redis'e kaydet ve auto-login'i tetikle ────────────────────
  let loggedInUser = null;
  const userSession = cookieStore.get('gp_user_session');
  if (userSession?.value) {
    try {
      const user = JSON.parse(userSession.value);
      loggedInUser = user;
      await saveUserConnection(user.uid, 'steamAccounts', steamAccounts);
      // Geriye uyumluluk için ilk hesabı 'steam' anahtarına da yaz
      await saveUserConnection(user.uid, 'steam', steamAccounts[0]);

      // Cache user profile and reverse mapping for auto-login
      await redisSetJSON(`user_profile:${user.uid}`, user);
      for (const acc of steamAccounts) {
        if (acc.steamId) {
          await redisCmd(['SET', `steam_to_uid:${acc.steamId}`, user.uid]);
        }
      }
    } catch (err) {
      console.error('Failed to save Steam connection to Redis:', err.message);
    }
  } else {
    // Try to auto-resolve site account if they log in directly via Steam
    try {
      let uid = await redisCmd(['GET', `steam_to_uid:${steamId}`]);
      if (!uid) {
        // Fallback scan
        const keys = await redisCmd(['KEYS', 'user_connections:*']);
        if (keys && keys.length > 0) {
          for (const key of keys) {
            const conn = await redisGetJSON(key);
            const accounts = conn?.steamAccounts || (conn?.steam ? [conn.steam] : []);
            if (accounts.some(a => a.steamId === steamId)) {
              uid = key.replace('user_connections:', '');
              await redisCmd(['SET', `steam_to_uid:${steamId}`, uid]);
              break;
            }
          }
        }
      }

      if (uid) {
        const cachedUser = await redisGetJSON(`user_profile:${uid}`);
        if (cachedUser) {
          loggedInUser = cachedUser;
        }
      }
    } catch (e) {
      console.warn('Failed to auto-login via Steam callback:', e.message);
    }
  }

  // ── 6. Cookie'leri ayarla ve kütüphaneye yönlendir ──────────────────────
  const response = NextResponse.redirect(`${baseUrl}/library`);
  const cookieOpts = {
    httpOnly: true,
    maxAge:   60 * 60 * 24 * 30,   // 30 gün
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  // Yeni çoklu hesap cookie'si
  response.cookies.set('gp_steam_accounts', JSON.stringify(steamAccounts), cookieOpts);
  // Geriye uyumluluk için ilk hesabı eski cookie'ye de yaz
  response.cookies.set('gp_steam_session', JSON.stringify(steamAccounts[0]), cookieOpts);

  if (loggedInUser) {
    response.cookies.set('gp_user_session', JSON.stringify(loggedInUser), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }

  return response;
}
