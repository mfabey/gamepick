import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { validateFreeText } from '../../../lib/content-filter';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import {
  getListFeed, getListDetail, getUserLists,
  publishList, deleteList, toggleLike,
} from '../../../lib/lists-store';

// ─────────────────────────────────────────────────────────────────────────────
// Topluluk listeleri.
//
// GET  ?id=X                 → tek liste (oyunlarıyla)
// GET  ?owner=uid            → bir kullanıcının listeleri
// GET  ?sort=popular|new     → keşif akışı
// POST { action: publish|delete|like, ... }
//
// Başlık ve açıklama içerik süzgecinden geçer (Guideline 1.2).
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

// Topluluk listeleri HESAPSIZ okunabilir; POST (yayınla/sil/beğen) jetonlu.
// Gerekçe: liste okumak kayıt gerektirmeyen bir iş, kayıt arkasına almak
// Guideline 5.1.1(v) itirazına açık kapı.
//
// İzleyen uid'i null geçmek güvenli — veri katmanı bunu zaten karşılıyor:
// getListDetail'de `isOwner` false kalıyor ve `status !== 'public'` olan liste
// düşüyor (lists-store.js:325), beğeni kümesi boş dönüyor (a.g.e.:334),
// getHiddenUids(null) boş küme (social-store.js:389).
export async function GET(request) {
  const user = await verifyMobileToken(request);
  const viewerUid = user?.uid || null;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const owner = searchParams.get('owner');

  if (id) {
    const list = await getListDetail(id, viewerUid);
    if (!list) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    return NextResponse.json({ list });
  }

  if (owner) {
    return NextResponse.json({ items: await getUserLists(owner, viewerUid) });
  }

  const sort = searchParams.get('sort') === 'new' ? 'new' : 'popular';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const feed = await getListFeed(viewerUid, { sort, page });
  return NextResponse.json({ ...feed, sort, page });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const action = String(body.action || 'publish');

  // ── Beğeni ────────────────────────────────────────────────────────────────
  if (action === 'like') {
    const rl = await rateLimit(`rl:list_like:${user.uid}`, 120, 3600);
    if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

    const res = await toggleLike(user.uid, String(body.id || ''));
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
    return NextResponse.json(res);
  }

  // ── Silme ─────────────────────────────────────────────────────────────────
  if (action === 'delete') {
    const res = await deleteList(user.uid, String(body.id || ''));
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.error === 'NOT_OWNER' ? 403 : 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // ── Yayınlama / güncelleme ────────────────────────────────────────────────
  const rl = await rateLimit(`rl:list_publish:${user.uid}`, 30, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();

  const tv = validateFreeText(title, { maxLength: 80 });
  if (!tv.ok) return NextResponse.json({ error: tv.error }, { status: 400 });

  if (description) {
    const dv = validateFreeText(description, { maxLength: 300 });
    if (!dv.ok) return NextResponse.json({ error: dv.error }, { status: 400 });
  }

  if (!Array.isArray(body.games) || body.games.length === 0) {
    return NextResponse.json({ error: 'LIST_EMPTY' }, { status: 400 });
  }

  const res = await publishList(user.uid, {
    id: body.id || null,
    title,
    description,
    emoji: body.emoji,
    games: body.games,
  });

  if (!res.ok) {
    const status = res.error === 'NOT_OWNER' ? 403 : res.error === 'LIST_LIMIT' ? 400 : 500;
    return NextResponse.json({ error: res.error }, { status });
  }

  return NextResponse.json({ ok: true, list: res.list });
}
