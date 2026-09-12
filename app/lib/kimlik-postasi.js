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

// Bağlantının kurulacağı taban. posta-sablonlari.js'teki SITE ile aynı olmalı;
// biri değişip öteki kalırsa posta bir adrese, bağlantı başka adrese bakar.
const SITE = 'https://www.gamerisen.com';

/**
 * Admin Auth örneğini TEMBEL getirir.
 * @returns {Promise<object|null>} yapılandırılmamış ya da yüklenemiyorsa null.
 */
async function adminGetir() {
  let mod;
  try {
    mod = await import('./firebase-admin');
  } catch (e) {
    // PAKET YÜKLENEMEDİ — servis hesabının olup olmamasıyla ilgisi yok.
    //
    // HATA METNİ DE TAŞINIYOR. "Yüklenemedi" tek başına iki hipotezi elemeye
    // yetmedi (paketleme beyanı ve Node sürümü denendi, ikisi de tutmadı);
    // Node'un kendi cümlesi ("Cannot find package X", "ERR_REQUIRE_ESM" vb.)
    // hangisinin doğru olduğunu tek seferde söylüyor. Uzunluk sınırlı: yığın
    // izinin tamamı yanıta girmemeli.
    console.error('[kimlik-postasi] firebase-admin yüklenemedi:', e?.message || e);
    return {
      admin: null,
      sebep: 'admin-yuklenemedi',
      hata: `${e?.code || ''} ${e?.message || e}`.trim().slice(0, 300),
    };
  }
  const admin = mod.adminAuth?.() || null;
  // AYRIM ÖNEMLİ: paket yüklendi ama `adminAuth()` null döndüyse sorun
  // FIREBASE_SERVICE_ACCOUNT'ta (yok ya da bozuk JSON). İkisini tek bir
  // "olmadı"ya indirmek, hangisini düzelteceğimizi bilinmez kılıyordu.
  return { admin, sebep: admin ? null : 'admin-yapilandirilmamis' };
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
  if (!email) return { ok: false, sebep: 'adres-yok' };
  if (!postaYapilandirildiMi()) return { ok: false, sebep: 'resend-anahtari-yok' };

  const { admin, sebep: adminSebep, hata: adminHata } = await adminGetir();
  if (!admin) return { ok: false, sebep: adminSebep, hata: adminHata };

  let baglanti;
  try {
    const ham = tur === 'dogrulama'
      ? await admin.generateEmailVerificationLink(email)
      : await admin.generatePasswordResetLink(email);

    // ── BAĞLANTI KENDİ ADRESİMİZE YENİDEN KURULUYOR ────────────────────────
    //
    // Admin SDK'nın ürettiği adres, projenin Firebase Console'da
    // YAPILANDIRILMIŞ action URL'ine işaret ediyor — bu projede o ayar
    // `firebaseapp.com/__/auth/action`, yani Firebase'in kendi sayfası. Sonuç:
    // kullanıcı bizim tasarladığımız doğrulama sayfasını hiç görmüyor.
    //
    // O ayarı değiştirmek Console'daki Templates panelinden yapılıyor ve
    // BU PROJEDE KİLİTLİ ("Email template updates are currently unavailable").
    // Yani ayarla düzeltilemiyor.
    //
    // NEDEN YENİDEN KURMAK GÜVENLİ: `/api/auth/action` `oobCode`'u doğrudan
    // Firebase REST ile doğruluyor (`accounts:update` / `accounts:resetPassword`).
    // Kodun hangi adresten geldiğinin hiçbir önemi yok — doğrulama Firebase'de
    // yapılıyor, bizim sayfamız yalnızca kodu taşıyor. Kodun kendisi tek
    // kullanımlık ve süreli; taşıyıcı adresi değiştirmek güvenliği zayıflatmıyor.
    const u = new URL(ham);
    const oobCode = u.searchParams.get('oobCode');
    if (!oobCode) throw new Error('uretilen baglantida oobCode yok');

    const mod = tur === 'dogrulama' ? 'verifyEmail' : 'resetPassword';
    baglanti = `${SITE}/auth/action?mode=${mod}&oobCode=${encodeURIComponent(oobCode)}`;
  } catch (e) {
    // Kullanıcı yoksa, adres geçersizse ya da Admin yetkisi yetmiyorsa buraya
    // düşüyoruz. E-POSTA ADRESİ LOGLANMIYOR.
    console.error(`[kimlik-postasi] ${tur} bağlantısı üretilemedi:`, e?.message || e);
    return { ok: false, sebep: 'baglanti-uretilemedi' };
  }

  const { konu, html, metin } = tur === 'dogrulama'
    ? dogrulamaPostasi(baglanti, dil)
    : sifreSifirlamaPostasi(baglanti, dil);

  // `.ok` ŞART: `postaGonder` artık `{ok, hata}` nesnesi dönüyor (her zaman
  // truthy). Doğrudan koşula konsaydı her gönderim başarılı sayılırdı.
  const gitti = await postaGonder({ alici: email, konu, html, metin });
  return gitti.ok
    ? { ok: true, sebep: null }
    : { ok: false, sebep: 'gonderim-reddedildi', hata: gitti.hata };
}

// ─────────────────────────────────────────────────────────────────────────────
// SONUÇ SEBEBİYLE BİRLİKTE DÖNÜYOR
//
// Eskiden yalnızca `true/false` dönüyordu ve markalı posta gitmediğinde
// sebebini YALNIZCA sunucu günlüğü biliyordu. Vercel günlüğüne erişemeyen biri
// için bu, "çalışmadı" ile "neden çalışmadı" arasında kapanmayan bir boşluk
// demekti — bugün tam olarak buna takıldık.
//
// Sebepler kasıtlı olarak KABA: hangi adımın düştüğünü söylüyor, sırların
// değerini değil.
//   adres-yok · resend-anahtari-yok · admin-yuklenemedi ·
//   admin-yapilandirilmamis · baglanti-uretilemedi · gonderim-reddedildi
// ─────────────────────────────────────────────────────────────────────────────

/** @returns {Promise<{ok: boolean, sebep: string|null}>} */
export function markaliDogrulamaGonder(email, dil = 'tr') {
  return gonder(email, dil, 'dogrulama');
}

/** @returns {Promise<{ok: boolean, sebep: string|null}>} */
export function markaliSifirlamaGonder(email, dil = 'tr') {
  return gonder(email, dil, 'sifirlama');
}
