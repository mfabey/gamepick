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
// NOT: Vercel'de her fonksiyon örneği kendi durumunu tutuyor, yani devre
// örnek başına. Yine de tek bir örneğe düşen ardışık isteklerde belirgin
// fark yaratıyor.
//
// ── 26 AĞUSTOS 2026: KESİCİNİN KENDİSİ ARIZAYA DÖNÜŞTÜ ──────────────────────
// Üretimde ölçüldü. RAWG'ın kendisi SAĞLAMDI (/api/debug-rawg: HTTP 200,
// 236 ms, count 559 436) ama /api/games sürekli yedek listeye düşüyordu:
//
//   3 / 6 / 12 PARALEL istek (her biri ayrı, soğuk örnek) → 0/3 · 0/6 · 0/12
//   TEK BAĞLANTIDA ardışık 4 istek (aynı sıcak örnek)     → 4/4 sınırlı
//   Ara vermeden ardışık 18 istek                          → 18/18 sınırlı
//
// Soğuk örnek sağlam, sıcak örnek bozuk. Sebebi: `downUntil` modül kapsamında
// ve bu dosyayı 4 rota paylaşıyor (games · trending · card-price · rawg-game).
// TEK bir yavaş çağrı, o örneğe düşen BÜTÜN rotaları 2 dakika boyunca yedeğe
// yolluyordu. Sürekli trafik altında kesici pratikte hiç kapanmıyordu.
//
// İki değişiklik, ikisi de bu ölçüme dayanıyor:
//   • Tek hata artık kesiciyi AÇMIYOR — art arda 3 hata gerekiyor. Tekil bir
//     zaman aşımı sık, kalıcı bir çöküş değil; birini diğeri sanmak pahalıydı.
//   • Soğuma 120 sn → 20 sn. 120 sn, RAWG'ın geri geldiği anla kesicinin
//     kapandığı an arasına iki dakikalık kör pencere koyuyordu.
//
// YARI AÇIK: soğuma bitince ilk istek deneme atışıdır — hâlâ bozuksa kesici
// üç hata beklemeden TEK hatayla yeniden açılır (bkz. ardArda başlangıcı).
// ─────────────────────────────────────────────────────────────────────────────

// 5 sn: Vercel sunucularından RAWG'a erişim zaman zaman yerel makineden
// daha yavaş olabiliyor. 2.5 sn bazı durumlarda yetmiyordu ve devre kesici
// gereksiz yere devreye girip tüm istekleri yedek listeye düşürüyordu.
const DEFAULT_TIMEOUT_MS = 5000;

// 20 sn: kesicinin amacı "askıda bekleyen isteği önlemek", "RAWG'ı cezalandırmak"
// değil. Bir örneğe saniyede birkaç istek düşüyor; 20 sn zincirleme zaman
// aşımını kesmeye yetiyor, RAWG toparlandığında geri dönüşü geciktirmiyor.
const COOLDOWN_MS = 20 * 1000;

// 3: tek bir zaman aşımı gürültüdür, üçü art arda sinyaldir.
const FAIL_THRESHOLD = 3;

let downUntil = 0;
let ardArda   = 0;   // art arda başarısız çağrı sayısı; her başarıda sıfırlanır

/** RAWG şu an devre dışı sayılıyor mu? (çağıran taraf isterse erken yedeğe gider) */
export function isRawgDown() {
  if (Date.now() < downUntil) return true;
  // Soğuma yeni bitti: kesici kapandı ama sayaç eşiğin bir altında bırakılıyor,
  // böylece deneme atışı da başarısız olursa hemen yeniden açılır.
  if (downUntil !== 0) {
    downUntil = 0;
    ardArda   = FAIL_THRESHOLD - 1;
  }
  return false;
}

/** Test/teşhis için: kesiciyi elle sıfırla. */
export function resetRawgCircuit() {
  downUntil = 0;
  ardArda   = 0;
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
    ardArda   = 0;
    return json;
  } catch (err) {
    // EŞİĞE VARMADAN AÇMA. Öncesi tek hatada 2 dakika kapatıyordu; ölçüm
    // bunun sıcak örnekleri kalıcı olarak yedeğe kilitlediğini gösterdi.
    ardArda += 1;
    if (ardArda >= FAIL_THRESHOLD) {
      downUntil = Date.now() + COOLDOWN_MS;
      ardArda   = 0;
    }
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
