import { NextResponse } from 'next/server';

// GET /api/auth/steam  →  Steam OpenID login sayfasına yönlendir
// Mobil: ?mobile=1&redirect_uri=<app deep link> ile çağrılırsa, callback web yerine
// uygulamanın deep link'ine profil verisiyle döner.
export async function GET(request) {
  // Resolve base URL dynamically from the incoming request (supporting both localhost and any production domain automatically)
  const baseUrl = request.nextUrl.origin;
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile') === '1';
  const appRedirect = searchParams.get('redirect_uri') || '';

  // Steam, openid.return_to'ya kendi parametrelerini ekleyerek geri döner; mobil
  // bağlamı buradan taşıyoruz (realm hâlâ baseUrl'in bir ön eki).
  let returnTo = `${baseUrl}/api/auth/steam/callback`;
  if (mobile) {
    const rp = new URLSearchParams({ mobile: '1' });
    if (appRedirect) rp.set('app_redirect', appRedirect);
    returnTo += `?${rp.toString()}`;
  }

  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  returnTo,
    'openid.realm':      baseUrl,
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`
  );
}
