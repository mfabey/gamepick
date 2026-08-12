import {
  redisCmd, redisCmdStrict, redisPipeline, parseJSON,
} from './redis';

// ─────────────────────────────────────────────────────────────────────────────
// Birebir mesajlaşma — veri katmanı.
//
// ANAHTARLAR
//   dm_msgs:{cid}       → LIST  mesaj JSON, LPUSH ile EN YENİ BAŞTA
//   dm_meta:{cid}       → JSON  { a, b, lastText, lastAt, lastFrom }
//   user_dms:{uid}      → ZSET  cid, skor = son mesaj zamanı
//   dm_read:{cid}:{uid} → STR   bu kullanıcının en son okuduğu zaman
//
// EN YENİ BAŞTA saklanıyor çünkü sohbet ekranı ters çevrilmiş bir liste:
// açılışta istenen şey son mesajlar. LPUSH + LRANGE 0..N tam da onu veriyor,
// tersine çevirme veya kaydırma gerekmiyor.
//
// KONUŞMA KİMLİĞİ iki uid'nin SIRALI birleşimi. Sıralama şart: aksi hâlde
// A→B ve B→A iki ayrı konuşma üretir ve mesajlar ikiye bölünür.
//
// YAZMALARDA KATI API: mesaj gönderimi sessizce başarısız olamaz. Bu repoda
// `redisCmd(...).catch(() => {})` kalıbı bir kez Steam bağlantısını yok etti;
// aynı hatayı sohbette yapmak mesaj kaybı demek olur.
// ─────────────────────────────────────────────────────────────────────────────

// Konuşma başına saklanan mesaj tavanı. Sohbet geçmişi arşiv değil; eski
// mesajlar düşüyor. 500 mesaj tipik bir konuşmada haftalarca yeter.
const MAX_MESSAGES = 500;

// Tek istekte dönen mesaj sayısı.
const PAGE = 50;

export const MAX_TEXT = 1000;

const msgsKey = (cid)       => `dm_msgs:${cid}`;
const metaKey = (cid)       => `dm_meta:${cid}`;
const userKey = (uid)       => `user_dms:${uid}`;
const readKey = (cid, uid)  => `dm_read:${cid}:${uid}`;
const delKey  = (cid)       => `dm_deleted:${cid}`;
const typingKey = (cid, uid) => `dm_typing:${cid}:${uid}`;
const likesKey  = (cid)      => `dm_likes:${cid}`;
// KONUŞMA BAŞINA TEK sabit mesaj, kullanıcı başına değil: sabitlemek ortak
// bir eylem, "ikimizin de üstünde durduğu şey" demek. Kişiye özel olsaydı
// karşı tarafın gördüğü sabit farklı olurdu ve "sabitledim" demek anlamsız
// hâle gelirdi.
const pinKey    = (cid)      => `dm_pin:${cid}`;

/**
 * İki uid'den kararlı bir konuşma kimliği üretir.
 * Sıralı olduğu için her iki taraf da AYNI kimliği hesaplıyor.
 */
