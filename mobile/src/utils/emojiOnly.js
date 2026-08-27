// ─────────────────────────────────────────────────────────────────────────────
// SALT EMOJİ MESAJI — baloncuksuz ve büyük.
//
// iOS, içinde yalnız emoji olan kısa bir mesajı baloncuğa koymuyor ve
// büyütüyor. Sebebi işlevsel: tek bir "👍" bir cümle değil, bir JESTTİR —
// baloncuk ona bir ifade ağırlığı yüklüyor.
//
// ── NEDEN AYRI DOSYA ──
// Saf fonksiyon, yani sınanabilir. "Hangi metin emoji sayılıyor" sorusu
// gözle bakarak cevaplanmıyor: ten rengi değiştiricileri, ZWJ ile
// birleşen aileler, varyasyon seçicileri ve bayraklar hep ayrı davranıyor.
//
// ── REGEX TRY/CATCH İÇİNDE ──
// `\p{...}` Unicode özellik kaçışları her JS motorunda yok. Hermes'te
// destekleniyor ama sürüme bağlı; desteklenmiyorsa `new RegExp` MODÜL
// YÜKLENİRKEN atar ve onu içe aktaran ekran hiç açılmaz. Kurulum
// başarısız olursa özellik sessizce kapanıyor: mesaj normal baloncukta
// çiziliyor, hiçbir şey kaybolmuyor.
// ─────────────────────────────────────────────────────────────────────────────

/** En fazla bu kadar emoji büyük çiziliyor; üstü normal metin. */
export const EMOJI_SINIR = 3;

/** Büyük emojinin punto ölçüsü. */
export const EMOJI_BOY = 48;

/** Motor `\p{...}` destekliyor mu? Yalnız tanı amaçlı dışarı açık. */
export const EMOJI_DESTEGI = (() => {
  try {
    // eslint-disable-next-line no-new
    new RegExp('\\p{Extended_Pictographic}', 'u');
    return true;
  } catch {
    return false;
  }
})();

const KALIP = EMOJI_DESTEGI
  ? {
      // Emoji + emoji bileşeni (ten rengi, ZWJ, varyasyon seçici) + boşluk
      tumu: new RegExp('^(?:\\p{Extended_Pictographic}|\\p{Emoji_Component}|\\s)+$', 'u'),
      tek: new RegExp('\\p{Extended_Pictographic}', 'gu'),
      // BAYRAKLAR AYRI SAYILIYOR. 🇹🇷 iki `Regional_Indicator`dan oluşuyor
      // ve HİÇBİRİ `Extended_Pictographic` DEĞİL — ölçüldü: bayrak
      // gönderildiğinde sayım sıfır çıkıyor ve mesaj baloncukta kalıyordu.
      bayrak: new RegExp('\\p{Regional_Indicator}', 'gu'),
    }
  : null;

/**
 * Metin yalnız emojiden mi oluşuyor ve sayısı sınırın altında mı?
 *
 * SAYIM `Extended_Pictographic` ÜZERİNDEN: ZWJ ile birleşen bir aile
 * (👨‍👩‍👧) dört ayrı piktograf sayılıyor, yani sınırı aşıyor ve normal
 * baloncuğa düşüyor. Doğru davranış bu değil ama YANLIŞ TARAFA düşüyor:
 * fazladan büyütmek yerine büyütmüyor.
 */
export function saltEmojiMi(metin) {
  if (!KALIP || !metin) return false;
  const t = String(metin).trim();
  if (!t || !KALIP.tumu.test(t)) return false;
  // Bayrak İKİ bölgesel göstergeden oluşuyor, yani bir emoji.
  const n = (t.match(KALIP.tek) || []).length
    + Math.floor((t.match(KALIP.bayrak) || []).length / 2);
  return n > 0 && n <= EMOJI_SINIR;
}
