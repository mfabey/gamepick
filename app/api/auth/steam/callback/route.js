import { NextResponse } from 'next/server';

const STEAM_API_KEY = process.env.STEAM_API_KEY;

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

  // ── 4. Oturum cookie'si ayarla ve kütüphaneye yönlendir ─────────────────
  const response = NextResponse.redirect(`${baseUrl}/library`);
  response.cookies.set('gp_steam_session', JSON.stringify(profile), {
    httpOnly: true,
    maxAge:   60 * 60 * 24 * 30,   // 30 gün
    path:     '/',
    sameSite: 'lax',
  });

  return response;
}