export function convId(a, b) {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Konuşmanın taraflarını kimlikten çözer. */
export function partiesOf(cid) {
  const i = String(cid || '').indexOf('_');
  if (i <= 0) return null;
  return [cid.slice(0, i), cid.slice(i + 1)];
}

/**
 * Mesajı yazar ve her iki tarafın konuşma listesini günceller.
 *
 * @throws {Error} Redis yazamazsa — çağıran kullanıcıya hata döndürmeli
 */
export async function appendMessage({ from, to, text, media, share, gif, replyTo }) {
  const cid = convId(from, to);
  if (!cid) throw new Error('INVALID_CONVERSATION');

  const at = Date.now();
  // Kimlik: zaman + rastgele son ek. Aynı milisaniyede iki mesaj gelirse
  // yalnızca zaman damgası benzersiz olmuyor ve arayüzde anahtar çakışıyor.
  const id = `${at}-${Math.random().toString(36).slice(2, 8)}`;
  // `media` ve `share` yalnızca VARSA ekleniyor: eski mesajlarda bu alanlar
  // hiç yok ve `undefined` yazmak JSON.stringify'da zaten düşerdi — okurken
  // "alan yok" ile "alan boş" ayrımı yapmak zorunda kalmayalım.
  const msg = { id, from, text, at };
  if (media) msg.media = media;
  if (share) msg.share = share;
  if (gif) msg.gif = gif;
  // YALNIZCA KİMLİK SAKLANIYOR, alıntının kopyası değil.
  //
  // Anlık görüntü saklamak okumayı ucuzlatırdı ama GERİ ALMAYI DELERDİ:
  // kullanıcı mesajını geri aldığında metni her yerden gitmeli, ona verilmiş
  // bir yanıtın içinde durmaya devam etmemeli. Kimlikten çözünce geri alınan
  // mesaj alıntıda da "geri alındı" görünüyor.
  //
  // Çözüm maliyetsiz: `getMessages` zaten listenin tamamını tek LRANGE ile
  // okuyor, alıntı o listeden bellek içi bir eşlemeyle bulunuyor.
  if (replyTo) msg.replyTo = String(replyTo);

  // Mesajın KENDİSİ katı: kaybolursa kullanıcı yazdığını sanır ama gitmemiştir.
  await redisCmdStrict(['LPUSH', msgsKey(cid), JSON.stringify(msg)]);

  // Geri kalanı türetilmiş veri — biri düşerse mesaj yine duruyor, o yüzden
  // tek turda ve gevşek. Kırpma da burada: listenin sınırsız büyümesini
  // engelliyor ama başarısız olması mesajı geçersiz kılmaz.
  await redisPipeline([
    ['LTRIM', msgsKey(cid), '0', String(MAX_MESSAGES - 1)],
    ['SET', metaKey(cid), JSON.stringify({
      a: cid.split('_')[0], b: cid.split('_')[1],
      // Önizleme. SİHİRLİ DİZGE KULLANILMIYOR: metinsiz medya için önce
      // " photo" gibi bir işaret bırakılıyordu ve baştaki boşluk bir kez NUL
      // bayt olarak yazılıp karşılaştırmayı sessizce bozdu. Tür AYRI BİR
      // ALANDA duruyor; arayüz onu kendi diline çeviriyor.
      lastText: text ? text.slice(0, 140) : '',
      lastKind: gif ? 'gif'
        : share ? 'reel'
        : media ? (media.type?.startsWith('video/') ? 'video' : 'photo') : null,
      // Son mesajın kimliği. Geri alma bunu kullanıyor: silinen mesaj SON
      // mesajsa önizleme temizlenmeli, yoksa konuşma listesi geri alınmış
      // metni göstermeye devam eder.
      lastId: id,
      lastAt: at, lastFrom: from,
    })],
    ['ZADD', userKey(from), String(at), cid],
    ['ZADD', userKey(to), String(at), cid],
    // Gönderen kendi mesajını okumuş sayılır, aksi hâlde kendi yazdığı
    // okunmamış olarak görünür.
    ['SET', readKey(cid, from), String(at)],
  ]);

  return msg;
}

/**
 * Mesaj geçmişi + sabit mesaj — TEK Redis turunda.
 *
 * İkisi birlikte okunuyor çünkü sabit mesajı çözmek için listenin kendisi
 * gerekiyor: sabit yalnızca bir KİMLİK olarak saklanıyor (geri alma
 * gerekçesi alıntılarla aynı, bkz. quoteOf). Ayrı bir çağrı, 500 kayıtlık
 * listeyi ikinci kez çekmek demekti.
 *
 * @param {number} [before] bu zamandan ESKİ mesajlar (sayfalama)
 * @returns {Promise<{messages: Array, pinned: object|null}>}
 */
export async function getHistory(cid, { before, after, limit = PAGE } = {}) {
  // Mesajlar, geri alınanlar ve beğeniler TEK turda okunuyor.
  //
  // Beğeniler TEK BİR HASH içinde (konuşma başına), mesaj başına ayrı anahtar
  // değil: 50 mesaj için 50 ayrı okuma yapmak yerine tek HGETALL yetiyor.
  const [raw, deleted, likeMap, pinRaw] = await redisPipeline([
    ['LRANGE', msgsKey(cid), '0', String(MAX_MESSAGES - 1)],
    ['SMEMBERS', delKey(cid)],
    ['HGETALL', likesKey(cid)],
    // Sabit mesaj AYNI TURDA okunuyor. Ayrı bir çağrı, listeyi ikinci kez
    // (500 kayıt) çekmek anlamına gelirdi.
    ['GET', pinKey(cid)],
  ]) || [];

  if (!Array.isArray(raw)) return { messages: [], pinned: null };
  const gone = new Set(Array.isArray(deleted) ? deleted : []);

  const all = raw.map(parseJSON).filter(Boolean);

  // Alıntı çözümü SAYFALAMADAN ÖNCEKİ tam liste üzerinden: yanıtlanan mesaj
  // sayfanın dışında kalmış olabilir ve o zaman alıntı boş görünürdü.
  const byId = new Map(all.map((m) => [m.id, m]));

  let msgs = all;
  if (before) msgs = msgs.filter((m) => m.at < before);
  // `after`: yalnızca YENİ mesajlar. Yedek yoklama bunu kullanıyor — her
  // turda 50 mesajın tamamını çekmek yerine yalnızca farkı istiyor.
  if (after) msgs = msgs.filter((m) => m.at > after);

  const messages = msgs.slice(0, limit).map((m) => (
    // Geri alınan mesaj LİSTEDEN ÇIKARILMIYOR, içeriği boşaltılıyor. Sıra ve
    // sayfalama bozulmasın diye: mesajı listeden silmek `before` ile yapılan
    // sayfalamayı kaydırır ve arayüzde mesaj atlanmasına yol açar.
    gone.has(m.id)
      ? { id: m.id, from: m.from, at: m.at, deleted: true }
      // `likes` DE gönderiliyor: sunucu uygulamadan önce dağıtılıyor ve
      // güncellenmemiş kurulumlar hâlâ bu alanı okuyor. Kalp listesinin
      // kopyası, tepki nesnesinden türetiliyor.
      : (() => {
          const reactions = reactionsOf(likeMap, m.id);
          const out = { ...m, reactions, likes: reactions[DEFAULT_REACTION] || [] };
          if (m.replyTo) out.quote = quoteOf(m.replyTo, byId, gone);
          return out;
        })()
  ));

  // SABİT MESAJ, geri alınmış veya pencerenin dışına düşmüşse GÖSTERİLMİYOR.
  // Alıntıdan farkı bu: alıntı 'bu mesaj geri alındı' diye bir iz bırakıyor
  // çünkü yanıtın bağlamı o. Sabit ise ekranın tepesinde duran bir bant;
  // içi boş bir bant yer kaplamaktan başka bir şey yapmaz.
  let pinned = null;
  const pin = parseJSON(pinRaw);
  if (pin?.id) {
    const q = quoteOf(pin.id, byId, gone);
    if (!q.deleted && !q.missing) pinned = { ...q, by: pin.by || null, at: pin.at || 0 };
  }

  return { messages, pinned };
}

/** Yalnızca mesajlar — sabit mesaja ihtiyacı olmayan çağıranlar için. */
export async function getMessages(cid, opts) {
  return (await getHistory(cid, opts)).messages;
}

/**
 * Mesajı sabitler / sabitlemeyi kaldırır.
 *
 * HER İKİ TARAF DA yapabiliyor. Sabit ortak bir işaret; yalnızca
 * sabitleyenin kaldırabilmesi, karşı tarafı başkasının koyduğu bir bandın
 * altında bırakırdı.
 *
 * VARLIK DOĞRULANMIYOR — alıntılardaki gerekçenin aynısı: bilinmeyen bir
 * kimlik okuma yolunda zaten eleniyor ve bant hiç çizilmiyor.
 */
export async function setPin(cid, msgId, byUid) {
  if (!msgId) {
    await redisCmd(['DEL', pinKey(cid)]);
    return { pinned: null };
  }
  const row = { id: String(msgId), by: byUid, at: Date.now() };
  await redisCmd(['SET', pinKey(cid), JSON.stringify(row)]);
  return { pinned: row };
}

/**
 * Alıntı özeti — yanıtlanan mesajın çizilebilir hâli.
 *
 * ÜÇ DURUM var ve üçü de arayüzde farklı görünmeli:
 *   • bulundu       → yazar + kısa metin (veya medya türü)
 *   • geri alınmış  → `deleted: true`, metin YOK
 *   • bulunamadı    → `missing: true` (500 mesajlık pencerenin dışına düşmüş)
 *
 * Metin 120 karaktere kırpılıyor: alıntı bir bağlam ipucu, mesajın kendisi
 * değil. Uzun bir alıntı kendi yanıtından uzun görünürdü.
 */
function quoteOf(id, byId, gone) {
  const src = byId.get(id);
  if (!src) return { id, missing: true };
  if (gone.has(id)) return { id, from: src.from, deleted: true };
  return {
    id,
    from: src.from,
    text: src.text ? src.text.slice(0, 120) : '',
    // Metinsiz mesajda arayüz "📷 Fotoğraf" gibi bir etiket çiziyor; tür
    // burada, çeviri istemcide (kullanıcının dili sunucuda belli değil).
    kind: src.gif ? 'gif'
      : src.share ? 'reel'
      : src.media ? (src.media.type?.startsWith('video/') ? 'video' : 'photo') : null,
  };
}

/**
 * Mesajı geri alır.
 *
 * LİSTEYE DOKUNMUYOR, ayrı bir kümeye kimlik yazıyor. `LSET` ile konumdan
 * silmek yarış koşulu içeriyordu: araya yeni bir `LPUSH` girdiğinde tüm
 * indeksler kayıyor ve yanlış mesaj silinebiliyordu. Küme yaklaşımında konum
 * hiç kullanılmıyor.
 *
 * YALNIZCA GÖNDEREN kendi mesajını geri alabilir — kontrol çağırana bırakılmadı,
 * burada da doğrulanıyor.
 *
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function deleteMessage(cid, msgId, byUid) {
  if (!cid || !msgId || !byUid) return { ok: false, error: 'BAD_REQUEST' };

  const raw = await redisCmd(['LRANGE', msgsKey(cid), '0', String(MAX_MESSAGES - 1)]);
  if (!Array.isArray(raw)) return { ok: false, error: 'NOT_FOUND' };

  const target = raw.map(parseJSON).find((m) => m?.id === msgId);
  if (!target) return { ok: false, error: 'NOT_FOUND' };
  if (target.from !== byUid) return { ok: false, error: 'NOT_OWNER' };

  await redisCmd(['SADD', delKey(cid), msgId]);

  // Silinen mesaj SON mesajsa önizlemeyi temizle — aksi hâlde konuşma listesi
  // geri alınmış metni göstermeye devam eder.
  const meta = (await redisCmd(['GET', metaKey(cid)]).then(parseJSON)) || null;
  if (meta?.lastId === msgId) {
    await redisCmd(['SET', metaKey(cid), JSON.stringify({
      ...meta, lastText: '', lastKind: null, lastDeleted: true,
    })]);
  }

  return { ok: true };
}

/** Kullanıcının konuşmaları — en yeni önce. */
export async function listConversations(uid, limit = 40) {
  // ZREVRANGE: skor (son mesaj zamanı) büyükten küçüğe
  const cids = await redisCmd(['ZREVRANGE', userKey(uid), '0', String(limit - 1)]);
  if (!Array.isArray(cids) || !cids.length) return [];

  const rows = await redisPipeline([
    ...cids.map((c) => ['GET', metaKey(c)]),
    ...cids.map((c) => ['GET', readKey(c, uid)]),
  ]) || [];

  return cids.map((cid, i) => {
    const meta = parseJSON(rows[i]) || {};
    const readAt = Number(rows[cids.length + i] || 0);
    const parties = partiesOf(cid) || [];
    return {
      cid,
      otherUid: parties[0] === uid ? parties[1] : parties[0],
      lastText: meta.lastText || '',
      // 'photo' | 'video' | null — arayüz metinsiz medya mesajını buna göre
      // etiketliyor. Eski kayıtlarda alan yok, `null` doğru davranış.
      lastKind: meta.lastKind || null,
      // Son mesaj geri alındıysa arayüz "geri alındı" yazıyor.
      lastDeleted: !!meta.lastDeleted,
      lastAt: meta.lastAt || 0,
      lastFrom: meta.lastFrom || null,
      // Okunmamış = son mesaj benden DEĞİL ve okuduğum andan yeni
      unread: !!meta.lastAt && meta.lastFrom !== uid && meta.lastAt > readAt,
    };
  });
}

/** Konuşmayı okundu işaretler. */
export async function markRead(cid, uid) {
  await redisCmd(['SET', readKey(cid, uid), String(Date.now())]);
}

/**
 * KARŞI TARAFIN en son okuma zamanı — "görüldü" göstergesi bunu kullanıyor.
 *
 * Veri zaten okunmamış rozetini beslemek için tutuluyordu; görüldü bilgisi
 * için yeni bir alan gerekmedi. Kendi mesajlarımdan zamanı bu değerden KÜÇÜK
 * veya eşit olanlar görülmüş sayılıyor.
 */
export async function getReadAt(cid, uid) {
  const r = await redisCmd(['GET', readKey(cid, uid)]);
  return Number(r) || 0;
}

// ── Yazıyor durumu ──
//
// KENDİNİ SİLEN bir anahtar (5 sn TTL) — kalıcı bir kayıt DEĞİL. Önce
// hiçbir yere yazmıyordu ve yalnızca Pusher kanalından geçiyordu; Pusher
// yapılandırılmamış kurulumlarda özellik tamamen ölüydü. Kısa ömürlü bir
// anahtar, yedek yoklamanın da okuyabilmesini sağlıyor.
//
// "Kimin ne zaman yazdığı" saklanmıyor: anahtar 5 saniyede kendiliğinden
// yok oluyor ve geçmişi tutulmuyor.
const TYPING_TTL_SEC = 5;

export async function setTyping(cid, uid) {
  await redisCmd(['SET', typingKey(cid, uid), '1', 'EX', String(TYPING_TTL_SEC)]);
}

/** Karşı taraf şu an yazıyor mu? */
export async function isTyping(cid, uid) {
  const r = await redisCmd(['GET', typingKey(cid, uid)]);
  return r === "1";
}

// ─────────────────────────────────────────────────────────────────────────────
// TEPKİLER
//
// SABİT LİSTE, serbest metin değil. Bu bir güvenlik sınırı, tasarım tercihi
// değil: tepki değeri doğrudan baloncuğun altına yazılıyor. İstemcinin
// gönderdiği herhangi bir metni kabul etseydik sohbet baloncuğu, istenen her
// şeyin yazdırılabildiği bir yüzeye dönüşürdü — medya ve GIF uçlarında
// verdiğimiz kararın aynısı.
//
// ALTI TANE. Daha fazlası seçiciyi tarama işine çeviriyor; WhatsApp ve
// Instagram da altıda durmuş.
export const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

// Kalp AYRICALIKLI: çift dokunuşun karşılığı ve eski istemcilerin bildiği
// tek tepki (bkz. aşağıdaki geriye dönük uyum).
export const DEFAULT_REACTION = '❤️';

export function isReaction(e) {
  return REACTIONS.includes(e);
}

/**
 * Ham hash değerini tepki nesnesine çevirir.
 *
 * GERİYE DÖNÜK UYUM: eski kayıtlar düz bir uid dizisi (`["uidA","uidB"]`),
 * çünkü tek tür tepki vardı. O biçim kalp tepkisi olarak okunuyor —
 * göç betiği yazmaya gerek yok, eski beğeniler olduğu yerde doğru
 * görünmeye devam ediyor ve bir sonraki yazımda yeni biçime geçiyor.
 */
function normalize(raw) {
  const v = parseJSON(raw);
  if (Array.isArray(v)) return v.length ? { [DEFAULT_REACTION]: v } : {};
  if (v && typeof v === 'object') {
    const out = {};
    for (const [e, list] of Object.entries(v)) {
      // Depoda bozuk/eski bir emoji kalmışsa okurken eleniyor: listeyi
      // daralttığımızda eski kayıtların ekrana sızmasını istemiyoruz.
      if (isReaction(e) && Array.isArray(list) && list.length) out[e] = list;
    }
    return out;
  }
  return {};
}

/**
 * Upstash HGETALL yanıtı dizi olarak gelebiliyor ([alan, değer, alan, değer]).
 * İki biçimi de kabul ediyoruz; yalnızca nesne beklemek sessizce boş tepki
 * listesi döndürürdü.
 */
function reactionsOf(map, msgId) {
  if (!map) return {};
  let raw = null;
  if (Array.isArray(map)) {
    for (let i = 0; i < map.length; i += 2) if (map[i] === msgId) { raw = map[i + 1]; break; }
  } else {
    raw = map[msgId];
  }
  return normalize(raw);
}

/**
 * Tepkiyi açar/kapatır.
 *
 * KİŞİ BAŞINA TEK TEPKİ. Yeni bir emojiye basmak öncekinin yerini alıyor,
 * yanına eklenmiyor — aynı kişinin bir mesaja hem 😂 hem 😢 koyması bir şey
 * anlatmıyor ve baloncuğun altını rozet çöplüğüne çeviriyor. WhatsApp ve
 * Instagram da böyle davranıyor.
 *
 * AYNI EMOJİYE TEKRAR BASMAK KALDIRIYOR — çift dokunuşun kalbi kaldırması
 * bu kuralın özel hâli.
 *
 * OKU-DEĞİŞTİR-YAZ yarışa açık ama konuşmada YALNIZCA İKİ KİŞİ var; aynı
 * mesaja aynı anda tepki verme olasılığı ihmal edilebilir ve sonucu da
 * zararsız (bir tepki kaybolur, veri bozulmaz). Atomik bir betik yazmak bu
 * bedele değmiyor.
 *
 * @param {string} emoji  REACTIONS içinde olmalı — çağıran doğrulamalı
 * @returns {Promise<{reactions: object, likes: string[], mine: string|null}>}
 */
export async function toggleReaction(cid, msgId, uid, emoji = DEFAULT_REACTION) {
  const raw = await redisCmd(['HGET', likesKey(cid), msgId]);
  const cur = normalize(raw);

  // Zaten bu emojide miyim? Cevabı TEMİZLEMEDEN ÖNCE almak zorundayız.
  const had = (cur[emoji] || []).includes(uid);

  // Her emojiden çık — tek tepki kuralı.
  for (const e of Object.keys(cur)) {
    const list = cur[e].filter((u) => u !== uid);
    if (list.length) cur[e] = list; else delete cur[e];
  }

  if (!had) cur[emoji] = [...(cur[emoji] || []), uid];

  if (Object.keys(cur).length) {
    await redisCmd(['HSET', likesKey(cid), msgId, JSON.stringify(cur)]);
  } else {
    // Boş kalan alanı SİL — tepkisi kalmayan mesajlar hash içinde birikirse
    // okuma her seferinde büyür.
    await redisCmd(['HDEL', likesKey(cid), msgId]);
  }

  return {
    reactions: cur,
    // `likes` ESKİ İSTEMCİLER İÇİN. Sunucu uygulamadan önce dağıtılıyor;
    // bu alan olmasaydı güncellenmemiş kurulumlarda kalp rozeti kaybolurdu.
    likes: cur[DEFAULT_REACTION] || [],
    mine: had ? null : emoji,
  };
}
