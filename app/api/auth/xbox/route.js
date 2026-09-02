import { NextResponse } from 'next/server';
import { issueState } from '../../../lib/oauth-state';

export async function GET(request) {
  const { origin } = request.nextUrl;
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile') === '1';
  const appRedirect = searchParams.get('redirect_uri') || '';

  if (!process.env.XBOX_CLIENT_ID) {
    return NextResponse.json({ error: 'XBOX_CLIENT_ID tanımlı değil' }, { status: 500 });
  }

  // STATE HER AKIŞTA ÜRETİLİYOR — web dahil. Öncesinde yalnızca mobilde
  // vardı ve içeriği istemciye açık base64 JSON'du; web akışında hiç state
  // olmadığı için dönüş ucunun "bu akışı biz mi başlattık" diye soracak bir
  // dayanağı yoktu (bkz. app/lib/oauth-state.js).
  //
  // Yük SUNUCUDA duruyor: `appRedirect` artık state'in içinde taşınmıyor,
  // Redis'te saklanıyor ve istemci yalnızca opak kimliği görüyor.
  const state = await issueState(mobile ? { mobile: 1, appRedirect } : { web: 1 });

  // Redis yoksa state üretilemez. AÇIK GEÇMEK yerine duruyoruz: korumasız
  // bir OAuth akışı başlatmak, korumayı hiç eklememekle aynı kapıya çıkar.
  if (!state) {
    return NextResponse.json(
      { error: 'AUTH_UNAVAILABLE', message: 'Giriş şu an başlatılamıyor. Lütfen tekrar deneyin.' },
      { status: 503 },
    );
  }

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
