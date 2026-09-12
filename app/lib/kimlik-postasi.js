// ─────────────────────────────────────────────────────────────────────────────
// MARKALI KİMLİK POSTASI — bağlantıyı biz üretip postayı biz gönderiyoruz
//
// NEDEN VAR. Doğrulama ve sıfırlama postalarını Firebase gönderiyordu; içeriği
// Firebase Console'daki şablonlarda duruyordu, yani bizim elimizde değildi.
// O düzenleyici bu projede KİLİTLİ ("Email template updates are currently
// unavailable for this project"), dolayısıyla markalı posta için tek yol bu.
//
// ── HER ŞEY İSTEĞE BAĞLI, HİÇBİRİ ZORUNLU DEĞİL ────────────────────────────
// İki ön koşul var (Admin SDK servis hesabı + Resend anahtarı) ve ikisi de
// yoksa bu modül `false` dönüyor; çağıran Firebase'in kendi gönderimine
// düşüyor. Markalı posta bir İYİLEŞTİRME — yokluğunda kullanıcı daha az güzel
// bir posta alır, kayıt olamamazlık etmez.
//
// ── firebase-admin TEMBEL YÜKLENİYOR ───────────────────────────────────────
// Bu bilinçli ve bugün ödenmiş bir dersin sonucu: `firebase-admin`i modül
// düzeyinde içe aktaran üç uç (mobile-login, mobile-refresh, mobile-logout)
// Vercel'de modül yüklemede 500 döndü — istek koda hiç giremedi. O paketi
// `register` ucuna modül düzeyinde eklemek, aynı arızayı KAYIT ucuna da
// bulaştırmak olurdu. `await import()` ile yüklenince, yükleme başarısız olsa
// bile yalnızca markalı posta devre dışı kalıyor.
// ─────────────────────────────────────────────────────────────────────────────

import { postaGonder, postaYapilandirildiMi } from './posta';
import { dogrulamaPostasi, sifreSifirlamaPostasi } from './posta-sablonlari';

/**
 * Admin Auth örneğini TEMBEL getirir.
 * @returns {Promise<object|null>} yapılandırılmamış ya da yüklenemiyorsa null.
 */
async function adminGetir() {
  try {
    const mod = await import('./firebase-admin');
    return mod.adminAuth?.() || null;
  } catch (e) {
    console.error('[kimlik-postasi] firebase-admin yüklenemedi:', e?.message || e);
    return null;
  }
}

/**
 * Ortak akış: bağlantıyı üret → şablonu kur → gönder.
 *
 * @param {string} email
 * @param {'tr'|'en'} dil
 * @param {'dogrulama'|'sifirlama'} tur
 * @returns {Promise<boolean>} markalı posta gerçekten gittiyse true.
 */
async function gonder(email, dil, tur) {
  // ÖNCE UCUZ KONTROL: Resend anahtarı yoksa Admin SDK'yı hiç yüklemiyoruz.
  // Yükleme maliyeti boşa gitmesin ve ortada işe yaramayacak bir bağlantı
  // üretilmesin.
  if (!postaYapilandirildiMi() || !email) return false;

  const admin = await adminGetir();
  if (!admin) return false;

  let baglanti;
  try {
    // Bağlantı projenin YAPILANDIRILMIŞ action URL'ine işaret ediyor; o adres
    // zaten gamerisen.com/auth/action (kullanıcı oraya iniyor). Buraya ayrıca
    // `url` vermiyoruz: o alan "devam adresi", eylem adresi değil — karıştırmak
    // kullanıcıyı doğrulamadan önce başka yere atardı.
    baglanti = tur === 'dogrulama'
      ? await admin.generateEmailVerificationLink(email)
      : await admin.generatePasswordResetLink(email);
  } catch (e) {
    // Kullanıcı yoksa, adres geçersizse ya da Admin yetkisi yetmiyorsa buraya
    // düşüyoruz. E-POSTA ADRESİ LOGLANMIYOR.
    console.error(`[kimlik-postasi] ${tur} bağlantısı üretilemedi:`, e?.message || e);
    return false;
  }

  const { konu, html, metin } = tur === 'dogrulama'
    ? dogrulamaPostasi(baglanti, dil)
    : sifreSifirlamaPostasi(baglanti, dil);

  return postaGonder({ alici: email, konu, html, metin });
}

/** @returns {Promise<boolean>} markalı doğrulama postası gittiyse true. */
export function markaliDogrulamaGonder(email, dil = 'tr') {
  return gonder(email, dil, 'dogrulama');
}

/** @returns {Promise<boolean>} markalı sıfırlama postası gittiyse true. */
export function markaliSifirlamaGonder(email, dil = 'tr') {
  return gonder(email, dil, 'sifirlama');
}
