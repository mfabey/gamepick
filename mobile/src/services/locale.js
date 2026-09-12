import { NativeModules, Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Cihaz dili → uygulama dili.
//
// `expo-localization` KULLANILMIYOR: native modül, kurmak yeni build demek.
// Aynı bilgi React Native çekirdeğindeki `SettingsManager` üzerinden geliyor
// (iOS'ta NSUserDefaults sözlüğünü olduğu gibi veriyor, içinde `AppleLocale`
// ve `AppleLanguages` var) — binary'de zaten mevcut, OTA korunuyor.
//
// ÜÇ KADEMELİ OKUMA. Tek kaynağa güvenmek riskli: `AppleLocale` bazı
// cihazlarda bölge biçiminde ("en_US"), bazılarında yok; `AppleLanguages`
// dizisi ise dil etiketi veriyor ("pt-BR"). Hermes'in `Intl`'i de üçüncü
// yedek — hepsi düşerse İngilizce.
//
// BÖLGE DEĞİL DİL BAKILIYOR. Kullanıcının cihazı nerede satın alındığı değil,
// hangi dile ayarlandığı önemli: Almanya'da yaşayan Türk kullanıcı cihazını
// Türkçe kullanıyorsa Türkçe görmeli.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Uygulamanın konuştuğu diller — TEK KAYNAK.
 *
 * Ad her dilin KENDİ dilinde yazılı: kullanıcı uygulamayı anlamadığı bir
 * dilde açtığında aradığı satırı ancak böyle bulabiliyor.
 *
 * SIRA: önce cihaz diline en olası adaylar değil, konuşmacı sayısı.
 * Seçici bu sırayla çiziliyor.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English',   bcp47: 'en-US' },
  { code: 'es', name: 'Español',   bcp47: 'es-ES' },
  { code: 'pt', name: 'Português', bcp47: 'pt-BR' },
  { code: 'de', name: 'Deutsch',   bcp47: 'de-DE' },
  { code: 'tr', name: 'Türkçe',    bcp47: 'tr-TR' },
];

export const SUPPORTED = LANGUAGES.map((l) => l.code);
export const DEFAULT_LANG = 'en';

/**
 * Uygulamanin secili dilinin BCP-47 etiketi.
 *
 * NEDEN VAR. `toLocaleString` / `toLocaleDateString` ARGUMANSIZ cagrilmamali:
 * o hal CIHAZIN dilini kullaniyor, uygulamanin secili dilini degil. Olculdu
 * (2026-09-05, Android 16, cihaz en-US, Hermes uzerinde dogrudan):
 *   (1234567).toLocaleString()        -> '1,234,567'   (cihaz dili)
 *   (1234567).toLocaleString('tr-TR') -> '1.234.567'   (dogrusu)
 * Turkce secili bir kullanici, telefonu Ingilizceyse yanlis ayraci goruyordu.
 *
 * `lang === 'tr' ? 'tr-TR' : 'en-US'` kestirmesi de YETMIYOR: de/es/pt de
 * binlik ayraci olarak nokta kullaniyor, en-US virgul. Etiket dil tablosunda
 * durmali.
 */
export function bcp47(code) {
  return LANGUAGES.find((l) => l.code === code)?.bcp47 ?? 'en-US';
}

/**
 * Cihazın dil etiketlerini okur — en tercih edilenden aşağıya.
 * @returns {string[]} ör. ['pt-BR', 'en-US']
 */
function deviceTags() {
  const out = [];
  try {
    const sm = NativeModules.SettingsManager?.settings;
    if (Platform.OS === 'ios' && sm) {
      // Kullanıcının tercih SIRASI burada; ilk eşleşen kazanıyor.
      if (Array.isArray(sm.AppleLanguages)) out.push(...sm.AppleLanguages);
      if (sm.AppleLocale) out.push(sm.AppleLocale);
    }
    const i18n = NativeModules.I18nManager?.localeIdentifier;
    if (i18n) out.push(i18n);
  } catch { /* native modül yok — yedeklere düşülüyor */ }

  try {
    const intl = Intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    if (intl) out.push(intl);
  } catch { /* Hermes'te Intl kapalı olabilir */ }

  return out.filter(Boolean).map(String);
}

/**
 * Tek bir dil etiketini desteklenen bir dile eşler.
 *
 * YALNIZCA BİRİNCİL ALT ETİKETE bakılıyor: `pt-BR`, `pt-PT` ve `pt` aynı
 * sözlüğe düşüyor. Portekizce çevirimiz Brezilya ağırlıklı ama Portekiz'deki
 * bir kullanıcıya İngilizce göstermek, aksanı farklı bir Portekizce
 * göstermekten kötü.
 *
 * @returns {string|null} desteklenen dil veya eşleşme yoksa null
 */
export function matchLanguage(tag) {
  if (!tag) return null;
  // "pt_BR", "pt-BR", "pt" → "pt"
  const birincil = String(tag).replace('_', '-').split('-')[0].toLowerCase();
  return SUPPORTED.includes(birincil) ? birincil : null;
}

/**
 * Cihaza en uygun dil. Hiçbiri tutmazsa İngilizce.
 *
 * Bu, kullanıcının AÇIK TERCİHİ değil yalnızca ilk açılış tahmini —
 * kullanıcı ayarlardan başka bir dil seçerse o kaydediliyor ve bu fonksiyon
 * bir daha çağrılmıyor (bkz. LanguageContext).
 */
export function detectLanguage() {
  for (const tag of deviceTags()) {
    const m = matchLanguage(tag);
    if (m) return m;
  }
  return DEFAULT_LANG;
}
