import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { searchUsers, getFriendState, getPrivacy } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı arama — arkadaş eklemek için.
//
// Yalnızca kullanıcı adı ÖN EKİ ile arama yapılır; kullanıcı listesi gezilemez.
// Ayrıca `discoverable` gizlilik ayarı kapalı olanlar sonuçlardan çıkarılır.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:search:${user.uid}`, 60, 60);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  const raw = await searchUsers(q, user.uid, 20);
  if (raw.length === 0) return NextResponse.json({ results: [] });

  // Keşfedilmek istemeyenleri ele
  const flags = await Promise.all(raw.map((r) => getPrivacy(r.uid)));
  const discoverable = raw.filter((_, i) => flags[i].discoverable);

  // Mevcut ilişkiyi işaretle → arayüz doğru butonu göstersin
  const { friends, incoming, outgoing } = await getFriendState(user.uid);
  const fs = new Set(friends);
  const inc = new Set(incoming);
  const out = new Set(outgoing);

  return NextResponse.json({
    results: discoverable.map((r) => ({
      ...r,
      relation: fs.has(r.uid) ? 'friends'
        : out.has(r.uid) ? 'requested'
        : inc.has(r.uid) ? 'incoming'
        : 'none',
    })),
  });
}
