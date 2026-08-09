// ─────────────────────────────────────────────────────────────────────────────
// Görsel/video moderasyonu — sağlayıcı kancası.
//
// NEDEN KAPALI HÂLDE BAŞARISIZ: kullanıcıların birbirine görsel gönderebildiği
// bir sistem işletmek, platforma yasadışı içeriği tespit ve bildirme
// yükümlülüğü getiriyor. Sağlayıcı bağlı değilken yüklemeye izin vermek, o
// yükümlülüğü hiçbir denetim olmadan üstlenmek demek. Bu yüzden varsayılan
// davranış REDDETMEK — "açık ve denetimsiz" değil.
//
// Sağlayıcı seçimi bilinçli olarak DIŞARIDA: Rekognition, Vision SafeSearch,
// Sightengine ve benzerleri aynı soruya cevap veriyor (bu görsel güvenli mi).
// Buradaki sözleşme tek bir fonksiyon; hangisinin bağlanacağı bir yapılandırma
// kararı, kod kararı değil.
//
// BAĞLAMAK İÇİN: `MODERATION_PROVIDER` ve sağlayıcının anahtarlarını tanımla,
// sonra `callProvider` içine o sağlayıcının çağrısını ekle.
// ─────────────────────────────────────────────────────────────────────────────

/** Sağlayıcı bağlı mı? Yükleme ucu buna bakıp kapalıysa reddediyor. */
export function isModerationConfigured() {
  return !!process.env.MODERATION_PROVIDER;
}

/**
 * @typedef {{ ok: boolean, reason?: string }} ModerationResult
 */

/**
 * İçeriği denetler.
 *
 * SAĞLAYICI HATASI = RED. Ağ hatasında "geçti" saymak, moderasyonu devre dışı
 * bırakmanın en kolay yolu olurdu: sağlayıcı düştüğünde her şey geçerdi.
 *
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {string} contentType
 * @returns {Promise<ModerationResult>}
 */
export async function moderateMedia(bytes, contentType) {
  if (!isModerationConfigured()) {
    return { ok: false, reason: 'MODERATION_DISABLED' };
  }
  try {
    return await callProvider(bytes, contentType);
  } catch {
    return { ok: false, reason: 'MODERATION_ERROR' };
  }
}

/**
 * Sağlayıcıya özgü çağrı. Şu an hiçbir sağlayıcı bağlı DEĞİL.
 *
 * Buraya bir sağlayıcı eklerken dikkat: dönüş `{ ok: false }` olduğunda içerik
 * REDDEDİLİYOR ve kullanıcıya yükleme başarısız diyoruz. Eşikleri sağlayıcının
 * kendi belgesine göre ayarla; varsayılanlar genelde çok gevşek.
 */
async function callProvider(bytes, contentType) {
  const provider = process.env.MODERATION_PROVIDER;
  throw new Error(`Moderasyon sağlayıcısı '${provider}' henüz bağlanmadı`);
}
