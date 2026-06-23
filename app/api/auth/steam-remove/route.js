import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function getUserConnections(uid) {
  if (!REDIS_URL || !REDIS_TOKEN) return {};
  try {
    const res = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', `user_connections:${uid}`]),
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : {};
  } catch { return {}; }
}

async function saveUserConnection(uid, platform, data) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  try {
    const current = await getUserConnections(uid);
    if (data === null) delete current[platform];
    else current[platform] = data;
    await fetch(REDIS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', `user_connections:${uid}`, JSON.stringify(current)]),
      cache: 'no-store',
    });
  } catch {}
}

// DELETE /api/auth/steam-remove?steamId=XXXXX
// Belirli bir Steam hesabını bağlı hesaplar listesinden çıkarır.
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const steamId = searchParams.get('steamId');
  if (!steamId) {
    return NextResponse.json({ error: 'steamId gerekli' }, { status: 400 });
  }

  const cookieStore = await cookies();
  let accounts = [];

  try {
    const c = cookieStore.get('gp_steam_accounts');
    if (c?.value) accounts = JSON.parse(c.value);
  } catch {}

  // Bu hesabı çıkar
  const updated = accounts.filter(a => a.steamId !== steamId);

  const response = NextResponse.json({ ok: true, accounts: updated });
  const cookieOpts = {
    httpOnly: true,
    maxAge:   60 * 60 * 24 * 30,
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  if (updated.length === 0) {
    // Hiç hesap kalmadıysa her iki cookie'yi de temizle
    response.cookies.set('gp_steam_accounts', '', { ...cookieOpts, maxAge: 0 });
    response.cookies.set('gp_steam_session',  '', { ...cookieOpts, maxAge: 0 });

    // Redis'ten de temizle
    const userSession = cookieStore.get('gp_user_session');
    if (userSession?.value) {
      try {
        const user = JSON.parse(userSession.value);
        await saveUserConnection(user.uid, 'steam', null);
        await saveUserConnection(user.uid, 'steamAccounts', null);
      } catch {}
    }
  } else {
    response.cookies.set('gp_steam_accounts', JSON.stringify(updated), cookieOpts);
    response.cookies.set('gp_steam_session',  JSON.stringify(updated[0]), cookieOpts);

    // Redis güncelle
    const userSession = cookieStore.get('gp_user_session');
    if (userSession?.value) {
      try {
        const user = JSON.parse(userSession.value);
        await saveUserConnection(user.uid, 'steamAccounts', updated);
        await saveUserConnection(user.uid, 'steam', updated[0]);
      } catch {}
    }
  }

  return response;
}
