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

/** Geçerli bir ön ayar kimliği mi? `null` da geçerli — "avatar yok" demek. */
export function isValidAvatar(v) {
  return v === null || (typeof v === 'string' && VALID.has(v));
}
