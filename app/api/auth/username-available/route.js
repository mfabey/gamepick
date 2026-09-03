import { NextResponse } from 'next/server';
import { validateUsername } from '../../../lib/content-filter';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { uidForUsername } from '../../../lib/social-store';
import { clientIp } from '../../../lib/client-ip';

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı adı uygunluk kontrolü — KAYIT SIRASINDA, oturum açılmadan önce.
//
// /api/social/username?check= ucu oturum istiyor; kayıt formunda henüz token
// yok, o yüzden ayrı bir genel uç gerekiyor.
//
// Genel olduğu için kullanıcı adı taraması yapılabilir. IP başına hız sınırı
// bunu pratikte kullanışsız hâle getiriyor; ayrıca zaten alınmış adları
// öğrenmek büyük bir bilgi değil (adlar profillerde görünür).
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const rl = await rateLimit(`rl:uname_pub:${clientIp(request)}`, 60, 60);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const u = (searchParams.get('u') || '').trim();

  if (!u) return NextResponse.json({ available: false, error: 'USERNAME_FORMAT' });

  const v = validateUsername(u);
  if (!v.ok) return NextResponse.json({ available: false, error: v.error });

  const owner = await uidForUsername(u);
  return NextResponse.json({
    available: !owner,
    error: owner ? 'TAKEN' : null,
  });
}
