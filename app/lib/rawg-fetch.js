// ─────────────────────────────────────────────────────────────────────────────
// RAWG çağrıları için zaman aşımı + devre kesici.
//
// NEDEN: 3 Ağustos 2026'da RAWG çöktü ve Cloudflare üzerinden HTTP 522 vermeye
// başladı. Kritik nokta, 522'nin HEMEN dönmemesi — Cloudflare origin'i ~22 sn
// bekliyor. Zaman aşımı olmayan her çağrı o kadar askıda kalıyor.
//
// Mobil istemci 12 sn'de vazgeçtiği için (mobile/src/api/client.js) uygulamada
// hiçbir içerik görünmüyordu. Rotaların çoğunda Steam yedeği ZATEN VARDI ama
// hepsi bu beklemenin arkasındaydı, yani pratikte hiç devreye girmiyordu.
//
// DEVRE KESİCİ tek başına zaman aşımından daha önemli: bir istek birden fazla
// RAWG çağrısı yapabiliyor ve her biri ayrı ayrı zaman aşımını bekler.
// RAWG'ın çöktüğü bir kez anlaşıldıysa sonrakiler doğrudan yedeğe gidiyor.
//
// Süre dolunca bir istek yeniden deniyor → RAWG geri geldiğinde sistem
// kendiliğinden normale dönüyor, elle müdahale gerekmiyor.
//
// NOT: Vercel'de her fonksiyon örneği kendi durumunu tutuyor, yani devre
// örnek başına. Yine de tek bir örneğe düşen ardışık isteklerde belirgin
// fark yaratıyor.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 4000;
const COOLDOWN_MS = 60 * 1000;

let downUntil = 0;

/** RAWG şu an devre dışı sayılıyor mu? (çağıran taraf isterse erken yedeğe gider) */
export function isRawgDown() {
  return Date.now() < downUntil;
}

/**
 * RAWG'dan JSON çeker. Başarısızlıkta HATA FIRLATIR — mevcut catch/yedek
 * mantıkları bunun üzerine kurulu, sessizce boş dönmek onları atlatırdı.
 *
 * @throws {Error} zaman aşımı, ağ hatası, HTTP hatası veya açık devre
 */
export async function rawgJson(url, { timeout = DEFAULT_TIMEOUT_MS, revalidate = 300 } = {}) {
  if (isRawgDown()) throw new Error('RAWG devre dışı (devre kesici)');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { next: { revalidate }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`RAWG ${res.status}`);
    const json = await res.json();
    downUntil = 0;                       // sağlıklı yanıt → devreyi kapat
    return json;
  } catch (err) {
    downUntil = Date.now() + COOLDOWN_MS;
    if (err?.name === 'AbortError') throw new Error(`RAWG zaman aşımı (${timeout}ms)`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Hata fırlatmayan sürüm — çağıran tarafın yedeği yoksa. */
export async function rawgJsonSafe(url, fallback = null, opts) {
  try {
    return await rawgJson(url, opts);
  } catch {
    return fallback;
  }
}
