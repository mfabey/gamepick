// ─────────────────────────────────────────────────────────────────────────────
// Metin temizliği.
//
// Steam açıklamaları HAM HTML geliyor: `<p class="bb_paragraph">`, `<strong>`,
// `&quot;`, hatta `<video>` etiketleri. `app/game/[id].jsx` bunu kendi yerel
// `stripHtml`'iyle temizliyordu ama fonksiyon dışa açılmadığı için anasayfa
// akış kartı ham hâli basıyordu — kullanıcının okuduğu ilk metin
// `<p class="bb_paragraph" ><strong>&quot;En eğlenceli...` oluyordu.
//
// Buraya taşındı, kopyalanmadı: iki çağıran da aynı fonksiyonu kullanıyor.
// ─────────────────────────────────────────────────────────────────────────────

/** HTML etiketlerini ve yaygın kaçışları temizler, boşlukları toparlar. */
export function stripHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Temizlenmiş metnin ilk cümlelerini döner — akış kartı gibi dar yerler için.
 *
 * Sert karakter kesmesi yerine CÜMLE sınırı: "...oyun. Özellikl" diye biten
 * bir özet, kırpıldığını göstermekten başka bir şey yapmıyor.
 *
 * @param {string} s
 * @param {number} [max=180] yaklaşık üst sınır (karakter)
 */
export function summarize(s, max = 180) {
  const text = stripHtml(s);
  if (text.length <= max) return text;

  // max'a kadar olan kısımda son cümle sonunu ara
  const head = text.slice(0, max);
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (end > max * 0.4) return head.slice(0, end + 1);

  // Cümle sonu yoksa kelime sınırında kes
  const sp = head.lastIndexOf(' ');
  return (sp > 0 ? head.slice(0, sp) : head).trim() + '…';
}
