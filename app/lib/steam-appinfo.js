import { redisCmd, redisPipeline, parseJSON } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Steam mağaza kategorileri — "bu oyun birlikte oynanır mı?"
//
// NEDEN AYRI MODÜL, /api/steam-genres'e eklenmedi: o uç `{appid: [tür]}`
// döndürüyor ve mobil tarafta bir çağıranı var (mobile/src/api/library.js:17).
// Şekli değiştirmek onu bozardı. Ayrıca buranın çağıranı sunucuda çalışıyor —
// kendi API'mize HTTP isteği atmanın hiçbir faydası yok.
//
// NEDEN GEREKLİ (ölçüm): kütüphane kesişimi tek başına ayırt edici değil.
// 13 arkadaşlı gerçek hesapta ortalama 13,1 ortak oyun çıktı ama bunların
// 12,8'i "son 2 haftada ikisi de oynamamış" filtresinden geçiyordu — yani
// filtre %98 geçirgen, hiçbir şey elemiyor. Ortak oyunları saatle sıralayınca
// da her arkadaşta aynı oyun tepeye çıkıyordu (Counter-Strike 2). Listeyi
// "bu akşam ne oynasak" sorusunun cevabına çeviren tek ayraç, oyunun
// birlikte oynanabilir olup olmadığı.
//
// KATEGORİ KİMLİKLERİ kullanılıyor, açıklama metinleri değil: açıklamalar
// yerelleştiriliyor, kimlikler sabit.
// ─────────────────────────────────────────────────────────────────────────────

const STORE = 'https://store.steampowered.com/api/appdetails';

// Kategoriler pratikte hiç değişmez — uzun süre saklanabilir.
const TTL = 30 * 24 * 60 * 60;

const catKey = (appid) => `steam_cat:${appid}`;

/** Birlikte oynanabilirliği gösteren Steam kategori kimlikleri. */
const TOGETHER = new Set([
  1,   // Multi-player
  9,   // Co-op
  20,  // MMO
  27,  // Cross-Platform Multiplayer
  36,  // Online PvP
  37,  // Shared/Split Screen PvP
  38,  // Online Co-op
  39,  // LAN Co-op
  44,  // Remote Play Together
]);

/** Yalnızca işbirliği — PvP hariç. "Birlikte" ile "karşılıklı" farklı şeyler. */
const COOP = new Set([9, 38, 39, 44]);

async function fetchCategories(appid) {
  try {
    const res = await fetch(`${STORE}?appids=${appid}&filters=categories&l=english`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 604800 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[appid];
    // success:false → oyun kaldırılmış veya bölgesel kısıtlı. `null` dönüyoruz
    // ki "kategorisi yok" ile "öğrenilemedi" karışmasın; ikincisi tekrar
    // denenmeli, birincisi denenmemeli.
    if (!entry?.success) return null;
    return (entry.data?.categories || []).map((c) => Number(c.id)).filter(Number.isFinite);
  } catch {
    return null;
  }
}

/**
 * appid → { together: bool, coop: bool } eşlemesi.
 *
 * Önbellek okuması tek pipeline turu. Steam mağaza API'si Web API'sinden daha
 * sıkı sınırlıyor, o yüzden eşzamanlılık düşük tutuldu.
 *
 * ÇAĞIRAN DİKKAT: appid listesini ÖNCE tekilleştir. Kesişimlerde aynı oyun
 * (ör. Counter-Strike 2) her arkadaşta tekrar geçiyor; tekilleştirilmezse
 * aynı appid onlarca kez sorulur.
 */
export async function togetherFlags(appids, { concurrency = 4 } = {}) {
  const ids = [...new Set(appids.map(Number).filter(Number.isFinite))];
  const out = new Map();
  if (!ids.length) return out;

  const cached = await redisPipeline(ids.map((id) => ['GET', catKey(id)])) || [];
  const misses = [];

  ids.forEach((id, i) => {
    const row = parseJSON(cached[i]);
    if (Array.isArray(row)) out.set(id, flags(row));
    else misses.push(id);
  });

  for (let i = 0; i < misses.length; i += concurrency) {
    const batch = misses.slice(i, i + concurrency);
    await Promise.all(batch.map(async (id) => {
      const cats = await fetchCategories(id);
      if (cats === null) {
        // Öğrenilemedi — önbelleğe YAZMA, bir dahaki sefere tekrar denensin.
        out.set(id, { together: false, coop: false, unknown: true });
        return;
      }
      out.set(id, flags(cats));
      await redisCmd(['SET', catKey(id), JSON.stringify(cats), 'EX', String(TTL)]);
    }));
  }

  return out;
}

function flags(cats) {
  return {
    together: cats.some((c) => TOGETHER.has(c)),
    coop: cats.some((c) => COOP.has(c)),
  };
}
