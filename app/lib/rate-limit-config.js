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
//
// ── `failClosed`: REDİS ERİŞİLEMEZKEN NE OLACAK ─────────────────────────────
// Sınırlayıcı varsayılan olarak AÇIK GEÇİYOR (bkz. rate-limit.js). Bu ucuz
// okuma uçlarında doğru, ama bir Upstash kesintisi posta gönderen ve LLM
// faturası doğuran uçların da tavanını kaldırıyordu — kesinti boyunca
// SINIRSIZ.
//
// KURAL: isteği yerine getirmek PARA HARCIYOR ya da POSTA GÖNDERİYORSA
// kapalı başarısız ol; engellemek KULLANICIYI HESABINDAN KİLİTLİYORSA açık
// kal.
//
// O yüzden `login`, `oauthSignin` ve `tokenRefresh` BİLİNÇLİ OLARAK açık:
// Redis kesintisinde giriş 503 dönerse ya da jeton tazelenemezse tüm
// kullanıcılar dışarıda kalır — engellenen kötüye kullanımdan çok daha
// pahalı bir sonuç. `passwordChange`/`accountDelete` de açık: ikisi de
// zaten parola doğruluyor.
//
// GELİŞTİRMEDE HİÇ TETİKLENMİYOR: `rate-guard.js` bayrağı yalnız
// `NODE_ENV === 'production'` iken uyguluyor. `session-cookie.js`'teki
// DEV_FALLBACK ve `auth-config.js`'teki `canUseAuthMock` ile aynı kalıp —
// yerelde Redis'siz çalışmaya devam.
// ─────────────────────────────────────────────────────────────────────────────

const DK = 60;
const SAAT = 3600;
const GUN = 86400;

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
  // HESAP EKSENİ SONRADAN EKLENDİ. Eskiden yoktu ve gerekçesi şuydu:
  // "e-posta saldırganın her seferinde değiştirdiği alan, orada sayaç tutmak
  // hiçbir şeyi durdurmaz". Bu, TOPLU SAHTE HESAP saldırısı için hâlâ doğru.
  //
  // Ama uç artık, adres zaten kayıtlıysa o adrese sıfırlama postası
  // gönderiyor (hesap sayımına kapatmak için — bkz. register/route.js). Bu
  // yeni bir saldırı biçimi doğuruyor: saldırgan adresi DEĞİŞTİRMEK
  // istemiyor, tam tersi TEK KURBAN adresine yükleniyor. Eski gerekçe o
  // saldırıyı kapsamıyor.
  //
  // YALNIZ BAŞARISIZLIKTA ARTIYOR: sayaç sadece "var olan adrese posta
  // gönderdik" dalında `penalize` ile artıyor. Meşru ilk kayıt sayacı hiç
  // tüketmiyor — aksi hâlde formu üç kez yanlış dolduran kullanıcı bir saat
  // kayıt olamazdı.
  register: {
    ip: [5, SAAT],
    account: [3, SAAT],
    accountOnFailureOnly: true,
    failClosed: true,          // hesap yaratıyor + doğrulama postası gönderiyor
  },

  // ── E-posta tetikleyen uçlar ──────────────────────────────────────────────
  // Saldırgan e-posta adresini SERBESTÇE seçiyor: sınırsız bırakılırsa
  // istediği kişiyi Firebase üzerinden posta bombardımanına tutabilir.
  passwordReset: {
    ip: [10, SAAT],
    account: [3, SAAT],
    failClosed: true,          // adresi saldırgan seçiyor → bombardıman vektörü
  },
  verifyResend: {
    ip: [10, SAAT],
    account: [3, SAAT],
    failClosed: true,
  },

  // ── Doğrulama kodunu TÜKETEN uç ───────────────────────────────────────────
  // `auth/action` HİÇ SINIRSIZDI: oobCode'u harcayan tek uç, bu listede
  // yoktu. `guard()` tanımsız eylemde patlıyor — ama HİÇ ÇAĞRILMAYAN guard'ı
  // ne o ne de access-policy denetleyicisi yakalıyor (denetleyici yalnız
  // sınıflandırma eksikliğine bakıyor, hız sınırına değil).
  //
  // GEREKÇE KABA KUVVET DEĞİL, FATURA: Firebase oobCode'u yüksek entropili,
  // tahminle bulunması gerçekçi değil. Sınırın sebebi her denemenin Identity
  // Toolkit'e bir yukarı akış çağrısı olması ve bunun sınırsız oluşuydu —
  // middleware'in 60/dk'sı dışında tavan yoktu: IP başına 86.400 deneme/gün.
  //
  // EKSEN NEDEN `code`: istekte hesap YOK, elimizdeki tek kimlik kodun
  // kendisi. `account` eksenine sıkıştırmak anahtarı yanlış adlandırırdı.
  //
  // KOD EKSENİ YALNIZ BAŞARISIZLIKTA ARTIYOR: doğru kodu getiren meşru
  // kullanıcı sayacı tüketmemeli — `login`'deki `accountOnFailureOnly` ile
  // aynı gerekçe.
  //
  // IP SAYISI NEDEN BOL: meşru kullanıcı bu ucu doğrulama başına 1–2 kez
  // çağırıyor, ama ortak NAT (okul, kurum, mobil operatör) arkasında birden
  // çok kullanıcı aynı IP'den gelir. 20/15dk o başlığa yer bırakırken günlük
  // tavanı 86.400'den 100'e indiriyor. Dosyanın başındaki not burada da
  // geçerli: başlangıç değeri, gerçek trafiğe göre ayarlanacak.
  codeVerify: {
    ip: [20, 15 * DK],
    ipDaily: [100, GUN],
    code: [5, SAAT],
    codeOnFailureOnly: true,
    failClosed: true,          // her deneme bir Identity Toolkit çağrısı
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
  //
  // GÜNLÜK TAVAN NEDEN AYRICA GEREKLİ: saatlik sınır tek başına günlük
  // maliyeti bağlamıyor. 30/saat, 24 saat boyunca sürdürülürse 720 çağrı
  // eder — tek IP'den, tek günde. Günlük tavan bu sürüklenmeyi kesiyor.
  //
  // EKSEN NEDEN IP: bu dört uç KİMLİKSİZ, ortada kullanıcı yok. "Kullanıcı
  // başına günlük tavan" ancak uçlar kimlik isterse mümkün olur — bu bir
  // ürün kararı (şu an giriş yapmayan da AI'yı kullanabiliyor).
  aiChat: {
    ip: [30, SAAT],
    ipDaily: [120, GUN],
    failClosed: true,          // doğrudan LLM faturası
  },
  aiSearch: {
    ip: [60, SAAT],
    ipDaily: [300, GUN],
    failClosed: true,
  },

  // ── Kimlikli pahalı işlemler — burada KULLANICI başına tavan mümkün ───────
  // Görüntü denetimi (Google Vision) görüntü başına ücretli; Steam grafiği
  // istek başına 100'e kadar yukarı akış çağrısı yayıyor.
  visionModeration: {
    accountDaily: [60, GUN],
    failClosed: true,          // Google Vision: görüntü başına ücretli
  },
  steamGraph: {
    accountDaily: [40, GUN],
    failClosed: true,          // istek başına 100'e kadar yukarı akış çağrısı
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
