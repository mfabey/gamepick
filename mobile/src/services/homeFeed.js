// ─────────────────────────────────────────────────────────────────────────────
// Anasayfa akışının harmanlanması — oyun gönderileri + topluluk incelemeleri.
//
// NEDEN SERPİŞTİRME, ayrı bir bölüm değil: incelemeler kendi şeridine
// konsaydı akışın geri kalanı yine %100 katalog olurdu. Aradaki fark,
// kaydırırken insanlara rastlamakla insanları ayrı bir rafta görmek
// arasındaki fark.
//
// TEKRAR YOK. Elde üç inceleme varsa üç kez çıkıyorlar ve serpiştirme
// duruyor; döngüye alınıp tekrar gösterilseydi akış bozuk görünürdü —
// "az içerik" ile "aynı içeriği tekrar tekrar gösteren uygulama" arasında
// ikincisi çok daha kötü.
//
// SIRA KORUNUYOR: oyunların sırası öneri motorunun sıralaması, incelemelerin
// sırası en yeniden eskiye. İkisi de bozulmuyor, yalnızca iç içe geçiyorlar.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * İnceleme ve tartışma gönderilerini TEK bir sosyal akışta birleştirir.
 *
 * Neden birleşik: ikisi de "birinin yazdığı şey" ve akışa ayrı ayrı
 * serpiştirilseydi iki ayrı aralık hesabı çakışırdı — bir oyundan sonra hem
 * inceleme hem gönderi düşebilir, başka yerde ikisi de düşmezdi.
 *
 * Sıra EN YENİDEN eskiye: iki kaynak da kendi içinde sıralı geliyor ama
 * aralarında ortak bir ölçü yok; zaman damgası o ölçü.
 */
export function mergeSocial(reviews, posts) {
  const r = (Array.isArray(reviews) ? reviews : []).map((x) => ({
    kind: 'review', at: Number(x.at ?? x.createdAt) || 0, data: x,
  }));
  const p = (Array.isArray(posts) ? posts : []).map((x) => ({
    kind: 'post', at: Number(x.at) || 0, data: x,
  }));
  return [...r, ...p].sort((a, b) => b.at - a.at);
}

/**
 * Oyun gönderilerinin arasına sosyal kartlar yerleştirir.
 *
 * @param {Array}  games    öneri motorunun sıraladığı oyunlar
 * @param {Array}  reviews  `mergeSocial` çıktısı (inceleme + gönderi)
 * @param {object} [opts]
 * @param {number} [opts.first=2]  ilk inceleme kaçıncı oyundan SONRA
 * @param {number} [opts.every=3]  sonrakiler kaç oyunda bir
 * @returns {Array} `{ kind, key, game|review }` — FlashList'in beklediği düz liste
 */
