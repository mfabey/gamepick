// ─────────────────────────────────────────────────────────────────────────────
// Hazır avatar ön ayarları.
//
// Sunucu GÖRSELDEN HABERSİZ: yalnızca kimliğin geçerli olup olmadığını
// biliyor. Renk ve simge eşlemesi istemcide (mobile/src/utils/avatar.js).
//
// Neden böyle: görselin nasıl çizileceği bir arayüz kararı ve zamanla
// değişebilir. Sunucuda renk kodu saklasaydık, tema değiştiğinde veritabanına
// yazılmış eski renkler yeni palete uymayan avatarlar üretirdi.
//
// Kimlikler DEĞİŞMEZ. Bir ön ayarı listeden çıkarmak, onu seçmiş kullanıcıların
// avatarını kırar — yerine yenisini eklemek gerekirse yeni kimlik verilmeli.
// ─────────────────────────────────────────────────────────────────────────────

export const AVATAR_PRESETS = Object.freeze([
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
  'p7', 'p8', 'p9', 'p10', 'p11', 'p12',
]);

const VALID = new Set(AVATAR_PRESETS);

// Yüklenen fotoğraflar Vercel Blob'da duruyor ve avatar alanı artık ön ayar
// kimliği YA DA bir fotoğraf adresi taşıyabiliyor.
//
// ADRES SERBEST BIRAKILMIYOR: yalnızca bizim blob konağımız kabul ediliyor.
// Aksi hâlde kullanıcı avatar alanına herhangi bir adres yazabilir ve profili
// gören herkesin uygulaması o adrese istek atardı — izleme pikseli, IP
// toplama ve harici içerik enjeksiyonu için açık kapı.
const BLOB_HOST = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/avatars\//i;

export function isAvatarPhoto(v) {
  return typeof v === 'string' && (BLOB_HOST.test(v) || v.startsWith('data:image/'));
}

/**
 * Geçerli bir avatar mı?
 * `null` (avatar yok) · ön ayar kimliği · kendi blob'umuzdaki fotoğraf adresi · data URI.
 */
export function isValidAvatar(v) {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  return VALID.has(v) || isAvatarPhoto(v);
}
