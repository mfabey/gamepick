import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { redisCmd, redisPipeline } from '../../lib/redis';
import { rateLimit, tooManyRequests } from '../../lib/rate-limit';
import { clientIp } from '../../lib/client-ip';
import { getSteamDetailsCached } from '../../lib/steam-cache.js';
import { isSteamDataAdult } from '../../lib/adult-filter.js';

// ─────────────────────────────────────────────────────────────────────────────
// TREND ARAMALAR — mobil G-05 boş arama görünümü (27 Eyl).
//
// GET  → { trends: [{ appid, name, image, count }] }   son 7 gün, en çok 8
// POST { appid }                                        aramadan oyun açıldı
//
// KULLANICI METNİ SAKLANMIYOR. Ham sorgu kişisel veri ya da hakaret
// taşıyabilir ve bu liste herkese gösteriliyor. Kaydedilen tek şey aramadan
// AÇILAN oyunun Steam appid'i; görünen ad sunucuda Steam'den çözülüyor
// (istemcinin gönderdiği ad yok sayılıyor). Yetişkin içerik elenir.
//
// Şişirmeye karşı: aynı IP aynı oyunu günde bir kez sayar (SET NX), IP
// başına saatte 60 kayıt, listede görünmek için en az 3 ayrı sayım.
//
// PUBLIC: hesapsız kullanıcı da arıyor; kişisel veri tutulmuyor (IP yalnız
// 1 günlük tekilleştirme anahtarında, özetlenmiş).
// ─────────────────────────────────────────────────────────────────────────────

const GUN = 24 * 3600 * 1000;
const gunKey = (ms) => `search_trend:${new Date(ms).toISOString().slice(0, 10)}`;
const ADLAR = 'search_trend_names';
const ESIK = 3;

export async function GET() {
  const now = Date.now();
  const keys = Array.from({ length: 7 }, (_, i) => gunKey(now - i * GUN));
  const rows = await redisPipeline(keys.map((k) => ['ZREVRANGE', k, '0', '49', 'WITHSCORES'])) || [];
  const toplam = {};
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    for (let i = 0; i < r.length; i += 2) toplam[r[i]] = (toplam[r[i]] || 0) + (Number(r[i + 1]) || 0);
  }
  const ust = Object.entries(toplam).filter(([, n]) => n >= ESIK).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!ust.length) return NextResponse.json({ trends: [] }, { headers: { 'Cache-Control': 's-maxage=600' } });
  const adlar = await redisCmd(['HMGET', ADLAR, ...ust.map(([a]) => a)]);
  const trends = ust.map(([appid, count], i) => {
    const kayit = (() => { try { return JSON.parse(adlar?.[i] || 'null'); } catch { return null; } })();
    return kayit?.name ? { appid, name: kayit.name, image: kayit.image || null, count } : null;
  }).filter(Boolean);
  return NextResponse.json({ trends }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=3600' } });
}

export async function POST(request) {
  const ip = clientIp(request);
  const rl = await rateLimit(`rl:strend:${ip}`, 60, 3600);
  if (!rl.ok) return NextResponse.json(tooManyRequests(), { status: 429 });

  let body = {};
  try { body = await request.json(); } catch { /* boş gövde */ }
  const appid = String(body.appid ?? '').trim();
  if (!/^\d{1,10}$/.test(appid)) return NextResponse.json({ ok: false }, { status: 400 });

  const now = Date.now();
  // IP ham saklanmıyor: günlük tuzlu SHA-256 özetinin ilk 16 hanesi
  // (tuz sunucu sırrı + gün; ertesi gün aynı IP başka özet verir).
  const ozet = createHash('sha256').update(`${process.env.NEXTAUTH_SECRET || 'gr'}:${gunKey(now)}:${ip}`).digest('hex').slice(0, 16);
  const ilk = await redisCmd(['SET', `strend_seen:${gunKey(now).slice(13)}:${ozet}:${appid}`, '1', 'NX', 'EX', '90000']);
  if (ilk !== 'OK') return NextResponse.json({ ok: true, counted: false });

  const var_ = await redisCmd(['HEXISTS', ADLAR, appid]);
  if (Number(var_) !== 1) {
    const d = await getSteamDetailsCached(appid).catch(() => null);
    if (!d?.name || isSteamDataAdult(d)) return NextResponse.json({ ok: true, counted: false });
    await redisCmd(['HSET', ADLAR, appid, JSON.stringify({ name: String(d.name).slice(0, 120), image: d.header_image || null })]);
  }
  await redisPipeline([
    ['ZINCRBY', gunKey(now), '1', appid],
    ['EXPIRE', gunKey(now), String(8 * 24 * 3600)],
  ]);
  return NextResponse.json({ ok: true, counted: true });
}
