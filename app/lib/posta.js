// ─────────────────────────────────────────────────────────────────────────────
// POSTA GÖNDERİMİ — Resend, düz `fetch` ile
//
// NEDEN VAR. Kimlik postalarını (doğrulama, şifre sıfırlama) Firebase
// gönderiyordu ve içeriği Firebase Console'daki şablonlarda duruyordu — yani
// bizim elimizde değildi. O şablon düzenleyicisi bu projede KİLİTLİ
// ("Email template updates are currently unavailable for this project"),
// dolayısıyla markalı bir posta için tek yol postayı kendimizin göndermesi.
//
// ── NEDEN SDK DEĞİL, `fetch` ──────────────────────────────────────────────
// Resend'in npm paketi var ama kurmuyoruz. Bugün `firebase-admin` bağımlılığı
// Vercel'de bir ÜRETİM ARIZASINA mal oldu (üç kimlik ucu modül yüklemede 500);
// tek bir HTTP çağrısı için aynı riski almanın karşılığı yok. Resend'in REST
// API'si tek uç ve tek başlık.
//
// ── ASLA FIRLATMAZ ────────────────────────────────────────────────────────
// Posta bir KATKI. Markalı posta gönderilemedi diye kayıt akışı kırılmamalı;
// çağıran `false` görüp Firebase'in kendi gönderimine düşüyor. Bu, oturum
// çerezindeki fail-closed kararının TERSİ ve bilerek öyle: orada imzasız çerez
// kabul etmek açık yaratırdı, burada gönderilemeyen posta yalnızca daha az
// güzel bir postaya düşmek demek.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://api.resend.com/emails';

// GÖNDEREN `support@gamerisen.com`: alan adı zaten bizim ve o kutu GERÇEK,
// yani otomatik postaya gelen yanıtlar bir insana ulaşıyor. `noreply@` yaygın
// bir alışkanlık ama kullanıcının "bu postayı ben istemedim" demesini
// imkânsızlaştırıyor; okunan bir kutudan göndermek daha iyi.
//
// Adresin var olması TEK BAŞINA yetmiyor: Resend ALAN ADINI doğrulamak
// zorunda (SPF + DKIM). Doğrulanmamış alan adından gönderim reddediliyor, bu
// yüzden anahtar yoksa hiç denemiyoruz.
const GONDEREN = process.env.POSTA_GONDEREN || 'Gamerisen <support@gamerisen.com>';

/** Hem anahtar hem gönderen tanımlı mı? Çağıranlar buna göre yol seçiyor. */
export function postaYapilandirildiMi() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Tek bir posta gönderir.
 *
 * @returns {Promise<boolean>} gönderildiyse true. Hiçbir durumda fırlatmaz.
 *
 * DÜZ METİN ZORUNLU TUTULUYOR: yalnızca HTML gönderen postalar spam
 * puanlamasında cezalandırılıyor ve HTML'i kapatmış istemcilerde boş görünüyor.
 */
export async function postaGonder({ alici, konu, html, metin }) {
  const anahtar = process.env.RESEND_API_KEY;
  if (!anahtar || !alici || !konu || !html) return false;

  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anahtar}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: GONDEREN,
        to: [alici],
        subject: konu,
        html,
        text: metin || undefined,
      }),
    });

    if (!r.ok) {
      // Gövde OKUNUYOR ama alıcı adresi loglanmıyor: Resend'in hata mesajı
      // teşhis için gerekli, kullanıcının adresi log'da durmak zorunda değil.
      let ayrinti = '';
      try { ayrinti = JSON.stringify(await r.json()).slice(0, 300); } catch { /* gövdesiz yanıt */ }
      console.error('[posta] Resend reddetti:', r.status, ayrinti);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[posta] gönderilemedi:', e?.message || e);
    return false;
  }
}

/**
 * İstekten dil seçer.
 *
 * NEDEN BAŞLIKTAN: ne mobil (`registerAccount`) ne web kayıt isteğinde dil
 * gönderiyor ve iki istemciyi de değiştirmek bu işin kapsamı değil.
 * `Accept-Language` ikisinde de kendiliğinden gidiyor.
 *
 * Varsayılan TÜRKÇE: kullanıcı tabanı ağırlıklı olarak Türkçe ve tanınmayan
 * bir dilde İngilizceye düşmek, Türk kullanıcıya İngilizce posta göndermenin
 * yolu olurdu.
 */
export function istektenDil(request) {
  const ham = request?.headers?.get?.('accept-language') || '';
  return /^\s*en\b/i.test(ham) ? 'en' : 'tr';
}
