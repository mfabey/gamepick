import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// HATA YANITLARI — kullanıcıya sade mesaj, loga tam detay, ikisi arasında
// bir REFERANS KODU.
//
// NEDEN: 17 uçta `catch (err) { return NextResponse.json({ error: err.message },
// { status: 500 }) }` deseni vardı. `err.message` iç detay taşıyor — Redis
// katmanının varlığı ("Redis HTTP 401", "Redis ağ hatası"), yukarı akış
// adresleri, JSON ayrıştırma hataları. Kullanıcıya hiçbir işe yaramıyor,
// saldırgana sistemin şeklini veriyor.
//
// Ayrı olarak 10 yerde Firebase'in HAM hata kodu istemciye aynen
// geçiriliyordu (`signInData?.error?.message`). Bunlar Google'ın iç kodları
// (`TOO_MANY_ATTEMPTS_TRY_LATER`, `USER_DISABLED`, `INVALID_ID_TOKEN`);
// kullanıcı için anlamsız, dışarıdan bakan için bilgi.
//
// REFERANS KODU: kullanıcı "GR-M8K2QP-7F3A" diyor, sen logda arıyorsun.
// Zaman bileşeni içeriyor (base36) — kodu görünce olayın ne zaman olduğunu
// da biliyorsun, log aralığını daraltmak için.
//
// KOD TAHMİN EDİLEBİLİR OLMAK ZORUNDA DEĞİL: bir sır taşımıyor, yalnızca
// log satırıyla kullanıcı şikâyetini eşleştiriyor. Rastgele bölüm yalnızca
// aynı milisaniyedeki iki hatanın çakışmaması için.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Kullanıcının telefonda okuyabileceği kadar kısa, benzersiz bir kod.
 *
 * RASTGELE BÖLÜM 6 KARAKTER, 4 DEĞİL. İlk hâli 4'tü ve ölçüldü: 5000
 * üretimde çakışma çıkıyordu — kodlar aynı milisaniyede üretildiğinde
 * zaman bölümü aynı kalıyor ve 36^4 (~1.7M) doğum günü çakışmasına yetecek
 * kadar dar. 36^6 (~2.2 milyar) ile aynı testte çakışma kalmıyor.
 */
export function referansKodu() {
  const zaman = Date.now().toString(36).toUpperCase();
  const rastgele = Math.floor(Math.random() * 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
  return `GR-${zaman}-${rastgele}`;
}

/**
 * Beklenmeyen hata → 500.
 *
 * Loga: referans kodu + tam hata + yığın izi + bağlam.
 * Kullanıcıya: sade mesaj + referans kodu. Yığın izi ve iç mesaj GİTMİYOR.
 *
 * @param err      yakalanan hata
 * @param context  logda görünecek yer bilgisi (ör. 'auth/login')
 * @param message  kullanıcıya gösterilecek metin
 */
export function sunucuHatasi(err, context, message = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.') {
  const ref = referansKodu();
  // console.error Vercel loglarına düşüyor. Yığın izi BURADA, yanıtta değil.
  console.error(`[${ref}] ${context}:`, err?.message || err, '\n', err?.stack || '(yığın izi yok)');
  return NextResponse.json({ error: 'INTERNAL_ERROR', ref, message }, { status: 500 });
}

/**
 * Yukarı akış (Firebase vb.) beklenen bir hata döndürdü ama bunu kullanıcıya
 * aynen göstermek doğru değil.
 *
 * Ham kodu loga yazıyor, kullanıcıya verilen sade mesajı döndürüyor.
 *
 * @param hamKod   yukarı akışın hata kodu (loga gider, yanıta GİTMEZ)
 * @param context  yer bilgisi
 * @param message  kullanıcıya gösterilecek metin
 * @param status   HTTP durumu
 */
export function yukariAkisHatasi(hamKod, context, message, status = 400) {
  const ref = referansKodu();
  console.error(`[${ref}] ${context}: yukarı akış hatası =`, hamKod || '(kod yok)');
  return NextResponse.json({ error: 'UPSTREAM_ERROR', ref, message }, { status });
}
