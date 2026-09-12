// ─────────────────────────────────────────────────────────────────────────────
// GİDEN POSTA HACMİ — YALNIZCA ÖLÇÜM (Aşama E, gözlem adımı).
//
// NEDEN: `register`, `resend-verification` ve `reset-password` Firebase
// üzerinden posta gönderiyor. Hız sınırları IP ve adres başına tavan koyuyor
// ama TOPLAM hacmi bağlamıyor: bugünkü sınırlarla tek IP'den ~600 posta/gün
// çıkabiliyor, ucuz bir vekil havuzuyla bunun katları.
//
// Asıl risk fatura değil, FIREBASE KİMLİK KOTASININ TÜKENMESİ: kota bitince
// meşru kullanıcı parolasını sıfırlayamaz.
//
// ── BU DOSYA HİÇBİR ŞEYİ ENGELLEMİYOR ───────────────────────────────────────
// Sert tavan ve alarm eşiği BİLEREK KONMADI: bu depoda üretim posta hacmi
// hiç ölçülmedi. Uydurulmuş bir tavan ya erken tetikler (meşru kullanıcıyı
// kilitler) ya da hiç tetiklemez. Önce ölç, sonra eşiği ölçümden koy —
// CLAUDE.md'deki "tahmin değil ölçüm" kuralı burada birebir geçerli.
//
// SIRADAKİ ADIM (bir haftalık veri toplandıktan sonra):
//   `npm run metrics:mail` ile p95 günü oku, sert tavanı ~10 katına, alarm
//   eşiğini ~3 katına koy. Sert tavan `reset-password` için AYRI ve daha
//   yüksek bir kovada olmalı — global tavanı yakan saldırgan meşru
//   kullanıcıların parola sıfırlamasını da kilitler.
//
// ── BU ÖLÇÜM İKİNCİ BİR SORUYU DA CEVAPLIYOR: CİHAZ EKSENİ ──────────────────
// Hız sınırına üçüncü bir eksen (cihaz başına kota) eklemek değerlendirildi
// ve 2026-09-03'te ERTELENDİ. Gerekçe ölçülebilir:
//
//   • IPv6 /64 kırpması (client-ip.js) eklendikten SONRA IP ekseni gerçekten
//     çalışıyor. Yeni bir IP kovası almak vekil gerektiriyor.
//   • Cihaz ekseninde yeni bir kova almak TEK BİR FAZLADAN İSTEK — çerezi
//     almak için bir sayfa yüklemesi. Yani yanına konacağı eksenden kat kat
//     zayıf.
//   • Bedeli ise somut: her ziyaretçiye kalıcı bir tanımlayıcı yazmak.
//
// Cihaz ekseninin asıl faydası güvenlik değil, ORTAK NAT AYRIMI: "tek
// cihazdan 50 istek" ile "50 cihazdan 50 istek"i ayırıp IP sınırlarını
// gevşetebilmek. Böyle bir sorun yaşandığına dair veri YOK.
//
// KARAR KURALI: bu ölçüm ve 429 logları, ortak NAT yüzünden meşru
// kullanıcıların engellendiğini gösterirse cihaz ekseninin gerçek bir
// gerekçesi olur. Göstermezse gerekmez ve kalıcı tanımlayıcı hiç yazılmaz.
//
// ── NE SAYILIYOR ────────────────────────────────────────────────────────────
// İSTEK DEĞİL, GERÇEKTEN GİDEN POSTA. Üç uç da gönderimin olup olmadığını
// ayırt edebiliyor (`sendOobCode` yanıtının `ok`'u; `reset-password`'de
// ayrıca `EMAIL_NOT_FOUND` = posta gitmedi). Çağrılar o ayrımdan SONRA
// yapılıyor.
// ─────────────────────────────────────────────────────────────────────────────

import { redisCmd, hasRedis } from './redis';

const TTL_SEC = 60 * 24 * 3600;   // 60 gün — geriye dönük p95 hesaplanabilsin

// Kilometre taşları: hacim bunlardan birini geçtiğinde loga ayırt edici bir
// satır düşüyor. Taban bilinmediği için geniş aralıklı — amaç eşik
// uygulamak değil, anormal günü betiği kimse çalıştırmadan görünür kılmak.
const TASLAR = [100, 250, 500, 1000, 2000, 5000, 10000];

/** UTC gün anahtarı — sunucu saat dilimine bağlı kalmasın. */
function gunAnahtari(d = new Date()) {
  return d.toISOString().slice(0, 10);   // YYYY-AA-GG
}

export const mailGunKey = (gun = gunAnahtari()) => `metrics:mail:${gun}`;

/**
 * Bir giden postayı kaydeder.
 *
 * ASLA FIRLATMAZ, ASLA ENGELLEMEZ. Ölçüm bir yan iş; sayaç yazılamadıysa
 * kullanıcının işlemi bundan etkilenmemeli.
 *
 * `await` EDİLMESİ ŞART DEĞİL — çağıranlar beklemeden geçebilir. Yine de
 * `void` ile çağırmak yerine `await` edilirse iki Redis turu ekler; posta
 * gönderimi zaten seyrek olduğu için bu maliyet önemsiz.
 *
 * @param tur  'register' | 'verifyResend' | 'passwordReset' — kırılım için
 */
export async function kaydetPostaGonderimi(tur) {
  if (!hasRedis()) return;
  try {
    const gun = gunAnahtari();
    const anahtar = mailGunKey(gun);

    const ham = await redisCmd(['INCR', anahtar]);
    if (ham === null) return;              // Redis erişilemedi → sessizce geç
    const sayi = Number(ham) || 0;

    // TTL yalnızca günün İLK gönderiminde kuruluyor (rate-limit.js ile aynı
    // gerekçe: her yazımda EXPIRE pencereyi sürekli uzatır).
    if (sayi === 1) {
      redisCmd(['EXPIRE', anahtar, String(TTL_SEC)]).catch(() => {});
    }

    // Tür kırılımı: hangi ucun hacim doğurduğunu görmek için. Ayrı anahtar,
    // aynı gün, aynı ömür.
    if (tur) {
      const turAnahtar = `${anahtar}:${tur}`;
      redisCmd(['INCR', turAnahtar])
        .then((t) => {
          if (Number(t) === 1) return redisCmd(['EXPIRE', turAnahtar, String(TTL_SEC)]);
        })
        .catch(() => {});
    }

    // Kilometre taşı geçildi mi? TAM EŞİTLİK aranıyor: her istekte değil,
    // yalnız geçiş anında bir satır düşsün.
    if (TASLAR.includes(sayi)) {
      // console.warn Vercel loglarına düşüyor. Etiket ayırt edici ki log
      // drain'de tek bir filtreyle alarm bağlanabilsin.
      console.warn(`[MAIL-HACMI] ${gun} günü giden posta sayısı ${sayi}'e ulaştı (tür=${tur || 'bilinmiyor'})`);
    }
  } catch {
    /* ölçüm başarısız olduysa işlem yine de tamamlanmalı */
  }
}
