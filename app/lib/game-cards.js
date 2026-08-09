// ─────────────────────────────────────────────────────────────────────────────
// Oyun kartı hesabı — SAF fonksiyon, ağ yok, Redis yok.
//
// Route'un içinde bırakılmadı çünkü test edilemiyordu: uç, kimlik + Redis +
// Steam anahtarı istiyor ve sıralama mantığındaki bir hata ancak üretimde
// görülürdü. Burada kütüphaneleri parametre olarak alıyor, böylece
// beraberlik / arkadaşsız / gizli profil durumları doğrudan sınanabiliyor.
// ─────────────────────────────────────────────────────────────────────────────

const TOP_N = 20;

// Bir saatin altı kart olmaz: "0,3 saat" övünülecek bir sayı değil ve listeyi
// kütüphanenin kuyruğuyla doldurur.
const MIN_HOURS = 1;

/**
 * @param {Array<{appid:number,name:string,hours:number,hours2w:number}>} mine
 * @param {Array<Array|null>} friendLibs  null = gizli profil, hesaba katılmaz
 * @returns {{summary: object, cards: Array}}
 */
export function buildCards(mine, friendLibs = [], opts = {}) {
  const topN = opts.topN ?? TOP_N;
  const minHours = opts.minHours ?? MIN_HOURS;

  if (!Array.isArray(mine)) return { summary: null, cards: [] };

  // appid → arkadaşların saatleri. Tek geçişte kuruluyor; oyun başına arkadaş
  // listesini yeniden taramak N×M olurdu.
  const friendHours = new Map();
  let friendsReadable = 0;

  for (const lib of friendLibs) {
    if (!Array.isArray(lib)) continue;           // gizli profil
    friendsReadable++;
    for (const g of lib) {
      if (!g?.hours) continue;                   // hiç oynamamış → sıralamaya girmez
      const arr = friendHours.get(g.appid);
      if (arr) arr.push(g.hours);
      else friendHours.set(g.appid, [g.hours]);
    }
  }

  const played = mine.filter((g) => (g.hours || 0) >= minHours);

  const cards = played
    .slice()
    .sort((a, b) => b.hours - a.hours)
    .slice(0, topN)
    .map((g) => {
      const others = friendHours.get(g.appid) || [];
      // Sıra = benden ÇOK oynayan arkadaş sayısı + 1. Beraberlikte aynı sıra
      // paylaşılıyor (rekabetçi sıralama) — iki kişi birden 2. olabilir.
      const ahead = others.filter((h) => h > g.hours).length;
      return {
        appid: g.appid,
        name: g.name,
        hours: g.hours,
        recentHours: g.hours2w || 0,
        owners: others.length + 1,               // oyunu oynamış arkadaşlar + ben
        rank: others.length ? ahead + 1 : null,  // arkadaşı yoksa sıra anlamsız
      };
    });

  return {
    summary: {
      games: mine.length,
      played: played.length,
      // "Alıp oynamadıkların" — kütüphane sahiplerinin en çok konuştuğu sayı
      untouched: mine.filter((g) => !g.hours).length,
      totalHours: Math.round(mine.reduce((s, g) => s + (g.hours || 0), 0)),
      topGame: cards[0]?.name || null,
      friends: friendsReadable,
    },
    cards,
  };
}
