// ─────────────────────────────────────────────────────────────────────────────
// SABİT SÜRE TABANI — yanıt süresinden hesap varlığını okumayı engeller.
//
// NEDEN: `auth/reset-password` hesap sayımına kapalı bir MESAJ döndürüyor
// ("Bu adrese kayıtlı bir hesap varsa..."), ama İŞ MİKTARI iki dalda farklı:
//
//   • hesap yok  → Firebase EMAIL_NOT_FOUND (yalnız arama), posta yok
//   • hesap var  → Firebase postayı kuyruğa alıyor + ölçüm için Redis turu
//
// Yani mesajı eşitlemek için harcanan emek SÜREYLE geri sızıyordu. Saldırgan
// yanıtın içeriğine değil, ne kadar sürdüğüne bakarak adresin kayıtlı olup
// olmadığını anlayabilir.
//
// ── NEDEN TABAN, NEDEN TEK TEK FARKLARI KOVALAMAK DEĞİL ─────────────────────
// Redis turunu kaldırmak bugünkü farkı kapatırdı ama yarın eklenen bir log
// satırı, bir sayaç, bir profil yazımı farkı geri açardı — ve bunu kimse fark
// etmezdi. Taban, İÇERİDE NE OLDUĞUNDAN BAĞIMSIZ olarak süreyi eşitliyor.
//
// ── TABAN DEĞERİ ÖLÇÜLMEDİ ──────────────────────────────────────────────────
// Firebase'in iki yolunun gerçek gecikme farkı bu depoda hiç ölçülmedi.
// Seçilen değer BAŞLANGIÇ NOKTASI; doğru değer üretim verisinden gelecek.
//
// O yüzden mekanizma KENDİ YETERSİZLİĞİNİ BİLDİRİYOR: gerçek iş tabanı
// aştığında `[SURE-ASIMI]` etiketli bir satır loga düşüyor. O satır görülüyorsa
// taban artırılmalı — çünkü taban aşıldığı anda koruma o istek için yok.
//
// ── SINIRLARI ───────────────────────────────────────────────────────────────
// Bu, zamanlama kanalını DARALTIYOR, matematiksel olarak kapatmıyor: taban
// aşılan isteklerde fark yine görünür. Gerçek çözümü, yanıtı yukarı akış
// çağrısından tamamen ayırmak (önce yanıt ver, postayı arkada gönder) olurdu;
// o da Vercel'de yanıt sonrası işin çalışacağı garanti olmadığı için
// `waitUntil` gerektiriyor ve DOĞRULANMADI.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hesap varlığını ele veren uçlar için sabit süre tabanı (ms).
 *
 * Parola sıfırlama ve kayıt seyrek, kasıtlı eylemler — kullanıcı 1–2 saniyeyi
 * fark etmez. Sızıntı ile gecikme arasındaki takasta YUKARI yanılmak doğru
 * taraf: taban yüksekse bedeli nadir bir akışta biraz gecikme, düşükse bedeli
 * açığın açık kalması.
 */
export const HESAP_UCU_TABAN_MS = 1500;

/**
 * `baslangic`'tan bu yana geçen süre `hedefMs`'i doldurmadıysa bekler.
 *
 * Süre AŞILDIYSA beklemiyor (bekleyemez de) ama loga yazıyor — taban o istek
 * için işe yaramadı demektir ve bu bilgi tabanı ayarlamanın tek yolu.
 *
 * @param baslangic  `Date.now()` — işin başındaki damga
 * @param context    log satırında görünecek yer bilgisi (ör. 'auth/reset-password')
 * @param hedefMs    taban süre; varsayılan `HESAP_UCU_TABAN_MS`
 */
export async function sabitSureyeTamamla(baslangic, context, hedefMs = HESAP_UCU_TABAN_MS) {
  const gecen = Date.now() - baslangic;

  if (gecen >= hedefMs) {
    // Etiket ayırt edici ki log drain'de tek filtreyle yakalanabilsin.
    console.warn(`[SURE-ASIMI] ${context}: ${gecen}ms > taban ${hedefMs}ms — zamanlama koruması bu istekte yetersiz`);
    return;
  }

  await new Promise((coz) => setTimeout(coz, hedefMs - gecen));
}
