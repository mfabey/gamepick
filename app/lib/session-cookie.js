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

// GELİŞTİRMEDE FALLBACK, ÜRETİMDE ZORUNLU. `auth-config.js`'teki
// `canUseAuthMock` ile aynı kalıp: SESSION_SECRET olmadan yerel geliştirme
// çalışmaya devam etsin diye sabit bir dev sırrı var, ama ÜRETİMDE fallback
// YOK — orada gerçek sır tanımlı değilse imzalama da doğrulama da yapılmıyor
// ve oturum kurulamıyor (imzasız çereze geri düşmek açığı geri açardı).
//
// Dev sırrı GİZLİ DEĞİL, olması da gerekmiyor: yerelde çerez bir güvenlik
// sınırı değil. Kaynağa yazılı olması bilinçli.
const DEV_FALLBACK = 'gamerisen-dev-only-insecure-session-key';

function secretOrNull() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== 'production') return DEV_FALLBACK;
  return null;
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
 * HERHANGİ bir JSON değerini (nesne VEYA dizi) imzalar.
 *
 * Değer `{ v, exp }` zarfının İÇİNE konuyor, spread EDİLMİYOR: `gp_steam_accounts`
 * bir DİZİ ve `{...dizi, exp}` diziyi bozardı. Zarf her tipi taşıyor.
 *
 * @returns imzalı çerez değeri, ya da sır yoksa null (üretimde yapılandırma
 *          eksikliği; çağıran bunu 503'e çevirmeli)
 */
export async function signValue(value, ttlSec) {
  if (!canSignSessions()) return null;
  const zarf = { v: value, exp: Math.floor(Date.now() / 1000) + ttlSec };
  const veri = b64urlEncode(JSON.stringify(zarf));
  return `${veri}.${await hmac(veri)}`;
}

/**
 * İmzalı çerezi okur ve DOĞRULAR.
 *
 * @returns içteki değer (nesne/dizi), ya da imza/süre geçersizse null.
 *
 * İMZASIZ ESKİ ÇEREZLER REDDEDİLİR → mevcut oturumlar bir kez düşer,
 * kullanıcılar yeniden giriş yapar. Bilinçli: imzasız çerezi geçiş süresince
 * kabul etmek, açığı o süre boyunca açık tutmak demekti.
 */
export async function readValue(raw) {
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
    const zarf = JSON.parse(b64urlDecode(veri));
    if (!zarf || typeof zarf !== 'object') return null;
    // SÜRE SUNUCUDA UYGULANIYOR — çerezin maxAge'ı tek başına yeterli değil.
    if (typeof zarf.exp !== 'number' || zarf.exp * 1000 < Date.now()) return null;
    return zarf.v ?? null;
  } catch {
    return null;
  }
}

// ── Oturum ömürleri ─────────────────────────────────────────────────────────
//
// `gp_user_session` çerezi 7 GÜN. Çerezin `maxAge`ı ile gövdedeki `exp` AYNI
// değeri kullanıyor ki tarayıcı ve sunucu aynı anda unutsun.
//
// AMA ETKİN WEB OTURUMU 30 GÜNE KADAR — BİLİNÇLİ KARAR (2026-09-03).
// `gp_steam_session` 30 gün yaşıyor ve `auth/user-me`'deki otomatik giriş
// yedeği onu `steam_to_uid` ile çözüp TAM OTURUMU geri yüklüyor. Yani Steam
// bağlamış bir kullanıcı, 7 günlük oturum çerezi düşse bile 30 güne kadar
// giriş yapmış kalıyor. Bu bir gözden kaçma DEĞİL: kalıcılık istendi,
// alternatifi (7 güne hizalamak) değerlendirildi ve REDDEDİLDİ.
//
// Güvenlik dayanağı: `gp_steam_session` İMZALI (readValue) ve httpOnly —
// sahtelenemiyor, XSS ile çalınamıyor. Yani 30 günlük kimlik penceresi
// yalnızca çerezin fiziksel kopyalanmasıyla sömürülebilir, uzaktan değil.
//
// "Bağlantı çerezleri kimlik değil" DİYE OKUMAYIN: otomatik giriş yedeği
// yüzünden pratikte kimlik geri yükleyiciler. Kısaltmak istenirse iş iki
// yerde: bu sabit VE user-me'deki yedeği kaldırmak/kısıtlamak.
export const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
export const LINK_TTL_SEC = 60 * 60 * 24 * 30;
