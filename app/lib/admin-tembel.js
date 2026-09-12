// ─────────────────────────────────────────────────────────────────────────────
// firebase-admin'İN TEMBEL YÜKLEYİCİSİ
//
// NEDEN VAR — ÖLÇÜLMÜŞ VE GENİŞ BİR ÜRETİM ARIZASI. `firebase-admin` Vercel'de
// yüklenemiyor ve onu MODÜL DÜZEYİNDE içe aktaran her rota, isteği hiç
// görmeden 500 dönüyor. Üretimde ölçüldü:
//
//   api/social/block         500   ← App Store 1.2: ENGELLEME
//   api/social/report        500   ← App Store 1.2: ŞİKAYET
//   api/social/activity      500
//   api/auth/connections     500
//   api/auth/mobile-logout   500
//
// Yayılma yüzeyi `lib/mobile-auth.js` üzerinden: onu 35 uç içe aktarıyor ve o
// da `firebase-admin`i modül düzeyinde alıyordu. Yani tek bir paketin
// yüklenememesi, mobil API'nin tamamını düşürüyordu.
//
// ── DAVRANIŞ DEĞİŞMİYOR ────────────────────────────────────────────────────
// `firebase-admin.js`'in kendi başındaki not zaten şunu yazıyor: "KATKI OLARAK
// KURULDU, ZORUNLULUK OLARAK DEĞİL — servis hesabı yapılandırılmamışsa bu modül
// null döndürüyor ve çağıranlar MEVCUT davranışa (accounts:lookup) düşüyor."
// Çağıranlar zaten `if (admin)` ile koruyor. Tembel yükleme yalnızca "null"
// üretmenin bir yolunu daha ekliyor; hiçbir çağıranın mantığı değişmiyor.
//
// Kök sebep (paketin Vercel'de neden yüklenemediği) hâlâ bilinmiyor ve bu
// modül onu ÇÖZMÜYOR — zararsızlaştırıyor.
// ─────────────────────────────────────────────────────────────────────────────

let onbellek;   // undefined = denenmedi, null = denendi ve yok

/**
 * Admin Auth örneği.
 *
 * SONUÇ ÖNBELLEKLENİYOR: paket yüklenemiyorsa her istekte yeniden denemek aynı
 * hatayı yeniden üretip günlüğü şişirirdi. `adminAuth()` zaten kendi içinde de
 * önbellekli; buradaki önbellek `import`un kendisini tekrarlamamak için.
 *
 * @returns {Promise<object|null>} yapılandırılmamış ya da yüklenemiyorsa null.
 */
export async function adminAuthGuvenli() {
  if (onbellek !== undefined) return onbellek;
  try {
    const m = await import('./firebase-admin');
    onbellek = m.adminAuth?.() ?? null;
  } catch (e) {
    console.error('[admin] firebase-admin yüklenemedi — iptal kontrolü devre dışı:', e?.message || e);
    onbellek = null;
  }
  return onbellek;
}

/**
 * Kullanıcının yenileme jetonlarını iptal eder.
 *
 * @returns {Promise<boolean>} iptal UYGULANDIYSA true. `false`, çağıranın
 *   akışını durdurmamalı: çıkış istemci tarafında zaten gerçekleşiyor ve
 *   iptal bir EK güvence (bkz. firebase-admin.js).
 */
export async function revokeUserTokensGuvenli(uid) {
  if (!uid) return false;
  try {
    const m = await import('./firebase-admin');
    if (!m.revokeUserTokens) return false;
    return (await m.revokeUserTokens(uid)) ?? false;
  } catch (e) {
    console.error('[admin] jeton iptali düştü:', e?.message || e);
    return false;
  }
}
