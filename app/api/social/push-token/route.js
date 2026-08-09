import { NextResponse } from 'next/server';
import { verifyMobileToken } from '../../../lib/mobile-auth';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { addToken, removeToken, isExpoToken } from '../../../lib/push';

// ─────────────────────────────────────────────────────────────────────────────
// Push token kaydı.
//
// NEDEN AYRI UÇ: token cihaza özgü ve zamanla DEĞİŞİYOR (uygulama yeniden
// kurulunca, bazen işletim sistemi güncellemesinde). Girişte bir kez yazılıp
// bırakılamaz; istemci her açılışta güncel tokenı buraya bildiriyor.
//
// DELETE ÇIKIŞTA ÇAĞRILMALI: token silinmezse, cihazı devreden biri önceki
// kullanıcının bildirimlerini almaya devam eder.
// ─────────────────────────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
}

async function readToken(request) {
  try {
    const b = await request.json();
    return String(b?.token || '');
  } catch {
    return '';
  }
}

export async function POST(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const rl = await rateLimit(`rl:pushtok:${user.uid}`, 30, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  const token = await readToken(request);
  if (!isExpoToken(token)) {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });
  }

  await addToken(user.uid, token);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const user = await verifyMobileToken(request);
  if (!user) return unauthorized();

  const token = await readToken(request);
  if (!token) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 400 });

  await removeToken(user.uid, token);
  return NextResponse.json({ ok: true });
}
