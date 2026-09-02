// ─────────────────────────────────────────────────────────────────────────────
// LOG MASKELEME.
//
// DENETİM SONUCU (2026-09-03): şu an loglara hassas veri YAZILMIYOR.
// 111 `console.*` çağrısının tamamı tarandı; şifre, jeton, doğrulama kodu
// (`oobCode`) ve e-posta değerlerinin hiçbiri loglanmıyor — eşleşmelerin
// hepsi mesaj metnindeki kelimelerdi ("...Simulating password change").
// Ham istek gövdesi loglayan yer yok, istek loglayan ara katman yok,
// analiz/telemetri katmanı hiç yok.
//
// BU DOSYA ÖNLEYİCİ. Bir sonraki hata ayıklama seansında birinin
// `console.log('body:', body)` yazması an meselesi; o satırın maskeden
// geçmesi için hazır bir yol olsun diye duruyor. `api-error.js` bağlam
// verisi loglarken bunu kullanıyor.
//
// MASKE BİÇİMİ: ilk 4 karakter + "…". Teşhis için yeterli (hangi jeton,
// hangi e-posta olduğunu ayırt etmeye yetiyor), yeniden kullanıma yetmiyor.
// 4 karakterden kısa değerler TÜMDEN gizleniyor — "ab…" zaten değerin
// yarısını vermek olurdu.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maskelenecek alan adları. Karşılaştırma küçük harfe indirilip
 * ALT DİZE olarak yapılıyor: `idToken`, `refreshToken`, `accessToken` ve
 * `token` tek kuralla yakalanıyor.
 */
const HASSAS_ALANLAR = [
  'password', 'passwd', 'sifre', 'newpassword', 'currentpassword',
  'token', 'idtoken', 'refreshtoken', 'accesstoken', 'bearer',
  'secret', 'apikey', 'api_key', 'key',
  'oobcode', 'code', 'otp', 'verificationcode',
  'email', 'eposta', 'mail',
  'phone', 'telefon', 'tel',
  'card', 'cardnumber', 'cvv', 'iban', 'pan',
  'tckn', 'nationalid', 'kimlik',
  'address', 'adres',
  'authorization', 'cookie', 'setcookie',
];

function hassasMi(alanAdi) {
  const a = String(alanAdi).toLowerCase();
  return HASSAS_ALANLAR.some((h) => a.includes(h));
}

/**
 * Tek bir değeri maskeler: ilk 4 karakter + "…".
 * 4 karakterden kısaysa tümden gizler.
 */
export function maskele(deger) {
  if (deger === null || deger === undefined) return deger;
  const s = String(deger);
  if (s.length === 0) return s;
  if (s.length <= 4) return '…';
  return `${s.slice(0, 4)}…`;
}

/**
 * Nesneyi derinlemesine dolaşıp hassas alanları maskeler.
 *
 * DÖNGÜ KORUMASI var: kendine referans veren nesne (ör. bir hata nesnesinin
 * `cause` zinciri) sonsuz özyinelemeye girerdi.
 *
 * DERİNLİK SINIRI var: log satırının kontrolsüz büyümesini engelliyor.
 */
export function maskeliKopya(girdi, { maxDerinlik = 4 } = {}) {
  const görülen = new WeakSet();

  function gez(deger, derinlik) {
    if (deger === null || typeof deger !== 'object') return deger;
    if (derinlik > maxDerinlik) return '[derinlik sınırı]';
    if (görülen.has(deger)) return '[döngüsel]';
    görülen.add(deger);

    if (Array.isArray(deger)) {
      // Diziler kırpılıyor: 20 kayıtlık bir gövde log satırını şişirir.
      return deger.slice(0, 20).map((v) => gez(v, derinlik + 1));
    }

    const çıktı = {};
    for (const [k, v] of Object.entries(deger)) {
      çıktı[k] = hassasMi(k)
        ? maskele(typeof v === 'object' ? JSON.stringify(v) : v)
        : gez(v, derinlik + 1);
    }
    return çıktı;
  }

  return gez(girdi, 0);
}

/**
 * Log satırına konmaya hazır, maskelenmiş tek satırlık dizge.
 * Serileştirilemeyen girdide patlamıyor — log yüzünden istek düşmemeli.
 */
export function maskeliJSON(girdi) {
  try {
    return JSON.stringify(maskeliKopya(girdi));
  } catch {
    return '[serileştirilemedi]';
  }
}
