import { NextResponse } from 'next/server';
import { sunucuHatasi } from '../../../lib/api-error';
import { cookies } from 'next/headers';
import { readValue } from '../../../lib/session-cookie';
import { revokeUserTokens } from '../../../lib/firebase-admin';

export async function POST() {
  try {
    // ── ÇIKIŞ ARTIK JETONU DA İPTAL EDİYOR ──────────────────────────────────
    // Öncesinde bu uç yalnızca çerezleri temizliyordu. Firebase yenileme
    // jetonu SÜRESİZ ve döndürülmüyor; dolayısıyla çalınmış bir jeton,
    // kullanıcı çıkış yaptıktan sonra da çalışmaya devam ediyordu.
    //
    // Çerezi okuyup uid'i buradan alıyoruz — çıkışın kime ait olduğunu
    // bilmenin başka yolu yok. İmza doğrulanıyor (readValue), yani sahte
    // çerezle başkasının jetonunu iptal ettirme yolu da kapalı.
    //
    // Admin SDK yapılandırılmamışsa iptal SESSİZCE ATLANIYOR ve çıkış yine
    // tamamlanıyor: kullanıcıyı oturumda bırakmak, iptal edememekten kötü.
    try {
      const jar = await cookies();
      const oturum = await readValue(jar.get('gp_user_session')?.value);
      if (oturum?.uid) await revokeUserTokens(oturum.uid);
    } catch { /* iptal başarısız → çıkış yine de tamamlanmalı */ }

    const response = NextResponse.json({ ok: true });

    const cookieOptions = {
      httpOnly: true,
      maxAge: 0,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };

    // Clear all session cookies
    response.cookies.set('gp_user_session', '', cookieOptions);
    response.cookies.set('gp_steam_session', '', { ...cookieOptions, sameSite: 'lax' });
    response.cookies.set('gp_xbox_session', '', { ...cookieOptions, sameSite: 'lax' });

    return response;
  } catch (err) {
    console.error('user-logout API Error:', err.message);
    return sunucuHatasi(err, 'auth/user-logout');
  }
}
