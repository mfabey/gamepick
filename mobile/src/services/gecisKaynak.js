// ─────────────────────────────────────────────────────────────────────────────
// BÜYÜME GEÇİŞİNİN KAYNAK ÇERÇEVESİ — giden yolda yazılır, dönen yolda okunur.
//
// NEDEN CONTEXT DEĞİL. Bu veri hiçbir şeyi ÇİZDİRMİYOR: yalnızca "kart
// ekranın neresindeydi" sorusunun cevabı ve tek bir animasyonun girdisi.
// Context olsaydı her tüketici gereksiz yeniden render alırdı; oysa okuyan
// tek yer var ve o da yalnız geri tuşuna basılınca okuyor.
//
// NEDEN ROTA PARAMETRESİ DEĞİL. Çerçeve dört sayı + iki metin; rota
// parametreleri URL'e serileşiyor ve geri dönüşte parametre ile ekran
// durumunu senkron tutmak gerekirdi. Ayrıca detay ekranı başka yollardan da
// açılıyor (arama, bildirim, sohbet) — onlarda çerçeve YOK ve olmaması
// normal; parametre olsaydı her çağrı yerine boş bir alan eklenirdi.
//
// ID'YE GÖRE ANAHTARLI, tek yuvalı değil: detaydan ilgili başka bir oyuna
// gidilebiliyor, tek yuva olsaydı ikinci oyunun çerçevesi birincininkini
// ezer ve geri dönüşte yanlış yere küçülürdü.
//
// ÖMÜR: çerçeve ekran koordinatı taşıyor ve zamanla anlamsızlaşıyor (liste
// kaydı, cihaz döndü, ekran değişti). Bayat bir çerçeveye küçülmek, hiç
// küçülmemekten kötü — o yüzden süresi dolan kayıt yok sayılıyor.
// ─────────────────────────────────────────────────────────────────────────────

const OMUR_MS = 5 * 60 * 1000;
const MAKS = 12;

const kayitlar = new Map();   // id -> { cerceve, ts }

/** Giden yolda: kartın ekrandaki çerçevesini sakla. */
export function kaynakYaz(id, cerceve) {
  if (!id || !cerceve) return;
  kayitlar.set(String(id), { cerceve, ts: Date.now() });
  if (kayitlar.size > MAKS) {
    // Map ekleme sırasını koruyor → en eskiyi at.
    const ilk = kayitlar.keys().next();
    if (!ilk.done) kayitlar.delete(ilk.value);
  }
}

/** Dönen yolda: çerçeve hâlâ geçerliyse ver, değilse null. */
export function kaynakOku(id) {
  const k = kayitlar.get(String(id));
  if (!k) return null;
  if (Date.now() - k.ts > OMUR_MS) { kayitlar.delete(String(id)); return null; }
  return k.cerceve;
}

/** Kullanıldı → bırak. İkinci bir geri dönüş aynı çerçeveyi tekrar oynatmasın. */
export function kaynakSil(id) {
  kayitlar.delete(String(id));
}

// ─────────────────────────────────────────────────────────────────────────────
// BEKLEYEN KÜÇÜLME — çıkış animasyonunun HANGİ EKRANDA oynadığı meselesi.
//
// İlk sürümde küçülme DETAY ekranında oynuyor, bitince `back()` yapılıyordu.
// Kullanıcı bunu "kasıyor" diye bildirdi ve sebebi açık: animasyon boyunca
// detay ekranı tam ayakta duruyor — ScrollView, ekran görüntüsü şeridi,
// expo-video oynatıcısı. Üstelik bindirme opak zeminle açıldığı için 380 ms
// boyunca donmuş bir ekran görünüyordu ("sayfa yenileniyor" hissi).
//
// Yeni sıra TERS: önce `back()`, sonra ANASAYFADA küçülme. Detay o anda
// çoktan sökülmüş oluyor, animasyon boş bir sahnede çalışıyor ve kullanıcı
// gerçek anasayfayı hemen görüyor. Giriş yönü zaten aynı kalıbı kullanıyor.
//
// TEK YUVA yeterli: aynı anda birden fazla geri çıkış olamaz. Okuyan taraf
// tüketiyor (bir kez oynasın diye).
// ─────────────────────────────────────────────────────────────────────────────

let bekleyen = null;

/** Detay ekranı: geri çıkarken "anasayfa bunu küçültsün" diye bırakır. */
export function kucultmeIste(cerceve) {
  bekleyen = cerceve || null;
}

/** Anasayfa: odağı geri alınca bir kez okur ve yuvayı boşaltır. */
export function kucultmeAl() {
  const k = bekleyen;
  bekleyen = null;
  return k;
}
