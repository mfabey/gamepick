import { redisCmd, redisPipeline, parseJSON } from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Steam sosyal grafiği — arkadaşlar ve kütüphane kesişimleri.
//
// ÖLÇÜM (2026-08-09, 13 arkadaşlı gerçek hesap):
//   kütüphanesi okunabilen : 12/13  (%92,3)
//   ortalama ortak oyun    : 13,1
//   kesişimi >0 olan       : 12/12
//   "ikisi de hiç oynamamış": 0,2      <-- bu yüzden o filtre YOK
//
// Ölçüm iki tasarım kararını doğrudan belirledi:
//
// 1. "İkinizin de hiç açmadığı ortak oyun" fikri ÖLÇÜMDE ÇÖKTÜ (0,2). Sebebi
//    yapısal: satın aldığını oynayan bir kullanıcıda "hiç oynanmamış" kümesi
//    zaten küçük, iki küçük kümenin kesişimi boş çıkıyor. Onun yerine
//    "son 2 haftada ikisi de oynamamış" kullanılıyor — o küme dolu.
//
// 2. ÖNBELLEK ANAHTARI `steamId`, kullanıcı değil. Ahmet'in kütüphanesi bir kez
//    çekilir; Ahmet'i arkadaş bilen HERKES aynı kaydı okur. Grafikte arkadaşlık
//    çift yönlü olduğu için bu, çağrı sayısını kullanıcı sayısıyla değil
//    benzersiz oyuncu sayısıyla orantılı hâle getiriyor. Kota günde 100.000 ve
//    kullanıcı başına ham maliyet (arkadaş sayısı + 3) — önbelleksiz ~10.000
//    kullanıcıda kota üçe katlanarak aşılırdı.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://api.steampowered.com';
const TIMEOUT_MS = 4000;

// Kütüphaneler nadiren değişir; 24 saat fazlasıyla yeterli.
const LIB_TTL = 24 * 60 * 60;

// Gizli profiller de önbelleklenir — AKSİ HÂLDE her istekte yeniden denenir ve
// hiç işe yaramayan çağrılar kotayı yer. Süre daha kısa: kullanıcı profilini
// herkese açık yaparsa makul sürede fark edelim.
const PRIVATE_TTL = 6 * 60 * 60;

const libKey = (steamId) => `steam_lib:${steamId}`;

function keyOrThrow() {
  const k = process.env.STEAM_API_KEY;
  if (!k) throw new Error('STEAM_API_KEY tanımlı değil');
  return k;
}

