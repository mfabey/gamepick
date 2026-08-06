import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { mergeProfile, getProfile } from '../../../lib/social-store';
import { isValidAvatar } from '../../../lib/avatar-presets';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';

// ─────────────────────────────────────────────────────────────────────────────
// Profil avatarı — hazır ön ayar seçimi.
//
// AYRI BİR UÇ, username POST'una eklenmedi. İki sebep:
//  1. O uç geçerli bir kullanıcı adı zorunlu tutuyor; avatar değiştirmek için
//     kullanıcı adı göndermek anlamsız.
//  2. Oradaki sınır saatte 5 — kullanıcı adı değişimi pahalı bir işlem olduğu
//     için doğru, ama avatar denemek serbest olmalı.
//
// mergeProfile kullanılıyor, doğrudan yazma DEĞİL: profil kaydını başka uçlar
// da (login, apple-signin, steam/callback) güncelliyor ve üzerine yazmak
// kullanıcı adını silerdi. Bu hata daha önce yaşandı.
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  // Yazma ucu → sınır. Avatar denemek serbest olmalı ama sonsuz değil.
  const rl = await rateLimit(`rl:avatar:${user.uid}`, 30, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }

  // `null` geçerli: kullanıcı avatarını kaldırıp baş harfe dönebilir.
  const avatar = body.avatar === null ? null : String(body.avatar || '');

  if (!isValidAvatar(avatar)) {
    return NextResponse.json({ error: 'INVALID_AVATAR' }, { status: 400 });
  }

  // Kullanıcı adı olmadan profil kaydı olmayabilir; o durumda avatar
  // yazmanın anlamı yok (arkadaş listesinde görünecek bir kimlik yok).
  const existing = await getProfile(user.uid);
  if (!existing?.username) {
    return NextResponse.json({ error: 'NO_USERNAME' }, { status: 409 });
  }

  const profile = await mergeProfile(user.uid, { avatar, updatedAt: Date.now() });
  return NextResponse.json({ ok: true, avatar: profile?.avatar ?? null });
}
