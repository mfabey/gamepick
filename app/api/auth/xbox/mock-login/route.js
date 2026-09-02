import { NextResponse } from 'next/server';
import { sunucuHatasi } from '../../../../lib/api-error';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { gamertag, gamepassType } = await request.json();
    const cleanGamertag = (gamertag || '').trim() || 'MasterChief117';
    
    // Xbox Live gamerpic fallback
    const avatar = `https://avatar-ssl.xboxlive.com/avatar/${encodeURIComponent(cleanGamertag)}/avatarpic-l.png`;
    
    const session = {
      xuid: `mock_${Date.now()}`,
      gamertag: cleanGamertag,
      avatar,
      isMock: true,
      gamepassType: gamepassType || 'ultimate'
    };
    
    const cookieStore = await cookies();
    cookieStore.set('gp_xbox_session', JSON.stringify(session), {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   60 * 60 * 24 * 30, // 30 gün
      path:     '/',
      sameSite: 'lax',
    });
    
    return NextResponse.json({ 
      ok: true, 
      user: { 
        xuid: session.xuid, 
        gamertag: session.gamertag, 
        avatar: session.avatar, 
        isMock: true, 
        gamepassType: session.gamepassType 
      } 
    });
  } catch (err) {
    return sunucuHatasi(err, 'auth/xbox/mock-login');
  }
}
