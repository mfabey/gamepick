// ─────────────────────────────────────────────────────────────────────────────
// JETON MODÜLÜNÜN TEMBEL YÜKLEYİCİSİ
//
// NEDEN VAR — ÖLÇÜLMÜŞ BİR ÜRETİM ARIZASI. `refresh-token.js`'i MODÜL
// DÜZEYİNDE içe aktaran üç uç Vercel'de 500 döndü:
//
//   api/auth/mobile-login     500      ← refresh-token zinciri
//   api/auth/mobile-refresh   500      ← aynı zincir
//   api/auth/mobile-logout    500      ← aynı zincir
//   api/auth/register         400 ✓    (zinciri içe aktarmıyor)
//   api/auth/login            400 ✓    (zinciri içe aktarmıyor)
//   api/auth/action           400 ✓    (zinciri içe aktarmıyor)
//   api/trending              200 ✓
//
// `mobile-login` BOŞ GÖVDEYLE de 500 döndü, oysa kod boş gövdede 400 döndürür:
// yani istek koda hiç girmedi, rota modülü yüklenemedi. Zincirin ucunda
// `firebase-admin` var ve kök sebep hâlâ kesin değil (paketleme beyanı ve Node
// sürümü denendi, ikisi de tek başına çözmedi).
//
// ── ASIL KUSUR KÖK SEBEP DEĞİL, KIRILGANLIK ────────────────────────────────
// `mobile-login` o modülü TEK BİR SATIR için istiyor:
//
//     refreshToken: (await mintFamily(...)) || refreshToken
//
// `|| refreshToken` diyor ki: başarısız olursa Firebase'in jetonuna düş. Yani
// döndürmeli jeton bir KATKI. Ama içe aktarım modül düzeyinde olduğu için,
// katkı olan bir modül yüklenemediğinde TÜM ROTAYI düşürüyordu ve o yedek yol
// hiç çalışmıyordu. `firebase-admin.js`'in kendi başındaki not zaten bu ilkeyi
// yazmış: "KATKI OLARAK KURULDU, ZORUNLULUK OLARAK DEĞİL".
//
// Tembel yükleme kök sebebi ÇÖZMÜYOR — onu zararsızlaştırıyor. Aynı sınıftan
// bir hata bir daha bütün ucu düşüremez.
// ─────────────────────────────────────────────────────────────────────────────

let onbellek;   // undefined = hiç denenmedi, null = denendi ve düştü

/**
 * `refresh-token` modülünü getirir.
 *
 * SONUÇ ÖNBELLEKLENİYOR: başarısızlık durumunda her istekte yeniden `import`
 * denemek, her çağrıda aynı hatayı yeniden üretip günlüğü şişirirdi. Bir kez
 * düşen modül o örnek ömrü boyunca düşmüş sayılıyor.
 *
 * @returns {Promise<object|null>} modül, ya da yüklenemezse null.
 */
export async function jetonModulu() {
  if (onbellek !== undefined) return onbellek;
  try {
    onbellek = await import('./refresh-token');
  } catch (e) {
    console.error('[jeton] refresh-token yüklenemedi — döndürmeli jeton devre dışı:', e?.message || e);
    onbellek = null;
  }
  return onbellek;
}

/**
 * Yeni bir jeton ailesi üretir; modül yoksa ya da üretim düşerse `null`.
 * Çağıran Firebase'in kendi yenileme jetonuna düşüyor.
 */
export async function mintFamilyGuvenli(uid, firebaseRefresh) {
  const m = await jetonModulu();
  if (!m?.mintFamily) return null;
  try {
    return await m.mintFamily(uid, firebaseRefresh);
  } catch (e) {
    // Redis erişilemezse `redisCmd` fırlatıyor. Giriş bundan düşmemeli.
    console.error('[jeton] mintFamily düştü:', e?.message || e);
    return null;
  }
}

/**
 * Aileyi düşürür (çıkış). Modül yoksa sessizce geçiyor: çıkışın kendisi
 * istemci tarafında zaten gerçekleşiyor ve `rotateFamily` sonraki denemede
 * INVALID dönüyor — yani çıkış Admin olmadan da etkili (bkz. mobile-logout).
 */
export async function dropFamilyGuvenli(token) {
  const m = await jetonModulu();
  if (!m?.dropFamily) return false;
  try {
    await m.dropFamily(token);
    return true;
  } catch (e) {
    console.error('[jeton] dropFamily düştü:', e?.message || e);
    return false;
  }
}
