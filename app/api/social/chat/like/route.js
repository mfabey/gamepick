import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../../lib/social-store';
import { convId, toggleLike } from '../../../../lib/chat-store';
import { triggerLike } from '../../../../lib/pusher-server';

// ─────────────────────────────────────────────────────────────────────────────
// Mesaj beğenisi — çift dokunuşla açılıp kapanıyor.
//
// KENDİ MESAJINI DA BEĞENEBİLİRSİN. Engellemek teknik olarak kolay ama
// gereksiz bir kural: Instagram'da da serbest ve kimse bunu istismar olarak
// görmüyor.
//
// TEK TÜR: kalp. Emoji seçici koymadık — her ek tepki türü, saklanacak yeni
// bir alan ve arayüzde yeni bir karar demek. Kalp, "gördüm ve hoşuma gitti"
// için yeterli.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Çift dokunuş hızlı tekrarlanabiliyor; sınır cömert ama sonsuz değil.
  const rl = await rateLimit(`rl:dmlike:${user.uid}`, 300, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const other = String(body.with || '');
  const msgId = String(body.id || '');
  if (!other || other === user.uid || !msgId) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  // Mesaj gönderimiyle aynı kapı.
  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other)) return NextResponse.json({ error: 'BLOCKED' }, { status: 403 });
  if (!(await areFriends(user.uid, other))) {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 403 });
  }

  const cid = convId(user.uid, other);
  const r = await toggleLike(cid, msgId, user.uid);

  await triggerLike(cid, msgId, r.likes, user.uid);
  return NextResponse.json({ ok: true, ...r });
}
