import { getSteamDetailsCached } from './steam-cache.js';
import { isSteamDataAdult } from './adult-filter.js';
import { getNewsList } from './news-list.js';

// ─────────────────────────────────────────────────────────────────────────────
// Sohbette paylaşım — ÜÇ TÜR: fragman (Reels), oyun (kart), haber (satır).
//
// MODERASYONA GİRMİYOR ve girmemeli: paylaşılan içerik KULLANICI YÜKLEMESİ
// DEĞİL, zaten bizim akışımızda servis ettiğimiz Steam fragmanı. Yükleme
// hattındaki denetim, denetlenmemiş içeriğin depoya inmesini engellemek için
// vardı; burada denetlenmemiş içerik yok.
//
// İSTEMCİDEN YALNIZCA `appid` ALINIYOR. Başlık ve görseli sunucu çözüyor.
// Sebebi: istemciden gelen metni saklasaydık, sohbet baloncuğu istenen her
// şeyin yazdırılabildiği bir yüzeye dönüşürdü — "X oyunu" diye gönderip
// içine başka bir metin koymak mümkün olurdu.
//
// YETİŞKİN SÜZGECİ akıştaki ile AYNI. Akışta gösterilmeyen bir oyunun
// paylaşımla dolaşıma girmesi süzgeci anlamsız kılardı.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FRAGMAN — appid'i paylaşılabilir bir karta çözer.
 *
 * @returns {Promise<{kind:'reel', appid:string, name:string, image:string}|null>}
 *   `null` = geçersiz appid, oyun bulunamadı veya yetişkin içerik
 */
export async function resolveShare(appid, lang = 'tr') {
  const id = Number(appid);
  if (!Number.isInteger(id) || id <= 0) return null;

  const d = await getSteamDetailsCached(id, lang).catch(() => null);
  if (!d?.name) return null;
  if (isSteamDataAdult(d)) return null;

  return {
    kind: 'reel',
    appid: String(id),
    // Steam'den gelen ad; istemciden DEĞİL.
    name: String(d.name).slice(0, 120),
    image: d.header_image
      || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// OYUN PAYLAŞIMI — kart üstünden
//
// NEDEN AYRI BİR ÇÖZÜCÜ. Oyun listesi Steam appid'i TAŞIMIYOR: canlı uçtan
// ölçüldü — `{ id:'rawg_3498', rawgId:3498, appid:null, steamAppId:null }`.
// `rawgId` bir RAWG kimliği, Steam appid'i değil. Mevcut `resolveShare`
// Steam'e gidiyor, dolayısıyla kartlardan gelen paylaşımı çözemez.
//
// İSTEMCİDEN YALNIZCA `gameId` ALINIYOR (`rawg_3498`). Ad ve kapak bizim
// katalogumuzdan çözülüyor — fragman paylaşımındaki kuralın aynısı: istemci
// metin yollasaydı sohbet baloncuğu serbest bir yazı yüzeyi olurdu.
// ─────────────────────────────────────────────────────────────────────────────

const OYUN_KIMLIK = /^rawg_(\d{1,12})$/;

// ── KİMLİK UZAYI ÇİFT ANLAMLI ──
// Bu paylaşımı yazarken ortaya çıktı: `rawg_<N>` biçimindeki N BAZEN Steam
// appid'i, BAZEN RAWG id'si.
//   · Trend/yeni/indirim yolları Steam kapsülünden geliyor → N = Steam appid
//     (games/route.js: `id: 'rawg_' + appid`)
//   · RAWG kataloğu → N = RAWG id
// Ölçüldü: `rawg_3498` GTA V'i gösteriyor ama Steam'de 3498 diye bir oyun
// yok (GTA V'in Steam appid'i 271590).
//
// Bu yüzden TAHMİN ETMİYORUZ: ikisi de denenip hangisi cevap verirse o
// kullanılıyor, ikisi de vermezse paylaşım REDDEDİLİYOR. Uydurma ad
// üretmiyoruz — kartın adı istemciden gelseydi zaten tüm kural çökerdi.

async function rawgOyun(id) {
  const key = process.env.RAWG_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.rawg.io/api/games/${id}?key=${key}`,
      { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.name) return null;
    // RAWG yetişkin içeriği `esrb_rating.slug === 'adults-only'` ile
    // işaretliyor; akıştaki süzgeçle aynı yönde davranıyoruz.
    if (d?.esrb_rating?.slug === 'adults-only') return null;
    return { name: String(d.name), image: d.background_image || null };
  } catch {
    return null;
  }
}

/**
 * @param {string} gameId  `rawg_<sayı>`
 * @returns {Promise<{kind:'game', gameId:string, appid:string|null, name:string, image:string}|null>}
 */
export async function resolveGameShare(gameId, lang = 'tr') {
  const m = OYUN_KIMLIK.exec(String(gameId || ''));
  if (!m) return null;
  const id = Number(m[1]);

  // 1) Steam appid mi?
  const d = await getSteamDetailsCached(id, lang).catch(() => null);
  if (d?.name) {
    if (isSteamDataAdult(d)) return null;
    return {
      kind: 'game',
      gameId: `rawg_${id}`,
      appid: String(id),
      name: String(d.name).slice(0, 120),
      image: d.header_image
        || `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`,
    };
  }

  // 2) Değilse RAWG id'si mi? `appid` YOK — sohbette karta dokunulunca
  //    oyun detayı yine `rawg_<id>` ile açılıyor, appid'e ihtiyaç duymuyor.
  const r = await rawgOyun(id);
  if (!r) return null;
  return {
    kind: 'game',
    gameId: `rawg_${id}`,
    appid: null,
    name: r.name.slice(0, 120),
    image: r.image,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HABER PAYLAŞIMI
//
// HABERİN KALICI KİMLİĞİ YOK. Haber ucu `id: 'news_' + i` üretiyor — 30
// dakikalık listedeki SIRA NUMARASI. Liste tazelenince `news_3` başka bir
// habere işaret eder. Kalıcı olan tek alan `url`.
//
// AMA URL'Yİ İSTEMCİDEN OLDUĞU GİBİ SAKLAMIYORUZ: sunucu kendi haber
// listesinde arıyor ve başlığı, görseli, kaynağı ORADAN alıyor. İki şeyi
// birden kapatıyor —
//   · istemci rastgele bir bağlantı enjekte edemiyor (liste beyaz listedir),
//   · istemci başlık uyduramıyor (metin listeden geliyor).
//
// Listede bulunamayan haber REDDEDİLİYOR. Bu, 30 dk'lık pencereden düşmüş
// eski bir haberi paylaşamamak demek — kabul edilebilir: alternatif,
// doğrulanmamış bir bağlantıyı sohbete sokmak olurdu.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} newsUrl
 * @returns {Promise<{kind:'news', url:string, name:string, image:string, source:string}|null>}
 */
export async function resolveNewsShare(newsUrl, lang = 'tr') {
  const ham = String(newsUrl || '').trim();
  if (!ham || ham.length > 2048) return null;

  let u;
  try { u = new URL(ham); } catch { return null; }
  if (u.protocol !== 'https:') return null;

  const liste = await getNewsList(lang).catch(() => null);
  if (!Array.isArray(liste)) return null;

  // Karşılaştırma TAM URL üzerinden: aynı sitenin başka bir sayfası
  // eşleşmesin diye host değil adresin kendisi.
  const haber = liste.find((n) => n.url === ham);
  if (!haber?.title) return null;

  return {
    kind: 'news',
    url: haber.url,
    name: String(haber.title).slice(0, 200),
    image: haber.image || null,
    source: String(haber.source || '').slice(0, 60),
  };
}
