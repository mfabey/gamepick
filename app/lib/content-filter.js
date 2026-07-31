// ─────────────────────────────────────────────────────────────────────────────
// İçerik süzgeci — App Store Guideline 1.2'nin birinci şartı
// ("uygunsuz içeriği süzme yöntemi").
//
// Kullanıcı adları, liste adları ve serbest metinlerde kullanılır.
//
// TASARIM NOTU: Kelime listesi tek başına yetmez, çünkü kullanıcılar kaçınma
// yöntemleri kullanır (leet: 4=a, 0=o · harf tekrarı: "sikkkk" · araya
// noktalama). Bu yüzden metin ÖNCE normalize edilir, sonra eşleştirilir.
// Aşırı agresif olmamak da önemli: "assassin" içinde "ass" geçtiği için
// engellenmemeli — bu yüzden kısa kelimeler yalnızca TAM eşleşmede yakalanır.
// ─────────────────────────────────────────────────────────────────────────────

const TR_MAP = { 'ı': 'i', 'İ': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c', 'â': 'a', 'î': 'i', 'û': 'u' };
const LEET = { '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '5': 's', '$': 's', '7': 't' };

function baseNormalize(input, leetMode) {
  let s = String(input).toLowerCase();
  s = s.replace(/[ıİğüşöçâîû]/g, (c) => TR_MAP[c] || c);

  // leetMode 'substitute': 4 → a   ·   'delete': 4 → (silinir)
  s = leetMode === 'delete'
    ? s.replace(/[4@31!05$7]/g, '')
    : s.replace(/[4@31!05$7]/g, (c) => LEET[c] || c);

  // Harf dışı her şeyi at (araya konan nokta/alt çizgi kaçışını kapatır)
  s = s.replace(/[^a-z]/g, '');

  // Üç ve daha fazla tekrarı ikiye indir ("siiiik" → "siik"), sonra tam tekrarları tekile
  return s.replace(/(.)\1{2,}/g, '$1$1').replace(/(.)\1/g, '$1');
}

/** Türkçe sadeleştirme + leet ikamesi + tekrar kırpma. */
export function normalizeForMatch(input = '') {
  return baseNormalize(input, 'substitute');
}

/**
 * Eşleştirmede DENENECEK tüm varyantlar.
 *
 * Neden iki varyant: "sh1t" karakter İKAMESİ (1→i) ile yakalanır, ama "fu4ck"
 * araya karakter EKLEME'dir — ikame "fuack" üretir ve eşleşmez. Leet
 * karakterlerini silen ikinci varyant "fuck" üretip yakalar.
 */
function matchVariants(input) {
  const sub = baseNormalize(input, 'substitute');
  const del = baseNormalize(input, 'delete');
  return sub === del ? [sub] : [sub, del];
}

// Nerede geçerse geçsin engellenecekler (uzun ve belirgin ifadeler)
const SUBSTRING_BLOCK = [
  // TR
  'amcik', 'amk', 'orospu', 'piclik', 'yarrak', 'gotveren', 'ibne', 'pezevenk',
  'sikeyim', 'sikerim', 'siktir', 'anasini', 'ananisikeyim', 'oglusipsi',
  // EN
  'fuck', 'shit', 'bitch', 'cunt', 'whore', 'slut', 'rape', 'nigger', 'faggot',
  'pedophile', 'childporn', 'nazi', 'hitler',
];

// Yalnızca TAM eşleşmede engellenecekler (kısa/masum kelimelerin içinde geçebilir)
const EXACT_BLOCK = [
  'ass', 'sik', 'got', 'am', 'oc', 'pic', 'sex', 'porn', 'anal', 'dick', 'cock', 'penis', 'vagina',
];

// Kimlik taklidi ve sistem çakışmasını önleyen rezerve adlar
const RESERVED = [
  'admin', 'administrator', 'root', 'system', 'support', 'help', 'moderator', 'mod',
  'gamerisen', 'official', 'staff', 'team', 'security', 'billing', 'payment',
  'apple', 'google', 'steam', 'epic', 'valve', 'xbox', 'playstation', 'nintendo',
  'null', 'undefined', 'anonymous', 'deleted', 'me', 'you', 'everyone', 'all',
];

// Yasaklı bir parçayı masumca içeren gerçek kelimeler ("Scunthorpe problemi").
// Engelleme listesini zayıflatmak yerine bilinen istisnaları burada tutuyoruz.
const ALLOWLIST = [
  'scunthorpe', 'penistone', 'lightwater', 'shitake', 'shiitake',
  'cockpit', 'cocktail', 'peacock', 'hancock', 'badcock',
  'assassin', 'assassins', 'bassist', 'classic', 'analyst', 'analysis',
  'sussex', 'essex', 'middlesex',
];

/**
 * Metin uygunsuz mu?
 * @returns {{ blocked: boolean, reason?: 'profanity'|'reserved' }}
 */
export function checkText(input = '') {
  const variants = matchVariants(input).filter(Boolean);
  if (variants.length === 0) return { blocked: false };

  // Herhangi bir varyant bilinen istisnaysa geç
  if (variants.some((v) => ALLOWLIST.some((w) => normalizeForMatch(w) === v))) {
    return { blocked: false };
  }

  for (const norm of variants) {
    for (const w of SUBSTRING_BLOCK) {
      if (norm.includes(normalizeForMatch(w))) return { blocked: true, reason: 'profanity' };
    }
    for (const w of EXACT_BLOCK) {
      if (norm === normalizeForMatch(w)) return { blocked: true, reason: 'profanity' };
    }
  }
  return { blocked: false };
}

/** Rezerve ad mı? (kimlik taklidi koruması) */
export function isReserved(input = '') {
  const norm = normalizeForMatch(input);
  return RESERVED.some((r) => normalizeForMatch(r) === norm);
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

/**
 * Kullanıcı adı doğrulaması — biçim + rezerve + uygunsuz içerik.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateUsername(input = '') {
  const raw = String(input).trim();

  if (!USERNAME_RE.test(raw)) {
    return { ok: false, error: 'USERNAME_FORMAT' };   // 3-20, harf/rakam/alt çizgi
  }
  if (/^_+$/.test(raw) || /^[0-9]+$/.test(raw)) {
    return { ok: false, error: 'USERNAME_FORMAT' };   // yalnızca _ veya yalnızca rakam olmasın
  }
  if (isReserved(raw)) {
    return { ok: false, error: 'USERNAME_RESERVED' };
  }
  if (checkText(raw).blocked) {
    return { ok: false, error: 'USERNAME_INAPPROPRIATE' };
  }
  return { ok: true };
}

/**
 * Serbest metin (liste adı, açıklama) doğrulaması.
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateFreeText(input = '', { maxLength = 200 } = {}) {
  const raw = String(input).trim();
  if (!raw) return { ok: false, error: 'TEXT_EMPTY' };
  if (raw.length > maxLength) return { ok: false, error: 'TEXT_TOO_LONG' };
  if (checkText(raw).blocked) return { ok: false, error: 'TEXT_INAPPROPRIATE' };
  return { ok: true };
}
