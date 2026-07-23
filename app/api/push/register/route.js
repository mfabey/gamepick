import { NextResponse } from 'next/server';
import { hasRedis, redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis.js';

const TOKENS_SET = 'push:tokens';
const tokenKey = (t) => `push:token:${t}`;

function isValidExpoToken(t) {
  return typeof t === 'string' && /^Expo(nent)?PushToken\[[^\]]+\]$/.test(t);
}

// POST /api/push/register
// body: { token, platform?, watch: [{ id, appid?, slug?, name, hasSteam? }] }
export async function POST(request) {
  if (!hasRedis()) {
    return NextResponse.json({ error: 'Depolama yapılandırılmamış' }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 }); }

  const { token, platform = 'unknown', watch = [] } = body || {};
  if (!isValidExpoToken(token)) {
    return NextResponse.json({ error: 'Geçersiz push token' }, { status: 400 });
  }
  if (!Array.isArray(watch)) {
    return NextResponse.json({ error: 'watch bir dizi olmalı' }, { status: 400 });
  }

  // Mevcut kaydı oku (baseline lastDiscount değerlerini koru)
  const existing = await redisGetJSON(tokenKey(token));
  const prevByKey = {};
  (existing?.watch || []).forEach(w => { prevByKey[w.key] = w; });

  const cleanWatch = watch.slice(0, 200).map(g => {
    const key = String(g.appid || g.slug || g.name || '').toLowerCase();
    const prev = prevByKey[key];
    return {
      key,
      appid: g.appid || null,
      slug: g.slug || null,
      name: g.name || '',
      hasSteam: !!g.hasSteam,
      // Yeni eklenen oyunda baseline null → ilk kontrolde bildirim gönderilmez
      lastDiscount: prev ? prev.lastDiscount : null,
      lastPrice: prev ? prev.lastPrice : null,
    };
  }).filter(w => w.key);

  const record = {
    token,
    platform,
    watch: cleanWatch,
    updatedAt: Date.now(),
  };

  await redisSetJSON(tokenKey(token), record);
  await redisCmd(['SADD', TOKENS_SET, token]);

  return NextResponse.json({ ok: true, count: cleanWatch.length });
}

// DELETE — bildirimleri kapatınca token'ı kaldır
export async function DELETE(request) {
  if (!hasRedis()) return NextResponse.json({ ok: true });
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const token = body?.token;
  if (isValidExpoToken(token)) {
    await redisCmd(['DEL', tokenKey(token)]);
    await redisCmd(['SREM', TOKENS_SET, token]);
  }
  return NextResponse.json({ ok: true });
}
