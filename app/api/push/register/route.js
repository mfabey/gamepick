import { NextResponse } from 'next/server';
import { hasRedis, redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis.js';
import { rateLimit, tooManyRequests } from '../../../lib/rate-limit';
import { clientIp } from '../../../lib/client-ip';

const TOKENS_SET = 'push:tokens';
const tokenKey = (t) => `push:token:${t}`;

// ─────────────────────────────────────────────────────────────────────────────
// BU UÇ BİLEREK KİMLİKSİZ. Fiyat alarmı istek listesi giriş yapmadan da
// çalışıyor (mobile/src/context/WishlistContext.jsx yerel listeyle sürüyor),
// dolayısıyla `verifyMobileToken` zorunlu kılmak özelliği çıkıştaki
// kullanıcılar için tümden kırardı. Kimlik yerine iki sınır konuldu:
//
//  1. TOKEN BİÇİMİ. Eski desen `\[[^\]]+\]` idi — köşeli parantez içinde ne
//     olursa geçiyordu, yani `ExpoPushToken[x]` gibi sonsuz sayıda sahte kayıt
//     üretilebiliyordu. Karakter kümesi ve uzunluk sınırlandı.
//  2. IP BAŞINA HIZ SINIRI. Kimlik olmadığı için sayaç uid'e değil IP'ye
//     bağlanıyor (social/profile ile aynı kalıp). Öncesinde route düzeyinde
//     hiç sınır yoktu; geriye yalnız middleware'in 60/dk sınırı kalıyordu ve
//     bu, günde on binlerce çöp kaydı yazmaya yetiyordu.
//
// Kayıt hâlâ TOKEN'a anahtarlanıyor, uid'e değil: çıkışta uid yok. Token'ı
// ele geçiren biri o cihazın alarmlarını kapatabilir — kimliksiz çalışma
// şartının kabul edilen bedeli, etkisi "bildirim gelmez" ile sınırlı.
// ─────────────────────────────────────────────────────────────────────────────
function isValidExpoToken(t) {
  return typeof t === 'string' && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,64}\]$/.test(t);
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

  // ── HIZ SINIRI: EKSEN "YENİ KAYIT", "İSTEK" DEĞİL ───────────────────────
  // Büyümeyi üreten tek şey YENİ token yaratmak; var olan kaydın üzerine
  // yazmak anahtar sayısını artırmıyor. Sınırı isteğe koymak yanlış eksendi:
  // `syncBackend` istek listesindeki HER değişiklikte çağrılıyor
  // (WishlistContext.jsx:177), yani 20 oyun ekleyen kullanıcı 20 istek atıyor.
  // Üstelik mobilde IP kişi başına düşmüyor — operatörler CGNAT ardında
  // binlerce aboneyi tek public IP'de topluyor, IP başına dar bir sınır
  // meşru kullanıcıları toplu hâlde kilitlerdi.
  if (!existing) {
    const rl = await rateLimit(`rl:pushnew:${clientIp(request)}`, 60, 3600);
    if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });
  } else {
    // Var olan kaydın güncellenmesi serbest ama sonsuz değil: tek anahtara
    // sınırsız yazımı engelleyen bol bir tavan.
    const rl = await rateLimit(`rl:pushupd:${token}`, 240, 3600);
    if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });
  }

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

  // Silme de sınırlı: aksi hâlde geçerli biçimli token uzayı taranarak
  // toplu abonelik iptali denenebilirdi.
  const rl = await rateLimit(`rl:pushdel:${clientIp(request)}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const token = body?.token;
  if (isValidExpoToken(token)) {
    await redisCmd(['DEL', tokenKey(token)]);
    await redisCmd(['SREM', TOKENS_SET, token]);
  }
  return NextResponse.json({ ok: true });
}