async function steamGet(path, params) {
  const qs = new URLSearchParams({ key: keyOrThrow(), ...params });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}?${qs}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`Steam ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Arkadaş steamId listesi.
 * Kullanıcının "arkadaş listesi" gizliliği kapalıysa Steam 401 döner → [].
 */
export async function friendIds(steamId) {
  try {
    const j = await steamGet('/ISteamUser/GetFriendList/v1/', {
      steamid: steamId, relationship: 'friend',
    });
    return (j?.friendslist?.friends || []).map((f) => f.steamid).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Görünen ad + avatar. 100'lük gruplar hâlinde, grup başına TEK çağrı.
 * @returns {Map<string, {name: string, avatar: string, public: boolean}>}
 */
export async function summaries(steamIds) {
  const out = new Map();
  for (let i = 0; i < steamIds.length; i += 100) {
    const ids = steamIds.slice(i, i + 100).join(',');
    try {
      const j = await steamGet('/ISteamUser/GetPlayerSummaries/v2/', { steamids: ids });
      for (const p of (j?.response?.players || [])) {
        out.set(p.steamid, {
          name: p.personaname || 'Steam oyuncusu',
          avatar: p.avatarfull || p.avatarmedium || p.avatar || null,
          public: p.communityvisibilitystate === 3,
        });
      }
    } catch { /* grup düşerse diğerleri devam etsin */ }
  }
  return out;
}

/**
 * Tek kütüphane — önbelleksiz, doğrudan Steam.
 *
 * DİKKAT: profil gizliyse Steam HATA DÖNMEZ, boş bir `response` döner. Bu
 * yüzden `games` dizisinin varlığına bakıyoruz, HTTP durumuna değil. Ölçüm
 * betiğinde de aynı tuzak vardı; durum koduna güvenilseydi gizli profiller
 * "başarılı ama 0 oyun" sayılır ve kesişim ölçümü baştan yanlış çıkardı.
 *
 * @returns {Array|null} null = gizli veya okunamadı
 */
async function fetchLibrary(steamId) {
  try {
    const j = await steamGet('/IPlayerService/GetOwnedGames/v1/', {
      steamid: steamId, include_appinfo: 1, include_played_free_games: 1,
    });
    const games = j?.response?.games;
    if (!Array.isArray(games)) return null;
    // Sadece ihtiyacımız olan alanlar — Redis'e 42 oyun × tam nesne yazmanın
    // anlamı yok, kayıt boyutu on katına çıkıyor.
    return games.map((g) => ({
      appid: g.appid,
      name: g.name || null,
      hours: Math.round(((g.playtime_forever || 0) / 60) * 10) / 10,
      hours2w: Math.round(((g.playtime_2weeks || 0) / 60) * 10) / 10,
    }));
  } catch {
    return null;
  }
}

/**
 * Çok sayıda kütüphaneyi önbellekten okur, eksikleri Steam'den çeker.
 *
 * Önbellek okuması TEK pipeline turu (N tur değil). Eksikler paralel çekilir
 * ama eşzamanlılık sınırlı — Steam'e aynı anda 100 istek atmak hız sınırına
 * takılmanın en hızlı yolu.
 *
 * @returns {Map<string, {games: Array|null, cached: boolean}>}
 */
export async function libraries(steamIds, { concurrency = 6 } = {}) {
  const out = new Map();
  if (!steamIds.length) return out;

  const cached = await redisPipeline(steamIds.map((id) => ['GET', libKey(id)])) || [];
  const misses = [];

  steamIds.forEach((id, i) => {
    const row = parseJSON(cached[i]);
    if (row && typeof row === 'object') {
      // { p: true } = gizli olduğu önbelleklenmiş
      out.set(id, { games: row.p ? null : (row.g || []), cached: true });
    } else {
      misses.push(id);
    }
  });

  for (let i = 0; i < misses.length; i += concurrency) {
    const batch = misses.slice(i, i + concurrency);
    await Promise.all(batch.map(async (id) => {
      const games = await fetchLibrary(id);
      out.set(id, { games, cached: false });
      const body = games ? { g: games } : { p: true };
      const ttl = games ? LIB_TTL : PRIVATE_TTL;
      await redisCmd(['SET', libKey(id), JSON.stringify(body), 'EX', String(ttl)]);
    }));
  }

  return out;
}

/**
 * İki kütüphanenin kesişimi.
 *
 * `fresh`: son 2 haftada İKİSİNİN DE oynamadığı ortak oyunlar. "Hiç
 * oynamamış" değil — ölçümde o küme ortalama 0,2 çıktı (bkz. dosya başı).
 * Bu küme ise dolu ve "bu akşam ne oynasak" sorusunun asıl cevabı.
 */
export function intersect(mine, theirs) {
  if (!Array.isArray(mine) || !Array.isArray(theirs)) return { games: [], fresh: 0 };

  const byId = new Map(mine.map((g) => [g.appid, g]));
  const games = [];

  for (const t of theirs) {
    const m = byId.get(t.appid);
    if (!m) continue;
    games.push({
      appid: t.appid,
      name: m.name || t.name,
      myHours: m.hours,
      theirHours: t.hours,
      // ikisinin toplam saati — "ortak alışkanlık" sıralaması için
      totalHours: Math.round((m.hours + t.hours) * 10) / 10,
      idle: !m.hours2w && !t.hours2w,
    });
  }

  // Çok oynanan ortak oyunlar önce; eşitlikte ada göre kararlı sıralama.
  games.sort((a, b) => (b.totalHours - a.totalHours) || String(a.name).localeCompare(String(b.name)));

  return { games, fresh: games.filter((g) => g.idle).length };
}
