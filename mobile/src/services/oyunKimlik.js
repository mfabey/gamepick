// ─────────────────────────────────────────────────────────────────────────────
// KANONİK OYUN KİMLİĞİ — tek `rawg_` öneki, İKİ uyumsuz sayı uzayı.
//
// ÖLÇÜLDÜ (canlı production, 1 Eylül 2026): tek bir sıradan oturumda aynı
// oyun İKİ kimlikle geliyor. Sol sütun RAWG id'si, sağ sütun Steam appid'i —
// ikisi de `rawg_` önekiyle, ikisi de `rawgId` alanında:
//
//   Red Dead Redemption 2   tür listesi rawg_28       ·  indirim  rawg_1174180
//   Elden Ring              curated     rawg_326243   ·  arama    rawg_1245620
//   Hades                   tür listesi rawg_274755   ·  arama    rawg_1145360
//
// Sebep: `/api/games?section=sale` Steam'i YEDEK DEĞİL BİRİNCİL yol olarak
// kullanıyor (games/route.js:705) ve Steam appid'ini kimlik yapıyor; aynı ucun
// `?genres=` dalı RAWG'da kalıyor. İkisi anasayfada AYNI ANDA çiziliyor, yani
// hata RAWG çökmesine bağlı değil — her gün yaşanıyor.
//
// Kullanıcıya yansıması: istek listesi rozeti yanlış, aynı oyun koleksiyona
// iki kez giriyor, "görüldü"/"ilgilenmiyorum" filtreleri uzaylar arasında
// sızıyor.
//
// ── NEDEN SUNUCU DEĞİL, BURASI ──
// İlk plan sunucunun açık bir `appid` alanı yollamasıydı; ÖLÇÜM ÇÜRÜTTÜ:
// RAWG yolundaki 37 kaydın 37'sinde `steamUrl` boş, appid türetilemiyor (%0).
// Sunucunun oradan appid üretmesi oyun başına bir Steam sorgusu demek — tam da
// kaçınmak istediğimiz maliyet. Ayrıca ölçüldü: üyelik yalnızca İKİ ekranda
// okunuyor (oyun detayı ve Reels), kartlarda hiç okunmuyor. Bu yüzden düzeltme
// istemcide duruyor ve backend'e dokunmuyor.
//
// ── ANAHTAR KADEMELERİ ──
// Tek bir "doğru" alan yok, o yüzden her oyun BİRDEN ÇOK anahtar üretiyor ve
// iki kayıt anahtarlarından HERHANGİ BİRİ kesişiyorsa aynı sayılıyor:
//
//   steam:<appid>   en güçlü — appid iki uzayda da aynı şeyi gösteriyor
//   slug:<slug>     liste uçlarının hepsi `rawgSlug` yolluyor
//   ad:<ad>         son çare; slug ayrıştığında tutan tek kademe
//   id:<id>         ham kimlik — eski kayıtlar kendileriyle eşleşsin diye
//
// Slug tek başına YETMİYOR, ölçüldü: üç çakışmanın ikisinde tutuyor
// (`red-dead-redemption-2`, `elden-ring`) ama Hades'te ayrışıyor
// (`hades-2018` ≠ `hades`). Ad kademesi o boşluğu kapatıyor.
//
// ── AD KADEMESİNİN YANLIŞ POZİTİFİ KAPATILDI ──
// Aynı ada sahip FARKLI oyunlar var (Prey 2006 ↔ Prey 2017). Kural: iki
// kaydın da appid'i varsa ve appid'ler FARKLIYSA, ad/slug ne derse desin
// aynı oyun değiller. Appid bilinen en kesin sinyal; onu ad ezemez.
// ─────────────────────────────────────────────────────────────────────────────

