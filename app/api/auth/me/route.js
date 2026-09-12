import { NextResponse } from 'next/server';
import { readValue } from '../../../lib/session-cookie';
import { cookies } from 'next/headers';
import { redisGetJSON } from '../../../lib/redis';

// GET /api/auth/me  →  Tüm Steam hesaplarını döndür (çoklu hesap desteği)
export async function GET() {
  const cookieStore = await cookies();

  // Giriş yapılmış Gamerisen hesabı varsa tek gerçek kaynak Redis'tir
  const userSession = cookieStore.get('gp_user_session');
  if (userSession?.value) {
    try {
      // İMZALI ÇEREZ: `readValue` doğruluyor. Main bunu `JSON.parse` ile
      // okuyordu; bu ağaçta kimlik çerezleri imzalı olduğu icin parse her
      // zaman hata verir ve blok sessizce hiç çalışmazdı.
      const user = await readValue(userSession.value);
      if (user?.uid) {
        const conn = await redisGetJSON(`user_connections:${user.uid}`).catch(() => null);
        if (conn) {
          const rawAccounts = Array.isArray(conn.steamAccounts)
            ? conn.steamAccounts
            : (conn.steam?.steamId ? [conn.steam] : []);
          const accounts = rawAccounts.filter(a => a && a.steamId);
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
      const accounts = await readValue(accountsCookie.value);
      if (Array.isArray(accounts)) {
        const validAccounts = accounts.filter(a => a && a.steamId);
        if (validAccounts.length > 0) {
          return NextResponse.json({
            user:    validAccounts[0],     // Geriye uyumluluk
            accounts: validAccounts,        // Çoklu hesap listesi
          });
        }
      }
    } catch {}
  }

  // Geriye dönük uyumluluk: eski tek-hesap cookie'si
  const session = cookieStore.get('gp_steam_session');
  if (session?.value) {
    try {
      const user = await readValue(session.value);
      if (user && user.steamId) {
        return NextResponse.json({ user, accounts: [user] });
      }
    } catch {}
  }

  return NextResponse.json({ user: null, accounts: [] });
}
