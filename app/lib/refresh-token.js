import { randomBytes, createHash } from 'crypto';
import { redisCmd, redisGetJSON } from './redis';
import { revokeUserTokens } from './firebase-admin';

// ─────────────────────────────────────────────────────────────────────────────
// DÖNDÜRMELİ YENİLEME JETONU — yeniden kullanım tespitiyle (Aşama 2).
//
// NEDEN: Firebase yenileme jetonu SÜRESİZ ve döndürülmüyor. Çalınırsa,
// süresiz geçerli bir anahtar demek. Bu katman ARADA duruyor:
//
//   • İstemciye Firebase jetonu HİÇ verilmiyor; sunucuda (Redis) tutuluyor.
//     İstemci yalnızca BİZİM opak jetonumuzu görüyor.
//   • Her yenilemede jeton DÖNÜYOR (tek kullanımlık): eski jeton bir daha
//     çalışmıyor.
//   • YENİDEN KULLANIM TESPİTİ: döndürülmüş eski bir jeton tekrar gelirse,
//     bu ya çalınmış jetonun kullanıldığı ya da meşru jetonun sızdığı
//     anlamına gelir — o "aile"nin tamamı iptal ediliyor ve Firebase
//     jetonları da geçersiz kılınıyor (revokeUserTokens).
//
// ERİŞİM JETONU HÂLÂ FIREBASE idToken'I (1 saat). Firebase idToken süresini
// Firebase belirliyor; kısaltmak Firebase idToken'larını tümden bırakıp her
// ucun doğrulamasını değiştirmek demekti. Bu katman yenilemeyi sarıyor,
// erişim jetonunu değiştirmiyor — doğrulama yolu (mobile-auth.js) aynı kaldı.
//
// GERİYE UYUMLU: eski istemciler hâlâ Firebase yenileme jetonu saklıyor.
// `mobile-refresh` iki biçimi de kabul ediyor (bkz. o dosya) ve eski jetonu
// sessizce yeni biçime göç ettiriyor.
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = 'grt';                 // Gamerisen Refresh Token — biçim ayracı
const FAMILY_TTL_SEC = 60 * 24 * 3600; // 60 gün — sınırlı ama uzun oturum
const GRACE_MS = 30_000;              // döndürme yarışı için: eski jeton 30 sn geçerli

const famKey = (id) => `rt:${id}`;

function rnd(n = 24) {
  return randomBytes(n).toString('base64url');
}
function hash(secret) {
  return createHash('sha256').update(secret).digest('hex').slice(0, 32);
}
function sabitEsit(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

/** Bir dize bizim yenileme jetonumuz mu (yoksa eski Firebase jetonu mu)? */
export function isOurToken(token) {
  return typeof token === 'string' && token.startsWith(`${PREFIX}.`);
}

function encode(familyId, secret) {
  return `${PREFIX}.${familyId}.${secret}`;
}
function decode(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  return { familyId: parts[1], secret: parts[2] };
}

/**
 * Yeni bir jeton ailesi kurar; istemciye verilecek opak jetonu döndürür.
 * Firebase yenileme jetonu SUNUCUDA saklanıyor, istemciye gitmiyor.
 *
 * @returns istemci jetonu, ya da Redis yoksa null (çağıran eski davranışa düşer)
 */
export async function mintFamily(uid, firebaseRefresh) {
  if (!uid || !firebaseRefresh) return null;
  const familyId = rnd(18);
  const secret = rnd(24);
  const rec = {
    uid: String(uid),
    fb: firebaseRefresh,
    cur: hash(secret),
    prev: null,
    prevUntil: 0,
    gen: 1,
    createdAt: Date.now(),
  };
  const ok = await redisCmd(['SET', famKey(familyId), JSON.stringify(rec), 'EX', String(FAMILY_TTL_SEC)]);
  return ok === 'OK' ? encode(familyId, secret) : null;
}

/** Aileyi ve (mümkünse) Firebase jetonlarını iptal eder. */
async function revokeFamily(familyId, uid) {
  await redisCmd(['DEL', famKey(familyId)]).catch(() => {});
  if (uid) await revokeUserTokens(uid).catch(() => {});
}

/**
 * Jetonu DOĞRULAR, DÖNDÜRÜR ve saklanan Firebase jetonunu verir.
 *
 * @returns
 *   { ok:true, uid, firebaseRefresh, newToken }           → yenilemeye devam et
 *   { ok:false, reason:'INVALID' }                        → bilinmeyen/süresi geçmiş
 *   { ok:false, reason:'REUSE', uid }                     → aile iptal edildi
 */
export async function rotateFamily(token, newFirebaseRefresh) {
  const dec = decode(token);
  if (!dec) return { ok: false, reason: 'INVALID' };

  const rec = await redisGetJSON(famKey(dec.familyId)).catch(() => null);
  if (!rec || !rec.uid) return { ok: false, reason: 'INVALID' };

  const presented = hash(dec.secret);

  // Güncel jeton → normal yol.
  const guncel = sabitEsit(presented, rec.cur);

  // Önceki jeton, GRACE penceresi içinde → yarış (istemci yeni jetonu
  // alamadan yeniden denedi). İptal ETME; ama YENİDEN DÖNDÜRME de — aksi
  // hâlde her retry zinciri uzatır. Yeni bir jeton üretip veriyoruz ama
  // güncel gizi koruyarak (idempotent-ish): en temizi güncele eşitlemek.
  const yarisRetry = rec.prev && rec.prevUntil > Date.now() && sabitEsit(presented, rec.prev);

  if (!guncel && !yarisRetry) {
    // Ne güncel ne de grace içindeki önceki → YENİDEN KULLANIM.
    // Döndürülmüş eski bir jeton dönmüş demektir: aile ele geçirilmiş
    // sayılıyor, tamamı iptal + Firebase jetonları da iptal.
    await revokeFamily(dec.familyId, rec.uid);
    return { ok: false, reason: 'REUSE', uid: rec.uid };
  }

  // Döndür: yeni giz, önceki güncelin yerine geçiyor (grace ile).
  const yeniSecret = rnd(24);
  const yeniRec = {
    ...rec,
    fb: newFirebaseRefresh || rec.fb,
    prev: rec.cur,
    prevUntil: Date.now() + GRACE_MS,
    cur: hash(yeniSecret),
    gen: (rec.gen || 1) + 1,
  };
  await redisCmd(['SET', famKey(dec.familyId), JSON.stringify(yeniRec), 'EX', String(FAMILY_TTL_SEC)]);

  return {
    ok: true,
    uid: rec.uid,
    firebaseRefresh: rec.fb,
    newToken: encode(dec.familyId, yeniSecret),
  };
}

/** Çıkışta / hesap silmede aileyi düşür (jetonun familyId'sinden). */
export async function dropFamily(token) {
  const dec = decode(token);
  if (dec) await redisCmd(['DEL', famKey(dec.familyId)]).catch(() => {});
}