export function interleaveReviews(games, reviews, { first = 2, every = 3 } = {}) {
  const g = Array.isArray(games) ? games : [];
  const r = Array.isArray(reviews) ? reviews : [];
  if (!g.length) return [];

  const out = [];
  let ri = 0;

  for (let i = 0; i < g.length; i++) {
    const game = g[i];
    if (!game || game.id == null) continue;
    out.push({ kind: 'game', key: 'g:' + game.id, game });

    // Kaçıncı oyunu yeni yazdık? (1 tabanlı)
    const n = i + 1;
    if (ri < r.length && n >= first && (n - first) % every === 0) {
      const item = r[ri++];
      // mergeSocial çıktısı `{ kind, data }` taşıyor; eski çağrı biçimiyle
      // (düz inceleme dizisi) gelen veriyi de kabul ediyoruz.
      if (item?.kind === 'post') {
        out.push({ kind: 'post', key: 'p:' + item.data.id, post: item.data });
      } else {
        const rev = item?.data || item;
        out.push({ kind: 'review', key: 'r:' + rev.appid + ':' + rev.uid, review: rev });
      }
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÖNE ÇIKANLAR — trend / yeni çıkan / indirimdeki oyunlar.
//
// Eskiden bunlar anasayfanın başlığında üç ayrı yatay şeritti. Üçü de aynı
// biçimdeydi (aynı başlık, aynı "Tümü ›", aynı kart boyu), yani göz aralarında
// sıra kuramıyordu; üstelik hepsi `ListHeaderComponent` içinde olduğu için
// asıl gövdeyi — oyun gönderisi + inceleme akışını — kıvrımın çok altına
// itiyorlardı.
//
// Şeritler yerine akışa serpiştiriliyorlar. Ama serpiştirmenin şartı ETİKET:
// bir oyun akışta neden karşına çıktığını söylemezse akış anlamsız bir yığına
// döner. Her öne çıkan öğe "trend" | "new" | "sale" etiketiyle geliyor.
//
// TÜRLER SIRAYLA: trend, yeni, indirim, trend, yeni… Üç listeyi arka arkaya
// dökmek yerine sırayla almak, akışın herhangi bir yerinde üç türün de
// temsil edilmesini sağlıyor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Etiketli öne çıkan oyunları tek listede sıraya dizer (round-robin).
 *
 * @param {object} lists  `{ trend: [], new: [], sale: [] }`
 * @returns {Array} `{ game, tag }`
 */
export function orderHighlights(lists = {}) {
  const order = ['trend', 'new', 'sale'];
  const src = order.map((tag) => ({ tag, items: Array.isArray(lists[tag]) ? lists[tag] : [] }));
  const out = [];
  const max = Math.max(0, ...src.map((s) => s.items.length));
  for (let i = 0; i < max; i++) {
    for (const s of src) {
      const game = s.items[i];
      if (game && game.id != null) out.push({ game, tag: s.tag });
    }
  }
  return out;
}

/**
 * Akışa öne çıkan oyunları serpiştirir. `interleaveReviews`'un kardeşi;
 * aynı desen, ama araya giren şey bir kart değil ETİKETLİ bir oyun gönderisi.
 *
 * İnceleme serpiştirmesinden SONRA çağrılmalı: incelemelerin aralığı oyun
 * sayısına göre hesaplanıyor, araya oyun sokmak o aralığı kaydırırdı.
 *
 * @param {Array}  items       `interleaveReviews` çıktısı
 * @param {Array}  highlights  `orderHighlights` çıktısı
 * @param {object} [opts]
 * @param {number} [opts.first=1]  ilk öne çıkan kaçıncı GÖNDERİDEN sonra
 * @param {number} [opts.every=4]  sonrakiler kaç gönderide bir
 */
export function mergeHighlights(items, highlights, { first = 1, every = 4 } = {}) {
  const list = Array.isArray(items) ? items : [];
  const hl = Array.isArray(highlights) ? highlights : [];
  if (!list.length || !hl.length) return list;

  const out = [];
  let hi = 0;
  let posts = 0;   // yalnız oyun gönderileri sayılıyor

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    out.push(item);
    if (item.kind !== 'game') continue;
    posts++;

    const due = hi < hl.length && posts >= first && (posts - first) % every === 0;
    if (!due) continue;

    // SOSYAL KARTIN ÖNÜNE GİRME. Bir inceleme ya da gönderi, kendinden önceki
    // oyun gönderisine bağlı okunuyor; araya öne çıkan bir oyun sokmak o bağı
    // koparıyor. Ölçüldü: incelemeler 2,5,8. oyunları takip ederken araya
    // girince 2,102,8 oluyordu.
    //
    // 'post' de kontrol ediliyor: akışa tartışma gönderileri katılınca yalnız
    // 'review' aramak onları korumasız bırakıyordu.
    if (list[i + 1]?.kind === 'review' || list[i + 1]?.kind === 'post') {
      out.push(list[i + 1]);
      i++;
    }

    const h = hl[hi++];
    out.push({ kind: 'game', key: 'h:' + h.tag + ':' + h.game.id, game: h.game, tag: h.tag });
  }

  return out;
}

/** Akışta gösterilen öne çıkan id'leri — taban akıştan elenmeleri için. */
export function highlightIds(highlights) {
  const set = new Set();
  for (const h of Array.isArray(highlights) ? highlights : []) {
    if (h?.game?.id != null) set.add(String(h.game.id));
  }
  return set;
}
