import { NextResponse } from 'next/server';
import { redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { mergeProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Bağlı mağazalar — MOBİL için.
//
// NEDEN AYRI BİR UÇ: web akışı bağlantıyı çerezden gelen oturumla yazıyor
// (steam/callback, xbox/callback). Mobilde çerez yok; OAuth geri dönüşü deep
// link ile geliyor ve callback hangi Gamerisen kullanıcısı olduğunu BİLMİYOR.
// Sonuç: bağlantı yalnızca cihazda kalıyordu, kullanıcı başka cihazdan girince
// yeniden bağlamak zorundaydı.
//
// BELİRTECİ OAUTH ZİNCİRİNE SOKMUYORUZ. Firebase idToken'ı `state`
// parametresine koyup callback'te çözmek daha az kod olurdu ama o belirteç
// Steam'in yönlendirmesinden geçer: sunucu günlüklerine, tarayıcı geçmişine ve
// referrer başlıklarına düşer. Bunun yerine mobil, deep link döndükten SONRA
// kendi Bearer belirteciyle buraya yazıyor.
//
// VERİ ŞEKLİ web ile aynı anahtarı paylaşıyor (`user_connections:{uid}`), yani
// sitede bağlanan hesap mobilde de görünüyor ve tersi.
//   { steamAccounts: [...], steam: {...} (eski tekli), xbox: {...} }
// ─────────────────────────────────────────────────────────────────────────────

const MAX_STEAM = 5;   // mobil arayüzle aynı sınır

const connKey = (uid) => `user_connections:${uid}`;
const steamIndexKey = (steamId) => `steam_to_uid:${steamId}`;

async function readConnections(uid) {
  return (await redisGetJSON(connKey(uid)).catch(() => null)) || {};
}

/**
 * Eski tekli `steam` alanını da hesaba katarak diziye çevirir.
 * Web tarafı bir dönem tek hesap yazıyordu; o kayıtlar hâlâ Redis'te.
 */
function steamListOf(conn) {
  if (Array.isArray(conn.steamAccounts)) return conn.steamAccounts;
  if (conn.steam?.steamId) return [conn.steam];
  return [];
}

function slimSteam(a) {
  return {
    steamId: String(a.steamId),
    name: String(a.name || '').slice(0, 120),
    avatar: String(a.avatar || '').slice(0, 400),
  };
}

function slimXbox(x) {
  if (!x?.xuid) return null;
  return {
    xuid: String(x.xuid),
    gamertag: String(x.gamertag || '').slice(0, 120),
    avatar: String(x.avatar || '').slice(0, 400),
    refreshToken: x.refreshToken ? String(x.refreshToken) : undefined,
  };
}

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

/** GET — bu hesabın bağlı mağazaları. */
export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const conn = await readConnections(user.uid);
  return NextResponse.json({
    steamAccounts: steamListOf(conn),
    xbox: conn.xbox || null,
  });
}

/** PUT — bağlantı ekle. Gövde: { steam: {...} } veya { xbox: {...} } */
export async function PUT(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const conn = await readConnections(user.uid);

  if (body.steam?.steamId) {
    const acc = slimSteam(body.steam);
    const list = steamListOf(conn);
    const i = list.findIndex((a) => String(a.steamId) === acc.steamId);

    if (i >= 0) list[i] = acc;
    else if (list.length >= MAX_STEAM) {
      return NextResponse.json({ error: 'STEAM_LIMIT' }, { status: 409 });
    } else list.push(acc);

    conn.steamAccounts = list;
    delete conn.steam;              // eski tekli alan artık geçersiz

    // Ters dizin: user-me ve steam/callback bunu okuyor, tutarlı kalmalı
    await redisCmd(['SET', steamIndexKey(acc.steamId), user.uid]).catch(() => {});
  }

  if (body.xbox) {
    const prevRefreshToken = conn.xbox?.refreshToken;
    const x = slimXbox(body.xbox);
    if (x) {
      if (!x.refreshToken && prevRefreshToken) {
        x.refreshToken = prevRefreshToken;
      }
      conn.xbox = x;
    }
  }

  await redisSetJSON(connKey(user.uid), conn).catch(() => {});

  return NextResponse.json({
    ok: true,
    steamAccounts: steamListOf(conn),
    xbox: conn.xbox || null,
  });
}

/** DELETE — ?platform=steam&steamId=X  veya  ?platform=xbox */
export async function DELETE(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform');
  const conn = await readConnections(user.uid);

  if (platform === 'steam') {
    const steamId = searchParams.get('steamId');
    if (!steamId) return NextResponse.json({ error: 'steamId gerekli' }, { status: 400 });

    conn.steamAccounts = steamListOf(conn).filter((a) => String(a.steamId) !== String(steamId));
    delete conn.steam;

    // Ters dizin de temizlenmeli, yoksa kopan hesap hâlâ bu uid'ye işaret eder
    await redisCmd(['DEL', steamIndexKey(steamId)]).catch(() => {});
  } else if (platform === 'xbox') {
    const gamertag = conn.xbox?.gamertag;
    delete conn.xbox;
    if (gamertag) {
      await redisCmd(['DEL', `xbox_to_uid:${gamertag}`]).catch(() => {});
    }
  } else {
    return NextResponse.json({ error: 'platform gerekli' }, { status: 400 });
  }

  await redisSetJSON(connKey(user.uid), conn).catch(() => {});

  // Eğer hiçbir bağlantı kalmadıysa profil oyun sayacını da 0 yap
  const remainingSteam = steamListOf(conn);
  if (remainingSteam.length === 0 && !conn.xbox) {
    await mergeProfile(user.uid, { gameCount: 0 }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    steamAccounts: remainingSteam,
    xbox: conn.xbox || null,
  });
}
