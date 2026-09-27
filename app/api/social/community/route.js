import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { clientIp as clientKey } from '../../../lib/client-ip';
import { getProfiles, getHiddenUids, filterVisibleByPrivacy } from '../../../lib/social-store';
import { shapePost } from '../../../lib/post-shape';
import {
  cleanAppid, getCommunity, listCommunityPosts, popularCommunityPosts,
  joinCommunity, leaveCommunity, markCommunitySeen, listMyCommunities, discoverCommunities, searchCommunities,
} from '../../../lib/community-store';

// ─────────────────────────────────────────────────────────────────────────────
// Oyun toplulukları (mobil G-11).
//
// GET ?appid=…            → { community, popular, posts }   (HESAPSIZ okunur)
// GET ?appid=…&offset=20  → { posts }                       (sayfalama)
// GET ?mine=1             → { communities }                 (kimlik şart)
// GET ?discover=1         → { communities }                 (hesapsız)
// GET ?q=elden            → { communities }  ad araması, birleşik arama (hesapsız)
// POST { action: 'join' | 'leave', appid, name?, image? }   (kimlik şart)
//
// OKUMA AÇIK, YAZMA KAPALI — tartışma akışıyla aynı kural ve aynı süzgeçler
// (engel + gizlilik). Gönderi yazmak zaten /api/social/posts'tan: oyun
// etiketli kök gönderi o topluluğa düşüyor.
// ─────────────────────────────────────────────────────────────────────────────

async function gorunur(posts, viewerUid) {
  const hidden = await getHiddenUids(viewerUid);
  const acik = await filterVisibleByPrivacy(posts.filter((p) => !hidden.has(p.uid)), viewerUid, (p) => p.uid);
  const profiles = await getProfiles(acik.map((p) => p.uid));
  return acik.map((p) => shapePost(p, profiles));
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  const viewerUid = user?.uid || null;

  const rl = await rateLimit(
    viewerUid ? `rl:community:${viewerUid}` : `rl:community:ip:${clientKey(request)}`,
    240, 3600
  );
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const { searchParams } = new URL(request.url);

  if (searchParams.get('mine') === '1') {
    if (!viewerUid) return NextResponse.json({ communities: [] });
    return NextResponse.json({ communities: await listMyCommunities(viewerUid) });
  }
  if (searchParams.has('q')) {
    return NextResponse.json({ communities: await searchCommunities(searchParams.get('q')) });
  }
  if (searchParams.get('discover') === '1') {
    return NextResponse.json({ communities: await discoverCommunities() });
  }

  const appid = cleanAppid(searchParams.get('appid'));
  if (!appid) return NextResponse.json({ error: 'INVALID_APPID' }, { status: 400 });
  const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

  if (offset > 0) {
    const posts = await listCommunityPosts(appid, { offset, viewerUid });
    return NextResponse.json({ posts: await gorunur(posts, viewerUid) });
  }

  const community = await getCommunity(appid, viewerUid);
  const [popular, posts] = await Promise.all([
    popularCommunityPosts(appid, viewerUid),
    listCommunityPosts(appid, { viewerUid }),
  ]);
  if (viewerUid && community.joined) markCommunitySeen(viewerUid, appid).catch(() => {});
  return NextResponse.json({
    community,
    popular: await gorunur(popular, viewerUid),
    posts: await gorunur(posts, viewerUid),
  });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const rl = await rateLimit(`rl:communityw:${user.uid}`, 120, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const appid = cleanAppid(body.appid);
  if (!appid) return NextResponse.json({ error: 'INVALID_APPID' }, { status: 400 });

  const action = String(body.action || '');
  if (action === 'join') {
    const r = await joinCommunity(user.uid, appid, { name: body.name, image: body.image });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  } else if (action === 'leave') {
    await leaveCommunity(user.uid, appid);
  } else {
    return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, community: await getCommunity(appid, user.uid) });
}
