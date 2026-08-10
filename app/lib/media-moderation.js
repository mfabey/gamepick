// ─────────────────────────────────────────────────────────────────────────────
// Görsel moderasyonu — Google Cloud Vision SafeSearch.
//
// NEDEN KAPALI HÂLDE BAŞARISIZ: kullanıcıların birbirine görsel gönderebildiği
// bir sistem işletmek, platforma yasadışı içeriği tespit ve bildirme
// yükümlülüğü getiriyor. Sağlayıcı bağlı değilken yüklemeye izin vermek, o
// yükümlülüğü hiçbir denetim olmadan üstlenmek demek.
//
// NEDEN VISION: Firebase projesi zaten bir Google Cloud projesi. Yeni hesap,
// yeni fatura kurulumu gerekmiyor; mevcut projede API açılıp anahtar alınıyor.
//
// ── BİLİNEN SINIRLAR — ikisi de bilinçli kabul edildi ──
//
// 1. SafeSearch CSAM TESPİTİ DEĞİLDİR. Genel yetişkin/şiddet içeriğini
//    yakalıyor ve sorunlu yüklemelerin büyük çoğunluğunu durduruyor, ama yasal
//    bildirim yükümlülüğünün karşılığı olan hash eşleştirme (PhotoDNA, Thorn
//    Safer, Cloudflare CSAM Tool) ayrı bir sistem. Hacim arttığında eklenmeli.
//
// 2. VİDEO DENETLENMİYOR. Vision görselle çalışıyor; video için kare çıkarmak
//    gerekiyor (sunucuda ffmpeg yok, cihazda native modül gerekiyor). Video
//    bu yüzden AÇIKÇA REDDEDİLİYOR — denetlenmemiş içeriği geçirmektense
//    özelliği kapalı tutmak doğru.
// ─────────────────────────────────────────────────────────────────────────────

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';
const TIMEOUT_MS = 8000;

// SafeSearch beş kademe döndürüyor: VERY_UNLIKELY … VERY_LIKELY.
// LIKELY ve üstü reddediliyor. POSSIBLE geçiyor: o kademede yanlış pozitif
// oranı yüksek ve masum fotoğrafları engellemek kullanıcıyı kaçırır.
const RED = new Set(['LIKELY', 'VERY_LIKELY']);

// Hangi kategoriler engelleniyor. `medical` ve `spoof` DIŞARIDA: biri tıbbi
// görsel (oyun bağlamında zararsız), diğeri "değiştirilmiş görsel" demek ve
// meme kültürünün tamamını engellerdi.
const CATEGORIES = ['adult', 'violence', 'racy'];

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isModerationConfigured() {
  return process.env.MODERATION_PROVIDER === 'google-vision'
    && !!process.env.GOOGLE_VISION_API_KEY;
}

/**
 * İçeriği denetler.
 *
 * SAĞLAYICI HATASI = RED. Ağ hatasında "geçti" saymak, moderasyonu devre dışı
 * bırakmanın en kolay yolu olurdu: sağlayıcı düştüğünde her şey geçerdi.
 *
 * @param {ArrayBuffer} bytes
 * @param {string} contentType
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function moderateMedia(bytes, contentType) {
  if (!isModerationConfigured()) {
    return { ok: false, reason: 'MODERATION_DISABLED' };
  }

  // Video denetlenemiyor (bkz. dosya başı). Sessizce geçirmek yerine ayrı bir
  // sebeple reddediliyor ki arayüz doğru mesajı gösterebilsin.
  if (!IMAGE_TYPES.has(contentType)) {
    return { ok: false, reason: 'VIDEO_NOT_SUPPORTED' };
  }

  try {
    return await checkWithVision(bytes);
  } catch {
    return { ok: false, reason: 'MODERATION_ERROR' };
  }
}

async function checkWithVision(bytes) {
  const key = process.env.GOOGLE_VISION_API_KEY;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${VISION_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        requests: [{
          image: { content: toBase64(bytes) },
          features: [{ type: 'SAFE_SEARCH_DETECTION' }],
        }],
      }),
    });

    if (!res.ok) return { ok: false, reason: 'MODERATION_ERROR' };

    const json = await res.json();
    const ann = json?.responses?.[0]?.safeSearchAnnotation;

    // Yanıt beklenen şekilde değilse GEÇİRME. Boş yanıtı "temiz" saymak,
    // API sözleşmesi değiştiğinde moderasyonu sessizce kapatırdı.
    if (!ann) return { ok: false, reason: 'MODERATION_ERROR' };

    const hit = CATEGORIES.find((c) => RED.has(ann[c]));
    return hit ? { ok: false, reason: `BLOCKED_${hit.toUpperCase()}` } : { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

/** Vision gövdeyi base64 istiyor. */
function toBase64(bytes) {
  const b = new Uint8Array(bytes);
  let s = '';
  // Parça parça: tek seferde spread etmek büyük dosyalarda yığını taşırıyor.
  const CHUNK = 8192;
  for (let i = 0; i < b.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, b.subarray(i, i + CHUNK));
  }
  return btoa(s);
}
