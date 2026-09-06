import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redisGetJSON } from '../../../lib/redis';

// GET /api/auth/me  →  Tüm Steam hesaplarını döndür (çoklu hesap desteği)
export async function GET() {
  const cookieStore = await cookies();

  // Giriş yapılmış Gamerisen hesabı varsa tek gerçek kaynak Redis'tir
  const userSession = cookieStore.get('gp_user_session');
  if (userSession?.value) {
    try {
      const user = JSON.parse(userSession.value);
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          const accounts = Array.isArray(conn.steamAccounts)
            ? conn.steamAccounts
            : (conn.steam?.steamId ? [conn.steam] : []);
          return NextResponse.json({
            user: accounts[0] || null,
            accounts,
          });
        }
      }
    } catch {}
  }

  // Hesapsız / misafir web oturumu için cookie'den oku
  const accountsCookie = cookieStore.get('gp_steam_accounts');
  if (accountsCookie?.value) {
    try {
      const accounts = JSON.parse(accountsCookie.value);
      if (Array.isArray(accounts) && accounts.length > 0) {
        return NextResponse.json({
          user:    accounts[0],     // Geriye uyumluluk
          accounts,                  // Çoklu hesap listesi
        });
      }
    } catch {}
  }

  // Geriye dönük uyumluluk: eski tek-hesap cookie'si
  const session = cookieStore.get('gp_steam_session');
  if (session?.value) {
    try {
      const user = JSON.parse(session.value);
      return NextResponse.json({ user, accounts: [user] });
    } catch {}
  }

  return NextResponse.json({ user: null, accounts: [] });
}
