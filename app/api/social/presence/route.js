import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../lib/social-store';
import { touchPresence, getPresence } from '../../../lib/presence';

// ─────────────────────────────────────────────────────────────────────────────
// Çevrimiçi nabzı.
//
// NEDEN AYRI UÇ: sohbet ekranı 45 saniyede bir "hâlâ buradayım" demek zorunda.
// Bunu /api/social/chat ile yapsaydık her nabızda tüm mesaj geçmişi Redis'ten
// okunur ve ağdan geçerdi — nabız için yüz kat fazla iş.
//
// DURUM YALNIZCA ARKADAŞA AÇIK. Rastgele bir uid ile sorgulayıp birinin
// çevrimiçi olup olmadığını öğrenmek mümkün değil; bu, kullanıcının
// takip edilmesine açık bir kapı olurdu.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // 45 sn aralıkla saatte 80 nabız; 200 rahat bir tavan.
  const rl = await rateLimit(`rl:presence:${user.uid}`, 200, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  await touchPresence(user.uid);

  // İsteğe bağlı: aynı turda karşı tarafın durumunu da döndür, böylece
  // nabız ve durum okuma tek istekte birleşiyor.
  const { searchParams } = new URL(request.url);
  const other = searchParams.get('with');
  if (!other) return NextResponse.json({ ok: true });

  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other) || !(await areFriends(user.uid, other))) {
    return NextResponse.json({ ok: true, presence: null });
  }

  return NextResponse.json({ ok: true, presence: await getPresence(other) });
}
