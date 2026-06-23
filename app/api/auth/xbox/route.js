import { NextResponse } from 'next/server';

export async function GET(request) {
  const { origin } = request.nextUrl;

  if (!process.env.XBOX_CLIENT_ID) {
    return NextResponse.json({ error: 'XBOX_CLIENT_ID tanımlı değil' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id:     process.env.XBOX_CLIENT_ID,
    response_type: 'code',
    redirect_uri:  `${origin}/api/auth/xbox/callback`,
    scope:         'XboxLive.signin offline_access',
    response_mode: 'query',
    prompt:        'select_account',
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?${params}`
  );
}
