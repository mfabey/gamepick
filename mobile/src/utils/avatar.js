// ─────────────────────────────────────────────────────────────────────────────
// Avatar ön ayar eşlemesi — istemci tarafı.
//
// Sunucu yalnızca kimliği saklıyor (p1–p12), renk ve simge bilgisi BURADA.
// Böylece tema değişse bile sunucudaki veri geçerliliğini koruyor.
//
// HER ÖN AYAR İÇİN:
//   bg       → dairenin arkaplan rengi
//   icon     → Ionicons adı (expo/vector-icons'da mevcut, native bağımlılık yok)
//   iconColor→ simge rengi (genellikle bg'nin açık tonu)
//
// Kimlikler DEĞİŞMEZ — yeni eklenir, eski silinmez.
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = {
  p1:  { bg: '#7C3AED', icon: 'game-controller',    iconColor: '#DDD6FE' },  // mor, oyun kumandası
  p2:  { bg: '#2563EB', icon: 'rocket',              iconColor: '#BFDBFE' },  // mavi, roket
  p3:  { bg: '#D97706', icon: 'flash',               iconColor: '#FDE68A' },  // kehribar, şimşek
  p4:  { bg: '#DC2626', icon: 'flame',               iconColor: '#FECACA' },  // kırmızı, alev
  p5:  { bg: '#0891B2', icon: 'diamond',             iconColor: '#CFFAFE' },  // camgöbeği, elmas
  p6:  { bg: '#059669', icon: 'shield-checkmark',    iconColor: '#A7F3D0' },  // yeşil, kalkan
  p7:  { bg: '#B45309', icon: 'star',                iconColor: '#FEF3C7' },  // altın, yıldız
  p8:  { bg: '#4338CA', icon: 'moon',                iconColor: '#C7D2FE' },  // çivit, ay
  p9:  { bg: '#BE185D', icon: 'pulse',               iconColor: '#FBCFE8' },  // kızıl, nabız
  p10: { bg: '#0D9488', icon: 'trophy',              iconColor: '#CCFBF1' },  // teal, kupa
  p11: { bg: '#475569', icon: 'skull',               iconColor: '#CBD5E1' },  // arduvaz, kurukafa
  p12: { bg: '#1D4ED8', icon: 'planet',              iconColor: '#DBEAFE' },  // okyanus, gezegen
};

/** Tüm ön ayar kimlikleri — seçici ızgarası için. */
export const AVATAR_PRESET_IDS = Object.keys(PRESETS);

/**
 * Ön ayar kimliğinden görsel bilgi döner.
 * Geçersiz / null → null (çağıran baş harf fallback'i kullanır).
 */
export function getAvatarPreset(id) {
  if (!id) return null;
  return PRESETS[id] || null;
}
