import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/auth/me  →  Tüm Steam hesaplarını döndür (çoklu hesap desteği)
export async function GET() {
  const cookieStore = await cookies();

  // Önce yeni çoklu hesap cookie'sine bak
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
