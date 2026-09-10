// ─────────────────────────────────────────────────────────────────────────────
// ENGELLEME — App Store Guideline 1.2'nin üçüncü şartının TAM hâli
//
// Apple'ın 2.6.1 reddinde parantez içindeki cümle şartın kendisi kadar
// bağlayıcı:
//
//   "blocking should also notify the developer of the inappropriate content
//    and should remove it from the user's feed instantly"
//
// Yani engelleme üç iş birden yapmak zorunda ve ikisi eskiden YAPILMIYORDU:
//
//   1. Sunucuda engel kaydı        → `blockUser` zaten yapıyordu.
//   2. GELİŞTİRİCİYİ HABERDAR ET   → yoktu. Engel sessizce yazılıyordu,
//      moderasyon kuyruğuna hiçbir şey düşmüyordu; yani "kötüye kullanan
//      kullanıcı" diye işaretlenen kişi bizim tarafımızda hiç görünmüyordu.
//   3. AKIŞTAN ANINDA KALDIR       → yoktu. Engel sunucuya yazılıyor ama
//      ekrandaki gönderiler bir sonraki yüklemeye kadar duruyordu; kullanıcı
//      "engelledim" deyip aynı kişinin sözünü okumaya devam ediyordu.
//
// (3) İÇİN NEDEN YEREL BİR KÜME. Sunucu zaten engellinin içeriğini
// filtreliyor — ama SONRAKİ istekte. Aradaki boşluğu kapatmanın tek yolu
// istemcinin o kimliği anında saklaması. Küme bellekte: kalıcı olması
// gerekmiyor, çünkü uygulama yeniden açıldığında sunucu zaten filtreliyor.
//
// ABONELİK, TEK BİR KARTIN KENDİNİ SAKLAMASINDAN FARKLI: aynı yazarın
// ekrandaki BÜTÜN gönderileri aynı anda kalkmalı. Engellediğin kişinin bir
// gönderisi kalkıp diğeri kalsaydı, "engelledim" sözü tutulmamış olurdu.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

import { blockUser, reportContent } from '../api/social';

const gizlenen = new Set();
const aboneler = new Set();

function duyur() {
  for (const fn of aboneler) {
    try { fn(); } catch { /* bir abonenin hatası ötekini düşürmesin */ }
  }
}

export function engellendiMi(uid) {
  return !!uid && gizlenen.has(uid);
}

export function engelAbone(fn) {
  aboneler.add(fn);
  return () => aboneler.delete(fn);
}

/**
 * Kullanıcıyı engelle.
 *
 * SIRA ÖNEMLİ: önce sunucu, sonra yerel gizleme. Ters olsaydı istek
 * başarısız olduğunda içerik ekrandan kalkmış ama engel yazılmamış olurdu —
 * kullanıcı korunduğunu sanırdı.
 *
 * Otomatik şikayet ATEŞLE-UNUT: engelin kendisi başarılıysa iş bitmiştir,
 * moderasyon kaydı yazılamadı diye kullanıcıya hata göstermek yanlış olur.
 * Sunucu aynı hedefi 30 gün tekrar kaydetmiyor (report_dupe), yani her
 * engelleme kuyruğu şişirmiyor.
 */
export async function engelle(uid) {
  if (!uid) return;
  await blockUser(uid);

  gizlenen.add(uid);
  duyur();

  reportContent({
    targetType: 'user',
    targetId: uid,
    reason: 'other',
    // Kuyrukta elle yazılmış şikayetten ayrılsın: bu bir kullanıcı ifadesi
    // değil, bir engelleme olayının bildirimi.
    note: 'auto: blocked by user (App Store 1.2)',
  }).catch(() => {});
}

/** Bu kimlik şu an gizli mi? Engel değişince bileşeni yeniden çiziyor. */
export function useEngellendi(uid) {
  const [, tazele] = useState(0);
  useEffect(() => engelAbone(() => tazele((n) => n + 1)), []);
  return engellendiMi(uid);
}
