// ─────────────────────────────────────────────────────────────────────────────
// Upstash Redis REST istemcisi
//
// İki davranış biçimi sunar:
//   • Hoşgörülü (redisCmd, redisGetJSON, redisSetJSON) — hata olursa null döner.
//     Önbellek benzeri, kaybı tolere edilebilir veriler için. Mevcut çağıranlar
//     bu davranışa bağlı, sözleşmesi değiştirilmemeli.
//   • Katı (redisCmdStrict, redisSetJSONStrict) — hata olursa Error fırlatır.
//     Kullanıcının kaybetmemesi gereken veriler için (koleksiyonlar gibi);
//     sessiz başarısızlık orada veri kaybı demektir.
//
// Ayrıca redisPipeline ile birden fazla komut TEK HTTP turunda gönderilebilir.
// ─────────────────────────────────────────────────────────────────────────────
// Sondaki eğik çizgiyi kırp — aksi hâlde `${URL}/pipeline` çift eğik çizgi üretir
const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const TIMEOUT_MS = 8000;

export function hasRedis() {
  return !!(REDIS_URL && REDIS_TOKEN);
}

// Ortak HTTP katmanı. Asla fırlatmaz — { ok, data, error } döndürür.
// Üstteki sarmalayıcılar bu sonucu kendi sözleşmesine çevirir.
async function call(path, body) {
  if (!hasRedis()) {
    return { ok: false, data: null, error: 'Redis yapılandırılmamış' };
  }
  try {
    const res = await fetch(`${REDIS_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, data: null, error: `Redis HTTP ${res.status}` };
    }
    return { ok: true, data: await res.json(), error: null };
  } catch (err) {
    return { ok: false, data: null, error: err.message || 'Redis ağ hatası' };
  }
}

// ── Hoşgörülü API ───────────────────────────────────────────────────────────

// Tek komut çalıştır: redisCmd(['SET', key, value]) → result | null
export async function redisCmd(cmd) {
  const { ok, data, error } = await call('', cmd);
  if (!ok) {
    // Yapılandırılmamış olması beklenen bir durum (yerel geliştirme) — gürültü yapma
    if (error !== 'Redis yapılandırılmamış') console.warn('Redis command error:', error);
    return null;
  }
  return data.result ?? null;
}

export async function redisGetJSON(key) {
  const r = await redisCmd(['GET', key]);
  if (!r) return null;
  try { return JSON.parse(r); } catch { return null; }
}

export async function redisSetJSON(key, value) {
  return redisCmd(['SET', key, JSON.stringify(value)]);
}

// ── Katı API — yazma başarısızlığı sessizce yutulmamalı ─────────────────────

/**
 * Tek komut çalıştırır; başarısız olursa Error fırlatır.
 * @throws {Error} Redis erişilemezse veya komut hata dönerse
 */
export async function redisCmdStrict(cmd) {
  const { ok, data, error } = await call('', cmd);
  if (!ok) throw new Error(error);
  if (data?.error) throw new Error(`Redis: ${data.error}`);
  return data.result ?? null;
}

/**
 * JSON değeri yazar; başarısız olursa Error fırlatır.
 * @throws {Error}
 */
export async function redisSetJSONStrict(key, value) {
  return redisCmdStrict(['SET', key, JSON.stringify(value)]);
}

// ── Pipeline: N komut, tek HTTP turu ────────────────────────────────────────

/**
 * Birden fazla komutu tek istekte çalıştırır (N tur yerine 1 tur).
 *
 * DİKKAT — pipeline ATOMİK DEĞİLDİR. Komutlar sırayla çalışır ama araya başka
 * istemcilerin komutları girebilir (Upstash'in kendi dokümanında belirtiliyor).
 * Birbirine bağlı çok anahtarlı yazmalarda atomiklik gerekiyorsa /multi-exec
 * ucu kullanılmalı; buradaki kullanım amacı yalnızca gidiş-dönüşü azaltmaktır.
 *
 * @param {Array<Array<string>>} cmds  örn. [['GET','a'], ['SET','b','1']]
 * @param {{strict?: boolean}} [opts]  strict=true ise hata fırlatır
 * @returns {Promise<Array|null>} komut sırasıyla sonuç dizisi
 */
export async function redisPipeline(cmds, opts = {}) {
  const { strict = false } = opts;

  if (!Array.isArray(cmds) || cmds.length === 0) return [];

  const { ok, data, error } = await call('/pipeline', cmds);

  if (!ok) {
    if (strict) throw new Error(error);
    console.warn('Redis pipeline error:', error);
    return null;
  }

  // Upstash pipeline yanıtı: [{result: ...}, {error: ...}, ...]
  const rows = Array.isArray(data) ? data : [];

  if (strict) {
    const failed = rows.find((r) => r?.error);
    if (failed) throw new Error(`Redis: ${failed.error}`);
  }

  return rows.map((r) => r?.result ?? null);
}

/** Pipeline sonucundaki bir JSON değerini güvenle çözer. */
export function parseJSON(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
