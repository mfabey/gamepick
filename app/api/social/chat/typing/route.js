import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../../lib/social-store';
import { convId } from '../../../../lib/chat-store';
import { triggerTyping } from '../../../../lib/pusher-server';

// ─────────────────────────────────────────────────────────────────────────────
// "Yazıyor..." bildirimi.
//
// KALICI DEĞİL, HİÇBİR YERE YAZILMIYOR. Yalnızca kanala bir olay düşüyor;
// Redis'e hiç uğramıyor. Kaçırılması zararsız bir bilgi ve saklanacak bir
// tarafı da yok — kimin ne zaman yazmaya başladığını kaydetmek, kimsenin
// istemediği bir iz bırakmak olurdu.
//
// İSTEMCİ KISITLIYOR: her tuş vuruşunda çağrılırsa bu uç sele döner. Mobil
// taraf en fazla 3 saniyede bir gönderiyor; buradaki sınır ikinci savunma.
//
// Pusher yapılandırılmamışsa sessizce hiçbir şey yapmıyor.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // 3 sn aralıkla saatte ~1200 mümkün; 600 makul bir tavan (yazma seansları
  // kısa sürer ve sürekli yazan biri zaten mesaj gönderiyordur).
  const rl = await rateLimit(`rl:typing:${user.uid}`, 600, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const other = String(body.to || '');
  if (!other || other === user.uid) {
    return NextResponse.json({ error: 'INVALID_TARGET' }, { status: 400 });
  }

  // Mesaj gönderimiyle aynı kapı: engellenen veya arkadaş olmayan biri
  // karşı tarafın ekranında "yazıyor" gösteremez.
  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other)) return NextResponse.json({ error: 'BLOCKED' }, { status: 403 });
  if (!(await areFriends(user.uid, other))) {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 403 });
  }

  await triggerTyping(convId(user.uid, other), user.uid);
  return NextResponse.json({ ok: true });
}
