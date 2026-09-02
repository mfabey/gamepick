import { NextResponse } from 'next/server';
import { issueState } from '../../../lib/oauth-state';

// GET /api/auth/steam  →  Steam OpenID login sayfasına yönlendir
// Mobil: ?mobile=1&redirect_uri=<app deep link> ile çağrılırsa, callback web yerine
// uygulamanın deep link'ine profil verisiyle döner.
export async function GET(request) {
  // Resolve base URL dynamically from the incoming request (supporting both localhost and any production domain automatically)
  const baseUrl = request.nextUrl.origin;
  const { searchParams } = new URL(request.url);
  const mobile = searchParams.get('mobile') === '1';
  const appRedirect = searchParams.get('redirect_uri') || '';

  // STATE — CSRF + tekrar koruması. Steam'in `check_authentication` imzası
  // "bu Steam kullanıcısı gerçek mi" sorusunu yanıtlıyor, "bu akışı bu
  // tarayıcı mı başlattı" sorusunu DEĞİL. İkincisi olmadan saldırgan kendi
  // geçerli assertion'ını yakalayıp kurbanın oturumuna iliştirebiliyordu.
  //
  // `return_to`'ya konuyor çünkü OpenID 2.0'da taşınabilir bağlam oraya
  // yazılıyor — mobil bilgisi zaten aynı yoldan geçiyordu. Steam return_to'yu
  // imzalı küme içinde geri döndürüyor.
  const state = await issueState({ mobile: mobile ? 1 : 0 });
  if (!state) {
    return NextResponse.json(
      { error: 'AUTH_UNAVAILABLE', message: 'Giriş şu an başlatılamıyor. Lütfen tekrar deneyin.' },
      { status: 503 },
    );
  }

  // Steam, openid.return_to'ya kendi parametrelerini ekleyerek geri döner; mobil
  // bağlamı buradan taşıyoruz (realm hâlâ baseUrl'in bir ön eki).
  let returnTo = `${baseUrl}/api/auth/steam/callback`;
  const rp = new URLSearchParams({ state });
  if (mobile) {
    rp.set('mobile', '1');
    if (appRedirect) rp.set('app_redirect', appRedirect);
  }
  returnTo += `?${rp.toString()}`;

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
