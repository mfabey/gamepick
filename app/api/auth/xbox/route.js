import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin } = request.nextUrl;
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile') === '1';
  const appRedirect = searchParams.get('redirect_uri') || '';

  if (!process.env.XBOX_CLIENT_ID) {
    return NextResponse.json({ error: 'XBOX_CLIENT_ID tanımlı değil' }, { status: 500 });
  }

  // Mobil bağlamı OAuth `state` ile taşı (Microsoft state'i aynen geri döndürür)
  const state = mobile
    ? Buffer.from(JSON.stringify({ mobile: 1, appRedirect }), 'utf8').toString('base64url')
    : '';

  const params = new URLSearchParams({
    client_id:     process.env.XBOX_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  `${origin}/api/auth/xbox/callback`,
    scope:         'XboxLive.signin offline_access',
    response_mode: 'query',
    prompt:        'select_account',
  });
  if (state) params.set('state', state);

  return NextResponse.redirect(
    `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`
  );
}
