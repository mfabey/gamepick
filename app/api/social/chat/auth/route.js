import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { areFriends, getHiddenUids } from '../../../../lib/social-store';
import { partiesOf } from '../../../../lib/chat-store';
import { authorizeChannel, dmChannel, isPusherConfigured } from '../../../../lib/pusher-server';

// ─────────────────────────────────────────────────────────────────────────────
// Pusher özel kanal yetkilendirmesi.
//
// GÜVENLİĞİN TAMAMI BURADA. Pusher'ın "private-" kanalları, abone olmak isteyen
// istemciyi bu uca yönlendiriyor; imzayı verirsek kanalı dinleyebiliyor.
// Yani BAŞKALARININ özel mesajlarını okumanın önündeki tek engel bu dosya.
//
// Üç şey birden doğrulanıyor:
//   1. Kanal adı gerçekten bu kullanıcının taraf olduğu bir konuşma mu
//   2. Karşı tarafla engel ilişkisi var mı
//   3. Hâlâ arkadaşlar mı  (arkadaşlık bozulduysa kanal da kapanmalı)
//
// Pusher gövdeyi FORM olarak gönderiyor (JSON değil) — socket_id ve
// channel_name alanları application/x-www-form-urlencoded içinde geliyor.
// ─────────────────────────────────────────────────────────────────────────────

function deny(code, status = 403) {
  return NextResponse.json({ error: code }, { status });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return deny('UNAUTHORIZED', 401);

  if (!isPusherConfigured()) return deny('PUSHER_DISABLED', 503);

  const rl = await rateLimit(`rl:dmauth:${user.uid}`, 60, 60);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  // Pusher istemcisi form gövdesi yolluyor; JSON'a düşmek için ikisini de dene.
  let socketId = '';
  let channel = '';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const b = await request.json();
      socketId = String(b.socket_id || '');
      channel = String(b.channel_name || '');
    } else {
      const f = await request.formData();
      socketId = String(f.get('socket_id') || '');
      channel = String(f.get('channel_name') || '');
    }
  } catch { /* aşağıda boş kontrolüne düşer */ }

  if (!socketId || !channel) return deny('BAD_REQUEST', 400);

  // 1. Kanal adı → konuşma kimliği → taraflar
  const cid = channel.startsWith('private-dm-') ? channel.slice('private-dm-'.length) : null;
  const parties = cid ? partiesOf(cid) : null;
  if (!parties || !parties.includes(user.uid)) return deny('NOT_A_PARTY');

  const other = parties[0] === user.uid ? parties[1] : parties[0];

  // 2 + 3. Engel ve arkadaşlık — mesaj gönderimiyle AYNI kurallar.
  const hidden = await getHiddenUids(user.uid);
  if (hidden.has(other)) return deny('BLOCKED');
  if (!(await areFriends(user.uid, other))) return deny('NOT_FRIENDS');

  const auth = authorizeChannel(socketId, dmChannel(cid));
  if (!auth) return deny('PUSHER_DISABLED', 503);

  return NextResponse.json(auth);
}
