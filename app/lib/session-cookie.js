// ─────────────────────────────────────────────────────────────────────────────
// OTURUM ÇEREZİ İMZALAMA.
//
// NEDEN GEREKLİ: `gp_user_session` İMZASIZ JSON'du ve kimlik doğrudan ondan
// okunuyordu:
//
//     const session = cookieStore.get('gp_user_session');
//     user = JSON.parse(session.value);      // uid buradan, doğrulama YOK
//
// `httpOnly` yalnızca TARAYICIDAKİ JavaScript'i engelliyor; HTTP isteğini
// elle kuran birini engellemiyor. Yani `curl -H 'Cookie: gp_user_session=
// {"uid":"<kurban>"}'` o kullanıcı gibi davranıyordu.
//
// İKİNCİ YOL: `gp_steam_session` de imzasızdı ve `auth/user-me` içindeki
// otomatik giriş yedeği, çerezdeki `steamId`yi `steam_to_uid` ile uid'e
// çevirip TAM OTURUMU geri yüklüyordu. Steam ID'ler profil adresinde açık
// duruyor — yani bu yol için kurbanın uid'ini bilmeye bile gerek yoktu.
//
// ULAŞILABİLDİĞİ YERLER (ölçüldü): user-me kurbanın bağlı Steam/Xbox
// hesabını döndürüyordu; logout ve steam-remove o bağlantıları
// siliyor/değiştiriyordu; steam/xbox callback'leri saldırganın hesabını
// kurbanın uid'ine bağlayabiliyordu.
//
// SINIRLI KALAN KISIM: sosyal katman (mesaj, gönderi, arkadaş) bu çerezi
// HİÇ kullanmıyor — orası `verifyMobileToken` ile gerçek Firebase JWT
// doğrulaması yapıyor. Parola değiştirme ve hesap silme de parola istediği
// için sahte çerezle geçilemiyordu.
//
// ── ÇÖZÜM ───────────────────────────────────────────────────────────────
// Gövde + HMAC-SHA256 imzası. `card-sign.js` ile aynı desen ve aynı sebeple
// Web Crypto: edge çalışma zamanında `node:crypto` yok.
//
// SÜRE GÖVDEDE: çerezin `maxAge`ı yalnızca tarayıcıya bir öneri; isteği elle
// kuran onu yok sayar. `exp` alanı sunucuda kontrol ediliyor, yani oturum
// ömrü artık gerçekten uygulanıyor.
//
// KAPALI BAŞARISIZ OLUR: `SESSION_SECRET` yoksa imza da doğrulama da
// yapılamıyor ve oturum kurulmuyor. Sırrın yokluğunda imzasız çereze geri
// düşmek, kapatılan açığı geri açmak olurdu.
// ─────────────────────────────────────────────────────────────────────────────

const SIG_LEN = 32; // ~192 bit — çerezi şişirmeden fazlasıyla yeterli

function secretOrNull() {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

/** Sır tanımlı mı? Uçlar buna göre KAPALI hâlde başarısız oluyor. */
export function canSignSessions() {
  return secretOrNull() !== null;
}

function b64urlEncode(str) {
  return Buffer.from(str, 'utf8').toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

async function hmac(message) {
  const secret = secretOrNull();
  if (!secret) throw new Error('SESSION_SECRET tanımlı değil');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Buffer.from(sig).toString('base64url').slice(0, SIG_LEN);
}

/** Zamanlama saldırısına kapalı karşılaştırma. */
function sabitZamanEsit(a, b) {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/**
 * Oturum gövdesini imzalar.
 * @param payload   çereze konacak nesne (uid, name, email…)
 * @param ttlSec    oturum ömrü (saniye)
 * @returns imzalı çerez değeri, ya da sır yoksa null
 */
export async function signSession(payload, ttlSec) {
  if (!canSignSessions()) return null;
  const gövde = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const veri = b64urlEncode(JSON.stringify(gövde));
  return `${veri}.${await hmac(veri)}`;
}

/**
 * İmzalı çerezi okur ve DOĞRULAR.
 *
 * @returns gövde nesnesi, ya da imza/süre geçersizse null.
 *
 * İMZASIZ ESKİ ÇEREZLER REDDEDİLİR. Bu, mevcut oturumları düşürüyor —
 * kullanıcılar bir kez yeniden giriş yapacak. Bilinçli: imzasız çerezi
 * geçiş süresince kabul etmek, açığı o süre boyunca açık tutmak demekti.
 */
export async function readSession(raw) {
  if (!raw || !canSignSessions()) return null;
  const nokta = raw.lastIndexOf('.');
  if (nokta < 1) return null; // imzasız (eski biçim) → reddet

  const veri = raw.slice(0, nokta);
  const imza = raw.slice(nokta + 1);

  let beklenen;
  try {
    beklenen = await hmac(veri);
  } catch {
    return null;
  }
  if (!sabitZamanEsit(imza, beklenen)) return null;

  try {
    const gövde = JSON.parse(b64urlDecode(veri));
    if (!gövde || typeof gövde !== 'object') return null;
    // SÜRE SUNUCUDA UYGULANIYOR — çerezin maxAge'ı tek başına yeterli değil.
    if (typeof gövde.exp !== 'number' || gövde.exp * 1000 < Date.now()) return null;
    return gövde;
  } catch {
    return null;
  }
}

// ── Oturum ömürleri ─────────────────────────────────────────────────────────
//
// Web oturumu 7 GÜN: mevcut davranış korundu. Oyun keşif sitesi için makul —
// bankacılık değil, ama süresiz de değil. Çerezin `maxAge`ı ile gövdedeki
// `exp` AYNI değeri kullanıyor ki tarayıcı ve sunucu aynı anda unutsun.
//
// Bağlantı çerezleri (Steam/Xbox) 30 GÜN: bunlar kimlik değil, "hangi
// hesabı bağladın" bilgisi; daha uzun yaşamaları kabul edilebilir.
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
export const LINK_TTL_SEC = 60 * 60 * 24 * 30;