/** Ad/slug normalizasyonu — büyük-küçük, boşluk, noktalama farkını siler. */
function sadelestir(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Oyunun Steam appid'i (biliniyorsa). Kayıtlar bu alanı üç ayrı adla
 * taşıyabiliyor: liste kartı `appid`, detay yanıtı `steamAppId`, Reels `appid`.
 */
export function appidOf(game) {
  const a = game?.appid ?? game?.steamAppId;
  if (a == null || a === '') return null;
  const s = String(a).trim();
  return /^\d{1,12}$/.test(s) ? s : null;
}

/**
 * Bir oyunun tüm kimlik anahtarları. Sıra ÖNEMLİ: ilk eleman en güçlü olan
 * (bkz. `birincilAnahtar`).
 *
 * @param {object} game
 * @returns {string[]}
 */
export function oyunAnahtarlari(game) {
  if (!game) return [];
  const anahtarlar = [];

  const appid = appidOf(game);
  if (appid) anahtarlar.push(`steam:${appid}`);

  const slug = sadelestir(game.rawgSlug || game.slug);
  if (slug) anahtarlar.push(`slug:${slug}`);

  const ad = sadelestir(game.name);
  if (ad) anahtarlar.push(`ad:${ad}`);

  // Ham kimlik EN SONA: eski kayıtlar (anahtar alanı olmayanlar) hiç değilse
  // kendileriyle eşleşsin. Tek başına asla iki uzayı birleştiremez.
  if (game.id != null && game.id !== '') anahtarlar.push(`id:${String(game.id)}`);

  return anahtarlar;
}

/**
 * Depoya yazılacak tek anahtar — mevcut en güçlü kademe.
 * Anahtar bulunamazsa null (çağıran ham kimliğe düşer).
 */
export function birincilAnahtar(game) {
  return oyunAnahtarlari(game)[0] || null;
}

/**
 * İki kayıt aynı oyun mu?
 *
 * Appid'ler biliniyor ve FARKLIYSA sonuç kesin hayır — ad benzerliği bunu
 * ezemez (Prey 2006 ↔ Prey 2017).
 */
export function ayniOyun(a, b) {
  if (!a || !b) return false;

  const aid = appidOf(a);
  const bid = appidOf(b);
  if (aid && bid) return aid === bid;

  const ka = oyunAnahtarlari(a);
  if (ka.length === 0) return false;
  const kb = new Set(oyunAnahtarlari(b));
  return ka.some((k) => kb.has(k));
}

/**
 * "Görüldü" / "ilgilenmiyorum" depolarının yazacağı TEK anahtar.
 *
 * NEDEN EN GÜÇLÜ DEĞİL, EN ORTAK KADEME: bu depolar oyun başına TEK kayıt
 * tutmak zorunda (`seenCountSince` haftalık istatistiği besliyor — oyun başına
 * üç anahtar yazılsaydı sayı üçe katlanırdı). Tek anahtar yazılacaksa da iki
 * uzayın ORTAK olanı seçilmeli:
 *
 *   detaydan `steam:1145360` yazılsaydı, akıştaki `rawg_274755` adayının
 *   anahtarlarında appid olmadığı için asla eşleşmezdi.
 *
 * Ad kademesi üç ölçülmüş vakanın üçünde de tutuyor. Bedeli: aynı ada sahip
 * farklı oyunlar (Prey 2006 ↔ Prey 2017) burada birleşiyor. Kabul edilebilir,
 * çünkü bu iki depo yalnızca SIRALAMAYI etkiliyor (−0.25 puan ya da havuzdan
 * eleme) ve ikisi de süreli (45 / 180 gün). Kalıcı kullanıcı verisi — istek
 * listesi ve koleksiyon — `ayniOyun` kullanıyor, orada appid çelişkisi kuralı
 * yürürlükte.
 */
export function depoAnahtari(gameOrId) {
  const game = gameOrId && typeof gameOrId === 'object' ? gameOrId : { id: gameOrId };
  const ad = sadelestir(game.name);
  if (ad) return `ad:${ad}`;
  if (game.id != null && game.id !== '') return `id:${String(game.id)}`;
  return null;
}

/**
 * Eski kayıtları (çıplak `rawg_28` gibi) anahtar biçimine çevirir.
 *
 * Bu olmadan kimlik düzeltmesi kullanıcının mevcut "görüldü"/"ilgilenmiyorum"
 * geçmişini sıfırlardı; elenen oyunlar bir kez daha akışa dönerdi.
 */
export function eskiAnahtariCevir(anahtar) {
  const s = String(anahtar);
  return /^(steam|slug|ad|id):/.test(s) ? s : `id:${s}`;
}

/**
 * Anahtar kümesinde (görüldü / ilgilenmiyorum depoları) bu oyun var mı?
 *
 * Depolar düz bir anahtar kümesi tuttuğu için appid çelişkisi kuralı burada
 * uygulanamıyor — küme, hangi kaydın hangi appid'i taşıdığını bilmiyor.
 * Kabul edilebilir: bu iki depo yalnızca SIRALAMAYI etkiliyor (görülen oyun
 * -0.25 puan, elenen oyun havuzdan çıkar), kalıcı kullanıcı verisi değil.
 */
export function kumedeVar(kume, game) {
  if (!kume || typeof kume.has !== 'function') return false;
  return oyunAnahtarlari(game).some((k) => kume.has(k));
}
