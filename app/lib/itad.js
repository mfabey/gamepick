// ─────────────────────────────────────────────────────────────────────────────
// IsThereAnyDeal yardımcıları — fiyat geçmişi ucu (api/price-history) için.
//
// Kimlik çözümü api/prices ile AYNI sıra: önce Steam appid ile kesin
// eşleşme (lookup), yoksa başlık araması (DLC'ler hariç, normalize başlık
// eşitliği, yoksa ilk ana oyun). Fiyat karşılaştırması ile geçmiş aynı ITAD
// oyununu göstermeli; farklı edisyona düşerse grafik ile güncel fiyat
// birbirini tutmaz.
//
// Birim: api/prices `deal.price.amount`'u olduğu gibi kullanıyor (country=TR).
// Geçmiş de aynı alanı kullanıyor — grafiğin son noktası karşılaştırmadaki
// fiyatla aynı sayı olmalı.
// ─────────────────────────────────────────────────────────────────────────────

export const ITAD = 'https://api.isthereanydeal.com';
export const ITAD_KEY = process.env.ITAD_API_KEY;

// api/prices'taki resmî mağaza listesiyle aynı: anahtar satıcıları dahil değil.
export const RESMI_MAGAZA = {
  16: 'Epic Games', 61: 'Steam', 35: 'GOG', 37: 'Humble Bundle', 11: 'Xbox', 74: 'Xbox',
};

function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[:\-–]/g, ' ')
    .replace(/\b(game of the year|goty|definitive|complete|gold|platinum|deluxe|premium|standard|edition|bundle|pack|collection)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Steam appid ya da başlıktan ITAD oyun kimliği (uuid); bulunamazsa null. */
export async function itadGameId({ appid, title }) {
  if (!ITAD_KEY) return null;
  if (appid) {
    try {
      const r = await fetch(`${ITAD}/games/lookup/v1?key=${ITAD_KEY}&appid=${encodeURIComponent(appid)}`, { next: { revalidate: 86400 } });
      if (r.ok) {
        const d = await r.json();
        if (d?.found && d.game?.id) return d.game.id;
      }
    } catch { /* başlığa düş */ }
  }
  if (title) {
    try {
      const r = await fetch(`${ITAD}/games/search/v1?key=${ITAD_KEY}&title=${encodeURIComponent(title)}&limit=10`, { next: { revalidate: 3600 } });
      if (r.ok) {
        const list = (await r.json()) || [];
        const nt = normalizeTitle(title);
        const tam = list.find((g) => g.type !== 'dlc' && normalizeTitle(g.title) === nt);
        const yakin = list.find((g) => g.type === 'game' && normalizeTitle(g.title).includes(nt)) || list.find((g) => g.type === 'game');
        return (tam || yakin)?.id || null;
      }
    } catch { /* bulunamadı */ }
  }
  return null;
}

/**
 * Fiyat değişim günlüğü (ITAD /games/history/v2): her kayıt bir mağazada
 * fiyatın DEĞİŞTİĞİ an. Yalnız resmî mağazalar; zamana göre ARTAN sırada.
 * @returns {Promise<Array<{t:number, shop:number, price:number, regular:number, cut:number}>>}
 */
export async function itadHistory(id, sinceMs) {
  // MİLİSANİYESİZ, "+00:00" ile. toISOString() "…T16:47:12.345Z" veriyor;
  // ITAD belgesindeki biçim "2022-12-27T11:21:08+01:00" ve PHP'nin katı
  // RFC 3339 ayrıştırıcısı kesirli saniyeyi kabul etmiyor. Üretimde ilk
  // dağıtımda bu uç her oyunda boş döndü (27 Eyl) — en olası sebep bu.
  // Güne yuvarlı: URL gün boyu aynı kalsın, fetch önbelleği (6 sa) tutsun.
  const since = new Date(Math.floor(sinceMs / 864e5) * 864e5).toISOString().replace(/\.\d{3}Z$/, '+00:00');
  const r = await fetch(`${ITAD}/games/history/v2?key=${ITAD_KEY}&id=${encodeURIComponent(id)}&country=TR&since=${encodeURIComponent(since)}`,
    { next: { revalidate: 21600 } });
  if (!r.ok) {
    // Gövde teşhis için (debug=1): ITAD hata iletisi anahtarı içermiyor.
    let govde = '';
    try { govde = (await r.text()).slice(0, 160); } catch { /* gövdesiz */ }
    throw new Error(`ITAD history ${r.status} ${govde}`);
  }
  const rows = (await r.json()) || [];
  return rows.map((x) => ({
    t: Date.parse(x?.timestamp),
    shop: Number(x?.shop?.id),
    price: Number(x?.deal?.price?.amount),
    regular: Number(x?.deal?.regular?.amount ?? x?.deal?.price?.amount),
    cut: Number(x?.deal?.cut) || 0,
  }))
    .filter((x) => Number.isFinite(x.t) && Number.isFinite(x.price) && RESMI_MAGAZA[x.shop])
    .sort((a, b) => a.t - b.t);
}

/** Tüm zamanların en düşüğü (ITAD /games/historylow/v1), resmî mağazalar arasında. */
export async function itadHistoryLow(id) {
  const r = await fetch(`${ITAD}/games/historylow/v1?key=${ITAD_KEY}&country=TR`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify([id]),
  });
  if (!r.ok) return null;
  const low = ((await r.json()) || [])[0]?.low;
  if (!low || !RESMI_MAGAZA[Number(low.shop?.id)]) return null;
  return {
    price: Number(low.price?.amount),
    regular: Number(low.regular?.amount ?? low.price?.amount),
    cut: Number(low.cut) || 0,
    t: Date.parse(low.timestamp) || null,
    shop: RESMI_MAGAZA[Number(low.shop?.id)],
  };
}
