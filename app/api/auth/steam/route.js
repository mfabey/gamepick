import { NextResponse } from 'next/server';

// GET /api/auth/steam  →  Steam OpenID login sayfasına yönlendir
export async function GET(request) {
  // Resolve base URL dynamically from the incoming request (supporting both localhost and any production domain automatically)
  const baseUrl = request.nextUrl.origin;

  const params = new URLSearchParams({
    'openid.ns':         'http://specs.openid.net/auth/2.0',
    'openid.mode':       'checkid_setup',
    'openid.return_to':  `${baseUrl}/api/auth/steam/callback`,
    'openid.realm':      baseUrl,
    'openid.identity':   'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return NextResponse.redirect(
    `https://steamcommunity.com/openid/login?${params.toString()}`
  );
}
