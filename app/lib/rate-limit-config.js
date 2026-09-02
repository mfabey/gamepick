// ─────────────────────────────────────────────────────────────────────────────
// HIZ SINIRI YAPILANDIRMASI — tek kaynak.
//
// Sayılar buraya toplandı ki bir sınırı gevşetmek/sıkmak için route dosyalarını
// dolaşmak gerekmesin ve iki uç sessizce farklı değerlere kaymasın.
//
// İKİ EKSEN, çünkü tek eksen iki farklı saldırıyı birden durduramıyor:
//   • ip      → bir kaynaktan ÇOK HESABA saldırı (kimlik bilgisi doldurma,
//               toplu kayıt, LLM kotası yakma)
//   • account → çok kaynaktan TEK HESABA saldırı (dağıtık parola deneme,
//               tek kurbanı e-posta bombardımanına tutma)
//
// `[limit, pencereSaniye]` biçiminde. Eksik eksen = o eksende sınır yok.
//
// HESAP EKSENİ KİLİTLENMEYE YOL AÇMASIN: parola doğrulayan akışlarda hesap
// sayacı YALNIZCA BAŞARISIZ denemede artıyor (bkz. rate-guard.js `penalize`).
// Her denemede artsaydı, saldırgan kurbanın e-postasıyla 5 kez yanlış parola
// deneyerek meşru kullanıcıyı 15 dakika dışarıda bırakabilirdi — koruma
// saldırı aracına dönerdi.
//
// Bu değerler BAŞLANGIÇ noktası; gerçek trafiğe göre ayarlanmalı. Middleware
// zaten IP başına 60 istek/dakika uyguluyor (middleware.js) — buradakiler
// onun ÜSTÜNE, uca özel ikinci kat.
// ─────────────────────────────────────────────────────────────────────────────

const DK = 60;
const SAAT = 3600;

export const LIMITS = {
  // ── Kimlik doğrulama ──────────────────────────────────────────────────────
  // Hesap ele geçirme riski en yüksek olan yer. Hesap ekseni yalnız
  // başarısız denemede artıyor.
  login: {
    ip: [20, 15 * DK],
    account: [5, 15 * DK],
    accountOnFailureOnly: true,
  },

  // Kayıt: toplu sahte hesap üretimi + her kayıt bir doğrulama e-postası
  // tetiklediği için aynı zamanda e-posta maliyeti.
  register: {
    ip: [5, SAAT],
  },

  // ── E-posta tetikleyen uçlar ──────────────────────────────────────────────
  // Saldırgan e-posta adresini SERBESTÇE seçiyor: sınırsız bırakılırsa
  // istediği kişiyi Firebase üzerinden posta bombardımanına tutabilir.
  passwordReset: {
    ip: [10, SAAT],
    account: [3, SAAT],
  },
  verifyResend: {
    ip: [10, SAAT],
    account: [3, SAAT],
  },

  // ── Parola doğrulayan diğer akışlar ───────────────────────────────────────
  passwordChange: {
    ip: [20, 15 * DK],
    account: [5, 15 * DK],
    accountOnFailureOnly: true,
  },
  accountDelete: {
    ip: [10, SAAT],
    account: [3, SAAT],
    accountOnFailureOnly: true,
  },

  // Jeton tazeleme meşru olarak sık çağrılıyor (oturum süresince) — bol.
  tokenRefresh: {
    ip: [120, SAAT],
  },

  // OAuth girişleri: parola denemesi değil, ama hesap oluşturma yolu.
  oauthSignin: {
    ip: [30, 15 * DK],
  },

  // ── Pahalı işlemler (doğrudan FATURA) ─────────────────────────────────────
  // Dördü de kimliksiz. Sınırsız bırakılırsa LLM sağlayıcı faturası
  // saldırganın elinde.
  aiChat: {
    ip: [30, SAAT],
  },
  aiSearch: {
    ip: [60, SAAT],
  },
};

/**
 * Saniyeyi kullanıcıya gösterilecek Türkçe süreye çevirir.
 * Yukarı yuvarlıyor: "1 dakika" deyip 61. saniyede hâlâ reddetmek yerine
 * "2 dakika" demek daha az sinir bozucu.
 */
export function bekleMetni(saniye) {
  const s = Math.max(1, Math.ceil(Number(saniye) || 0));
  if (s < 60) return `${s} saniye`;
  const dk = Math.ceil(s / 60);
  if (dk < 60) return `${dk} dakika`;
  const saat = Math.ceil(dk / 60);
  return `${saat} saat`;
}
