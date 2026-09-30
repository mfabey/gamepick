import { NextResponse } from 'next/server';
import { hasRedis, redisCmd, redisGetJSON, redisSetJSON } from '../../../lib/redis.js';
import { addNotif } from '../../../lib/notif-store';

// Bildirim metinleri kaydın diline göre (push/register `lang`, 27 Eyl).
// Eski kayıtlarda dil yok → Türkçe (önceki davranış).
const METIN = {
  tr: { sale: '💸 İndirim!', saleBody: (n, d) => `${n} şimdi -%${d} indirimde`, target: '🎯 Hedef fiyat', targetBody: (n, p) => `${n} hedefinin altına düştü: ₺${p}` },
  en: { sale: '💸 On sale!', saleBody: (n, d) => `${n} is now ${d}% off`, target: '🎯 Target price', targetBody: (n) => `${n} dropped below your target price` },
  de: { sale: '💸 Im Angebot!', saleBody: (n, d) => `${n} jetzt ${d} % reduziert`, target: '🎯 Zielpreis', targetBody: (n) => `${n} ist unter deinen Zielpreis gefallen` },
  es: { sale: '💸 ¡En oferta!', saleBody: (n, d) => `${n} ahora con ${d}% de descuento`, target: '🎯 Precio objetivo', targetBody: (n) => `${n} bajó de tu precio objetivo` },
  pt: { sale: '💸 Em promoção!', saleBody: (n, d) => `${n} agora com ${d}% de desconto`, target: '🎯 Preço-alvo', targetBody: (n) => `${n} caiu abaixo do seu preço-alvo` },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TOKENS_SET = 'push:tokens';
const tokenKey = (t) => `push:token:${t}`;

// Tek bir oyunun güncel fiyatını kendi card-price endpoint'inden al
async function fetchPrice(origin, g) {
  const p = new URLSearchParams();
  if (g.slug) p.set('slug', g.slug);
  if (g.name) p.set('name', g.name);
  p.set('hasSteam', g.hasSteam ? 'true' : 'false');
  try {
    const res = await fetch(`${origin}/api/card-price?${p.toString()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json().catch(() => null);  // { price, original, discount, isFree, ... }
  } catch {
    return null;
  }
}

// Expo Push servisine gönder; geçersiz (kayıtlı olmayan) token'ları döndür
async function sendExpoPush(messages) {
  const invalid = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) continue;
      const json = await res.json().catch(() => null);
      const tickets = json?.data || [];
      tickets.forEach((tk, idx) => {
        if (tk?.status === 'error' && tk?.details?.error === 'DeviceNotRegistered') {
          invalid.push(chunk[idx].to);
        }
      });
    } catch { /* sonraki chunk */ }
  }
  return invalid;
}

export async function GET(request) {
  // Güvenlik: CRON_SECRET ZORUNLU (Vercel Cron Authorization header'ı gönderir).
  //
  // KAPALI BAŞARISIZ OL: eskiden kontrol `if (secret)` ile sarılıydı, yani
  // değişken tanımlı değilse doğrulama tümden atlanıyordu ve uç herkese
  // açılıyordu. Bu uç `exp.host`'a TOPLU BİLDİRİM gönderiyor (satır 31) —
  // açık bırakıldığında herkes tüm kayıtlı cihazlara bildirim yağdırabilirdi.
  // Güvenlik kapısı, varlığı opsiyonel bir ortam değişkenine bağlanamaz.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET tanımlı değil' }, { status: 503 });
  }
  const auth = request.headers.get('authorization');
  const qs = request.nextUrl.searchParams.get('secret');
  if (auth !== `Bearer ${secret}` && qs !== secret) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  if (!hasRedis()) {
    return NextResponse.json({ error: 'Depolama yapılandırılmamış' }, { status: 503 });
  }

  const origin = request.nextUrl.origin;
  const tokens = (await redisCmd(['SMEMBERS', TOKENS_SET])) || [];
  if (tokens.length === 0) {
    return NextResponse.json({ ok: true, tokens: 0, sent: 0 });
  }

  // Tüm token kayıtlarını oku
  const records = [];
  for (const token of tokens) {
    const rec = await redisGetJSON(tokenKey(token));
    if (rec?.watch?.length) records.push(rec);
  }

  // İzlenen oyunları tekilleştir (tek fiyat isteği yeter)
  const uniqueGames = new Map();
  records.forEach(rec => rec.watch.forEach(w => {
    if (!uniqueGames.has(w.key)) uniqueGames.set(w.key, { slug: w.slug, name: w.name, hasSteam: w.hasSteam });
  }));

  // Fiyatları çek (aşırı yükü önlemek için sınırlı)
  const priceMap = {};
  const entries = [...uniqueGames.entries()].slice(0, 300);
  await Promise.all(entries.map(async ([key, g]) => {
    priceMap[key] = await fetchPrice(origin, g);
  }));

  const force = request.nextUrl.searchParams.get('force') === 'true';

  // Karşılaştır, bildirim kuyruğu oluştur, kayıtları güncelle
  const messages = [];
  for (const rec of records) {
    let changed = false;
    for (const w of rec.watch) {
      const price = priceMap[w.key];
      const discount = price?.discount || 0;
      const prev = w.lastDiscount;

      // force=true ise baseline'a bakılmaksızın test bildirimi fırlat
      if (force) {
        messages.push({
          to: rec.token,
          title: discount > 0 ? '💸 İndirim Alarmı!' : '🔔 Fiyat Takibi Aktif',
          body: discount > 0 ? `${w.name} şu anda -%${discount} indirimde!` : `${w.name} için fiyat takibi aktif. İndirim olduğunda bildirim alacaksınız.`,
          data: { slug: w.slug || '', name: w.name, type: 'price-alert' },
          sound: 'default',
          priority: 'high',
        });
        continue;
      }

      if (!price || price.price == null) continue;

      const M = METIN[rec.lang] || METIN.tr;
      const oyun = { name: w.name, appid: w.appid || null, slug: w.slug || null, image: w.image || null };

      // HEDEF FİYAT (G-08): fiyat hedefin altına İLK düştüğünde bir kez;
      // hedefin üstüne çıkınca bayrak sıfırlanıyor, sonraki düşüş yine
      // bildiriliyor. Baseline'dan ÖNCE: kullanıcı hedefi az önce koyduysa ve
      // fiyat zaten altındaysa ilk turda haber verilir. Hedef bildirimi gittiyse aynı turda indirim
      // bildirimi ayrıca gitmiyor (tek olay, iki push olmasın).
      let hedefGitti = false;
      if (w.target) {
        const altinda = price.price <= w.target;
        if (altinda && !w.targetHit) {
          messages.push({
            to: rec.token, title: M.target, body: M.targetBody(w.name, price.price),
            data: { slug: w.slug || '', name: w.name, appid: w.appid || '', type: 'price-target' },
            sound: 'default', priority: 'high',
          });
          if (rec.uid) await addNotif(rec.uid, { type: 'price_target', key: `price:${w.key}`, data: { game: oyun, price: price.price, discount, target: w.target } });
          w.targetHit = true; changed = true; hedefGitti = true;
        } else if (!altinda && w.targetHit) {
          w.targetHit = false; changed = true;
        }
      }

      // İlk kez görülüyorsa baseline ayarla, bildirim gönderme
      if (prev == null) {
        w.lastDiscount = discount;
        w.lastPrice = price.price;
        changed = true;
        continue;
      }

      // Yeni/daha derin indirim → bildirim
      if (!hedefGitti && discount > 0 && discount > prev) {
        messages.push({
          to: rec.token,
          title: M.sale,
          body: M.saleBody(w.name, discount),
          data: { slug: w.slug || '', name: w.name, appid: w.appid || '', type: 'price-alert' },
          sound: 'default',
          priority: 'high',
        });
        if (rec.uid) await addNotif(rec.uid, { type: 'price_drop', key: `price:${w.key}`, data: { game: oyun, price: price.price, discount, original: price.original ?? null } });
      }

      if (discount !== prev || price.price !== w.lastPrice) {
        w.lastDiscount = discount;
        w.lastPrice = price.price;
        changed = true;
      }
    }
    if (changed) await redisSetJSON(tokenKey(rec.token), rec);
  }

  // Gönder ve geçersiz token'ları temizle
  const invalid = messages.length ? await sendExpoPush(messages) : [];
  for (const t of invalid) {
    await redisCmd(['DEL', tokenKey(t)]);
    await redisCmd(['SREM', TOKENS_SET, t]);
  }

  return NextResponse.json({
    ok: true,
    tokens: tokens.length,
    games: uniqueGames.size,
    sent: messages.length,
    cleaned: invalid.length,
  });
}
