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
export async function appendMessage({ from, to, text, media, share }) {
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
      lastKind: share ? 'reel'
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
 * Mesaj geçmişi — en yeniden eskiye.
 * @param {number} [before] bu zamandan ESKİ mesajlar (sayfalama)
 */
export async function getMessages(cid, { before, limit = PAGE } = {}) {
  // Mesajlar ve geri alınanlar TEK turda okunuyor.
  const [raw, deleted] = await redisPipeline([
    ['LRANGE', msgsKey(cid), '0', String(MAX_MESSAGES - 1)],
    ['SMEMBERS', delKey(cid)],
  ]) || [];

  if (!Array.isArray(raw)) return [];
  const gone = new Set(Array.isArray(deleted) ? deleted : []);

  let msgs = raw.map(parseJSON).filter(Boolean);
  if (before) msgs = msgs.filter((m) => m.at < before);

  return msgs.slice(0, limit).map((m) => (
    // Geri alınan mesaj LİSTEDEN ÇIKARILMIYOR, içeriği boşaltılıyor. Sıra ve
    // sayfalama bozulmasın diye: mesajı listeden silmek `before` ile yapılan
    // sayfalamayı kaydırır ve arayüzde mesaj atlanmasına yol açar.
    gone.has(m.id)
      ? { id: m.id, from: m.from, at: m.at, deleted: true }
      : m
  ));
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
