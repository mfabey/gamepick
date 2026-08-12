// ─────────────────────────────────────────────────────────────────────────────
// Tepki emojileri.
//
// KAYNAK DOĞRU: `app/lib/chat-store.js` → `REACTIONS`. Sunucu istemciden gelen
// emojiyi o listeye karşı doğruluyor; buradaki kopya yalnızca seçiciyi
// çizmek için.
//
// İKİ LİSTE AYRIŞIRSA kullanıcı seçicide gördüğü bir emojiye basıp
// `INVALID_REACTION` yiyor. Bu sessiz bir hata olurdu, o yüzden testte iki
// dosya doğrudan karşılaştırılıyor (bkz. tepki-test).
//
// SIRA DA ÖNEMLİ: seçicide soldan sağa bu sırayla çiziliyor ve ilk eleman
// çift dokunuşun karşılığı.
// ─────────────────────────────────────────────────────────────────────────────
export const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

/** Çift dokunuşun ve emojisiz isteğin karşılığı. */
export const DEFAULT_REACTION = REACTIONS[0];

/**
 * Tepki nesnesini çizilebilir listeye çevirir.
 *
 * SIRA REACTIONS'A GÖRE, nesne anahtar sırasına göre değil: JSON anahtar
 * sırası yazma sırasına bağlı ve aynı mesajın rozetleri iki cihazda farklı
 * sıralanırdı.
 */
export function reactionList(reactions, myUid) {
  if (!reactions || typeof reactions !== 'object') return [];
  const out = [];
  for (const emoji of REACTIONS) {
    const list = reactions[emoji];
    if (Array.isArray(list) && list.length) {
      out.push({ emoji, count: list.length, mine: list.includes(myUid) });
    }
  }
  return out;
}
