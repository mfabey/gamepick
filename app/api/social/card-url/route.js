import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisGetJSON } from '../../../lib/redis';
import { friendIds, libraries } from '../../../lib/steam-graph';
import { buildCards } from '../../../lib/game-cards';
import { signCard, canSignCards } from '../../../lib/card-sign';
import { getProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Paylaşım anında imzalı kart adresi üretir.
//
// NEDEN AYRI UÇ: /api/social/game-cards listeyi yüklerken adresleri önceden
// imzalıyor, ama ŞEHİR ETİKETİ paylaşım anında belli oluyor — kullanıcı o an
// "konumumu ekle" diyor. Önceden imzalanmış adres bunu taşıyamaz.
//
// DEĞERLER SUNUCUDA YENİDEN HESAPLANIYOR, istemciden ALINMIYOR. İstemcinin
// gönderdiği saat/sıra değerlerini imzalasaydık, imzanın koruduğu şey ortadan
// kalkardı: herkes istediği sayıyla kart bastırabilirdi. Hesaplama, Faz 1'in
// 24 saatlik kütüphane önbelleğinden geldiği için ucuz.
//
// ŞEHİR yalnızca bir ETİKET. Koordinat buraya hiç ulaşmıyor: cihaz konumu
// kendi içinde çözümleyip yalnızca şehir adını gönderiyor.
// ─────────────────────────────────────────────────────────────────────────────

const connKey = (uid) => `user_connections:${uid}`;

function steamListOf(conn) {
  if (Array.isArray(conn?.steamAccounts) && conn.steamAccounts.length) return conn.steamAccounts;
  if (conn?.steam?.steamId) return [conn.steam];
  return [];
}

/**
 * Şehir adını temizler.
 * İmza sahteciliği engelliyor ama etiket yine de GÖRSELE basılıyor: serbest
 * metin kabul edilirse kart, istenen her şeyin yazdırılabildiği bir yüzeye
 * dönüşür. Harf, boşluk ve tire dışındaki her şey atılıyor.
 */
function cleanCity(v) {
  return String(v || '')
    .replace(/[^\p{L}\s\-']/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  if (!canSignCards()) return NextResponse.json({ error: 'SHARING_DISABLED' }, { status: 503 });

  const rl = await rateLimit(`rl:cardurl:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const appid = Number(body.appid);
  if (!Number.isFinite(appid)) {
    return NextResponse.json({ error: 'APPID_REQUIRED' }, { status: 400 });
  }
  const city = cleanCity(body.city);
  const lang = body.lang === 'en' ? 'en' : 'tr';

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) return NextResponse.json({ error: 'STEAM_REQUIRED' }, { status: 409 });

  const mySteamId = accounts[0].steamId;
  const ids = await friendIds(mySteamId);
  const libs = await libraries([mySteamId, ...ids]);

  const mine = libs.get(mySteamId)?.games;
  if (!mine) return NextResponse.json({ error: 'SELF_PRIVATE' }, { status: 409 });

  const { cards } = buildCards(mine, ids.map((id) => libs.get(id)?.games ?? null));
  const card = cards.find((c) => c.appid === appid);
  if (!card) return NextResponse.json({ error: 'CARD_NOT_FOUND' }, { status: 404 });

  const profile = await getProfile(user.uid).catch(() => null);

  const p = {
    g: card.name || '',
    h: String(Math.round(card.hours)),
    r: card.rank ? String(card.rank) : '',
    o: card.owners > 1 ? String(card.owners) : '',
    u: profile?.username || '',
    l: lang,
    c: city,
  };
  const sig = await signCard(p);
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    url: `${origin}/api/card?${new URLSearchParams({ ...p, sig })}`,
    city,
  });
}
