// ─────────────────────────────────────────────────────────────────────────────
// Kart imzalama — paylaşılan görselin parametrelerini bağlar.
//
// NEDEN GEREKLİ: kart görseli KİMLİK DOĞRULAMASIZ olmak zorunda. Paylaşılan
// bağlantıyı karşı taraf açacak; Bearer belirteci isteyen bir URL paylaşılamaz.
// Ama parametreler serbest bırakılırsa uç, Gamerisen markasıyla istediğini
// yazdırabileceğin açık bir görsel üretecine dönüşür — birinin adıyla uydurma
// bir "10.000 saat" kartı basmak dahil.
//
// İmza bunu kapatıyor: kartı yalnızca bizim sunucumuz basabilir.
//
// WEB CRYPTO kullanılıyor (node:crypto DEĞİL): görsel ucu edge çalışma
// zamanında koşabilsin diye. node:crypto orada yok.
//
// KISALTMA: imza 16 karaktere kırpılıyor (~96 bit). Tehdit modeli "rastgele
// deneyerek geçerli kart uydurmak"; 96 bit bunun için fazlasıyla yeterli ve
// URL paylaşılabilir uzunlukta kalıyor.
// ─────────────────────────────────────────────────────────────────────────────

const SIG_LEN = 16;

function secretOrNull() {
  const s = process.env.CARD_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** Sır tanımlı mı? Uçlar buna göre KAPALI hâlde başarısız oluyor. */
export function canSignCards() {
  return secretOrNull() !== null;
}

/**
 * Parametreleri sıraya bağımsız, kararlı bir dizgeye çevirir.
 * `sig` alanı hesaba KATILMAZ (kendini imzalayamaz).
 */
function canonical(params) {
  return Object.keys(params)
    .filter((k) => k !== 'sig')
    .sort()
    .map((k) => `${k}=${params[k] ?? ''}`)
    .join('&');
}

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(message) {
  const secret = secretOrNull();
  if (!secret) throw new Error('CARD_SECRET tanımlı değil');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return b64url(sig).slice(0, SIG_LEN);
}

/** @returns {Promise<string>} imza */
export async function signCard(params) {
  return hmac(canonical(params));
}

/**
 * İmzayı doğrular.
 *
 * SABİT SÜRELİ karşılaştırma: erken çıkan bir `===` karşılaştırması, doğru
 * önekin uzunluğunu süreden sızdırır ve imza karakter karakter tahmin
 * edilebilir hâle gelir.
 */
export async function verifyCard(params) {
  if (!canSignCards()) return false;
  const given = String(params.sig || '');
  if (given.length !== SIG_LEN) return false;

  const want = await hmac(canonical(params));
  let diff = 0;
  for (let i = 0; i < SIG_LEN; i++) diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
