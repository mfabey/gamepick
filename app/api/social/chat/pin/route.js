import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../../lib/social-store';
import { convId, setPin } from '../../../../lib/chat-store';

// ─────────────────────────────────────────────────────────────────────────────
// Sabit mesaj — konuşmanın tepesinde duran bant.
//
// KONUŞMA BAŞINA TEK sabit ve HER İKİ TARAF DA değiştirebiliyor. Sabitlemek
// ortak bir işaret: "ikimizin de üstünde durduğu şey". Kişiye özel olsaydı
// karşı tarafın gördüğü sabit farklı olur ve "sabitledim" demek anlamını
// yitirirdi; yalnızca sabitleyen kaldırabilseydi de karşı taraf başkasının
// koyduğu bandın altında sıkışırdı.
//
// `id` BOŞ GÖNDERMEK = sabitlemeyi kaldır. Ayrı bir DELETE ucu yerine tek
// giriş: istemci tarafında "sabitle/kaldır" zaten tek bir düğme.
//
// ANLIK BİLDİRİM YOK, bilerek. Karşı taraf sabiti bir sonraki geçmiş
// çekiminde görüyor (yedek yoklamada en geç 20 sn). Sabit zamana duyarlı bir
// bilgi değil ve yalnızca bunun için beşinci bir Pusher olayı bağlamak,
// kazandırdığından fazlasını karmaşıklaştırırdı.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  // Sabitleme nadir bir eylem; sınır dar tutulabilir.
  const rl = await rateLimit(`rl:dmpin:${user.uid}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const other = String(body.with || '');
  if (!other || other === user.uid) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }

  // Mesaj gönderimiyle AYNI kapı: engellenen biriyle olan konuşmaya
  // dokunulamıyor, arkadaş olmayan yazamıyor.
  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other)) return NextResponse.json({ error: 'BLOCKED' }, { status: 403 });
  if (!(await areFriends(user.uid, other))) {
    return NextResponse.json({ error: 'NOT_FRIENDS' }, { status: 403 });
  }

  const msgId = body.id ? String(body.id).slice(0, 64) : '';
  const cid = convId(user.uid, other);
  const r = await setPin(cid, msgId, user.uid);

  return NextResponse.json({ ok: true, ...r });
}
