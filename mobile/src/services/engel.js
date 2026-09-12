// ─────────────────────────────────────────────────────────────────────────────
// YEREL ENGEL KÜMESİ — "anında akıştan düşsün" şartı
//
// NEDEN VAR. App Store Guideline 1.2, engellemenin içeriği kullanıcının
// akışından ANINDA kaldırmasını istiyor. Sunucu tarafı zaten doğru:
// `getHiddenUids` her akış ucunda süzüyor. Ama o süzgeç BİR SONRAKİ ÇEKİMDE
// çalışıyor; engelleme anında ekranda duran liste değişmiyordu ve kullanıcı
// engellediği kişinin gönderisine bakmaya devam ediyordu.
//
// LİSTEYİ YENİDEN ÇEKMEK ÇÖZÜM DEĞİL. Üç sebeple:
//   1. Ağ turu bekletir; "anında" olmaz.
//   2. Kaydırma konumu başa sarar — kullanıcı okuduğu yeri kaybeder.
//   3. Engelleme birden fazla ekrandan yapılabiliyor (akış, profil, arkadaş
//      listesi) ve yalnız o ekranı tazelemek diğerlerini eski bırakırdı.
//
// Bu yüzden karar tek yerde tutuluyor ve dinleyen her ekran aynı anda süzüyor.
//
// KAPSAM: YALNIZCA OTURUM ÖMRÜ. Küme diske yazılmıyor ve yazılmamalı —
// kalıcı gerçek sunucuda (`user_blocks:{uid}`). Burası sunucu yanıtı gelene
// kadarki boşluğu kapatan bir örtü; uygulama yeniden açıldığında sunucunun
// süzgeci zaten devrede.
//
// `engelKaldir` VAR ama akışta kullanılmıyor: engeli kaldırma yalnızca
// sosyal ayarlardan yapılıyor ve orası listeyi zaten yeniden çekiyor. Yine de
// duruyor, çünkü kaldırma sonrası bu kümede kalan bir uid o oturum boyunca
// içeriği görünmez tutardı — sessiz ve teşhisi zor bir hata.
// ─────────────────────────────────────────────────────────────────────────────

import { blockUser, reportContent } from '../api/social';

const engelliler = new Set();
const aboneler = new Set();

function duyur() {
  // Kopya üzerinde geziliyor: bir abone yanıt olarak abonelikten çıkarsa
  // (ekran unmount olur) küme gezinme sırasında değişirdi.
  for (const f of [...aboneler]) {
    try { f(); } catch { /* bir dinleyicinin hatası diğerlerini düşürmesin */ }
  }
}

/** Engellendi olarak işaretle. Sunucu çağrısı BAŞARILI olduktan sonra çağır. */
export function engelle(uid) {
  if (!uid || engelliler.has(uid)) return;
  engelliler.add(uid);
  duyur();
}

/**
 * ENGELLEMENİN TAM AKIŞI — tek kapı.
 *
 * NEDEN AYRI BİR FONKSİYON. Yukarıdaki `engelle` yalnızca YEREL işaretleyici
 * ve sözleşmesi bu ("sunucu çağrısı başarılı olduktan sonra çağır"); onu
 * bozmadan üç işi birden yapan bir giriş noktası gerekiyordu. Apple'ın 2.6.1
 * reddi engellemeden üç şey istiyor ve üçü de burada:
 *
 *   1. Sunucuya engel kaydı
 *   2. GELİŞTİRİCİYİ HABERDAR ET   ← 1.2'nin parantezi
 *   3. Akıştan ANINDA kaldır
 *
 * (2) BU DALDA YOKTU. Engelleme sunucuya yazılıyordu ama moderasyon kuyruğuna
 * hiçbir kayıt düşmüyordu; "kötüye kullanan kullanıcı" diye işaretlenen kişi
 * bizim tarafımızda hiç görünmüyordu. Apple'ın cümlesi net: "blocking should
 * also notify the developer of the inappropriate content".
 *
 * SIRA ÖNEMLİ: önce sunucu, sonra yerel gizleme. Ters olsaydı istek
 * başarısız olduğunda içerik ekrandan kalkmış ama engel yazılmamış olurdu —
 * kullanıcı korunduğunu sanırdı. Hata çağırana fırlatılıyor, çünkü kullanıcıya
 * ne gösterileceğini ekran biliyor.
 *
 * OTOMATİK ŞİKAYET ATEŞLE-UNUT: engelin kendisi başarılıysa iş bitmiştir,
 * moderasyon kaydı yazılamadı diye kullanıcıya hata göstermek yanlış olur.
 * Sunucu aynı hedefi 30 gün tekrar kaydetmiyor (report_dupe), yani her
 * engelleme kuyruğu şişirmiyor.
 */
export async function engelUygula(uid) {
  if (!uid) return;
  await blockUser(uid);

  engelle(uid);

  reportContent({
    targetType: 'user',
    targetId: uid,
    reason: 'other',
    // Kuyrukta elle yazılmış şikayetten ayrılsın: bu bir kullanıcı ifadesi
    // değil, bir engelleme olayının bildirimi.
    note: 'auto: blocked by user (App Store 1.2)',
  }).catch(() => {});
}

/** Engeli kaldır — sosyal ayarlardaki listeden. */
export function engelKaldir(uid) {
  if (!uid || !engelliler.delete(uid)) return;
  duyur();
}

export function engelliMi(uid) {
  return !!uid && engelliler.has(uid);
}

/** Değişiklikte çağrılacak dinleyici. Dönen fonksiyon aboneliği bırakır. */
export function abone(fn) {
  aboneler.add(fn);
  return () => aboneler.delete(fn);
}

/**
 * Listeyi süz. `uidAl` her öğeden yazarın uid'ini çıkarıyor — akışlar farklı
 * şekiller taşıyor (gönderi, inceleme, oyun kartı) ve hiçbiri ortak bir alan
 * adında anlaşmıyor.
 *
 * KÜME BOŞKEN AYNI DİZİ DÖNÜYOR: yeni dizi dönmek `useMemo` bağımlılıklarını
 * tazeleyip listeyi boşuna yeniden çizerdi. Uygulamanın normal hâli boş küme.
 */
export function suz(liste, uidAl) {
  if (!Array.isArray(liste) || engelliler.size === 0) return liste;
  return liste.filter((x) => !engelliler.has(uidAl(x)));
}
