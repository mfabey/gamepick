import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../../lib/rate-limit';
import { getProfiles, getHiddenUids } from '../../../../lib/social-store';
import { listConversations } from '../../../../lib/chat-store';
import { getPresences } from '../../../../lib/presence';

// ─────────────────────────────────────────────────────────────────────────────
// Konuşma listesi — sohbet sekmesinin kökü.
//
// ENGELLENENLER BURADA DA ELENİYOR. Konuşma kaydı Redis'te duruyor olabilir
// (engel, geçmişi silmiyor) ama listede görünmemeli — aksi hâlde engellediğin
// kişi listenin başında durmaya devam eder.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:dmlist:${user.uid}`, 120, 60);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const rows = await listConversations(user.uid);
  if (!rows.length) return NextResponse.json({ conversations: [], unread: 0 });

  const hidden = await getHiddenUids(user.uid);
  const visible = rows.filter((r) => r.otherUid && !hidden.has(r.otherUid));

  const uids = visible.map((r) => r.otherUid);
  // Profiller ve durumlar PARALEL — ikisi de aynı uid listesini kullanıyor.
  const [profiles, presences] = await Promise.all([getProfiles(uids), getPresences(uids)]);

  const conversations = visible.map((r) => {
    const p = profiles[r.otherUid];
    return {
      cid: r.cid,
      lastText: r.lastText,
      // 'photo' | 'video' | null — metinsiz medya mesajının etiketi arayüzde
      // kullanıcının diline çevriliyor, sunucu dil bilmiyor.
      lastKind: r.lastKind,
      lastAt: r.lastAt,
      unread: r.unread,
      // null = kullanıcı durumunu paylaşmıyor; arayüz nokta göstermiyor.
      presence: presences[r.otherUid] || null,
      other: {
        uid: r.otherUid,
        username: p?.username || null,
        displayName: p?.displayName || p?.username || null,
        avatar: p?.avatar ?? null,
      },
    };
  });

  return NextResponse.json({
    conversations,
    // Rozet için tek sayı — arayüz listeyi tekrar taramasın.
    unread: conversations.filter((c) => c.unread).length,
  });
}
