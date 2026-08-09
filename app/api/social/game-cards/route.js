import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { redisGetJSON } from '../../../lib/redis';
import { friendIds, libraries } from '../../../lib/steam-graph';
import { buildCards } from '../../../lib/game-cards';
import { signCard, canSignCards } from '../../../lib/card-sign';
import { getProfile } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Oyun kartları — paylaşılabilir oyuncu istatistikleri.
//
// NEDEN ARKADAŞ SIRALAMASI: "Elden Ring'de 400 saatin var" Steam'in zaten
// gösterdiği bir sayı; paylaşmaya değmez ve 4.2.2 açısından bir şey kanıtlamaz.
// "Arkadaşların arasında 9 kişiden 2.'sin" ise on üç ayrı ÖZEL kütüphanenin
// karşılaştırılmasını gerektiriyor — bir web sitesinin yapamayacağı hesap bu.
//
// MALİYET: Faz 1'in `steam_lib:{steamId}` önbelleğini yeniden kullanıyor
// (24 saat TTL, grafik içinde paylaşımlı). Steam arkadaşları ekranı bir kez
// açıldıysa bu uç Steam'e hiç çağrı yapmıyor.
//
// Hesabın kendisi lib/game-cards.js içinde ve SAF — sınanabilmesi için.
// ─────────────────────────────────────────────────────────────────────────────

const connKey = (uid) => `user_connections:${uid}`;

function steamListOf(conn) {
  if (Array.isArray(conn?.steamAccounts) && conn.steamAccounts.length) return conn.steamAccounts;
  if (conn?.steam?.steamId) return [conn.steam];
  return [];
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:gamecards:${user.uid}`, 30, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const conn = await redisGetJSON(connKey(user.uid)).catch(() => null);
  const accounts = steamListOf(conn);
  if (!accounts.length) return NextResponse.json({ error: 'STEAM_REQUIRED' }, { status: 409 });

  const mySteamId = accounts[0].steamId;

  // Arkadaş OLMASA DA kartlar üretilebilmeli — sıralama olmadan da "toplam
  // saat" ve "en çok oynanan" anlamlı. Bu yüzden boş liste, hata değil.
  const ids = await friendIds(mySteamId);
  const libs = await libraries([mySteamId, ...ids]);

  const mine = libs.get(mySteamId)?.games;
  if (!mine) return NextResponse.json({ error: 'SELF_PRIVATE' }, { status: 409 });

  const { summary, cards } = buildCards(mine, ids.map((id) => libs.get(id)?.games ?? null));

  // ── Paylaşım bağlantıları ────────────────────────────────────────────────
  // CARD_SECRET yoksa `shareUrl` HİÇ eklenmiyor. Bozuk bir bağlantı üretip
  // kullanıcıyı 403'e göndermektense, arayüz paylaş düğmesini hiç göstermesin.
  let withShare = cards;
  if (canSignCards()) {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') === 'en' ? 'en' : 'tr';
    const profile = await getProfile(user.uid).catch(() => null);
    const uname = profile?.username || '';
    const origin = new URL(request.url).origin;

    withShare = await Promise.all(cards.map(async (c) => {
      const p = {
        g: c.name || '',
        h: String(Math.round(c.hours)),
        r: c.rank ? String(c.rank) : '',
        o: c.owners > 1 ? String(c.owners) : '',
        u: uname,
        l: lang,
      };
      const sig = await signCard(p);
      const qs = new URLSearchParams({ ...p, sig });
      return { ...c, shareUrl: `${origin}/api/card?${qs}` };
    }));
  }

  return NextResponse.json({ summary, cards: withShare });
}
