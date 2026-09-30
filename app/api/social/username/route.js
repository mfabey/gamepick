import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { validateUsername, validateFreeText } from '../../../lib/content-filter';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { getProfile, uidForUsername, claimUsername, MAX_BIO } from '../../../lib/social-store';

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı adı — sosyal özelliklerin kimlik temeli.
//
// GET  ?check=<ad>  → uygunluk kontrolü (yazarken canlı geri bildirim)
// GET               → kendi profilim
// POST { username, displayName?, bio? } → sahiplen / değiştir
//
// BİO BURADA, ayrı bir "profil düzenle" ucunda değil: claimUsername profil
// nesnesini sıfırdan kuruyor, yani ikinci bir uç aynı anahtara yazsaydı iki
// yazar arasında kayıp güncelleme yarışı doğardı. Tek yazar, tek yol.
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function GET(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const check = searchParams.get('check');

  if (check) {
    // Uygunluk kontrolü — yazarken çağrıldığı için sınır bol tutuldu
    const rl = await rateLimit(`rl:uname_check:${user.uid}`, 60, 60);
    if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

    const v = validateUsername(check);
    if (!v.ok) return NextResponse.json({ available: false, error: v.error });

    const owner = await uidForUsername(check);
    return NextResponse.json({
      available: !owner || owner === user.uid,
      error: owner && owner !== user.uid ? 'TAKEN' : null,
    });
  }

  const profile = await getProfile(user.uid);
  return NextResponse.json({ profile: profile || null });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // Kullanıcı adı değiştirme pahalı bir işlem (dizin yazımı) ve kimlik
  // taklidi için kötüye kullanılabilir → sıkı sınır
  const rl = await rateLimit(`rl:uname_set:${user.uid}`, 5, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  const username = String(body.username || '').trim();
  const v = validateUsername(username);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const displayName = body.displayName != null
    ? String(body.displayName).trim().slice(0, 40)
    : undefined;

  // ── Biyografi ──
  // Kullanıcı üretimi metin, yani içerik süzgecinden GEÇMEK ZORUNDA
  // (Guideline 1.2 — uygulama küfür/nefret içeriğini filtrelemekle yükümlü).
  // displayName gibi sessizce kırpılmıyor: bio profilin en görünür serbest
  // metni ve reddedilme sebebini kullanıcı görmeli.
  //
  // `undefined` bırakılırsa claimUsername mevcut bio'yu koruyor; boş dize
  // GÖNDERİLİRSE siliyor. Bu ayrım "alanı boşalt" eylemini mümkün kılıyor.
  let bio;
  if (body.bio != null) {
    const raw = String(body.bio).trim();
    if (raw) {
      const v = validateFreeText(raw, { maxLength: MAX_BIO });
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }
    bio = raw.slice(0, MAX_BIO);
  }

  const res = await claimUsername(user.uid, username, { displayName, bio });
  if (!res.ok) {
    const status = res.error === 'TAKEN' ? 409 : 500;
    return NextResponse.json({ error: res.error }, { status });
  }

  return NextResponse.json({ ok: true, profile: res.profile });
}
