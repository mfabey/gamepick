// ─────────────────────────────────────────────────────────────────────────────
// İPUCU BÜTÇESİ — şeridin ne zaman çıkabileceğine karar veren tek yer.
//
// Bu dosya ipucu GÖSTERMİYOR; yalnızca "gösterilebilir mi" sorusuna cevap
// veriyor. Kural mantığını bileşenden ayrı tutmanın sebebi, bütçenin
// tartışmanın asıl konusu olması: yönlendirme faydalı, ama aynı mekanizma
// kötü ayarlandığında uygulamanın en sinir bozucu parçasına dönüşüyor.
//
// ── DÖRT SINIR ──
//   1. AÇILIŞ BAŞINA BİR TANE. `buOturumda` kalıcı DEĞİL, bilerek: JS
//      yeniden yüklenince sıfırlanıyor. Kalıcı olsaydı "günde bir" gibi bir
//      takvim kuralı yazmak gerekirdi ve saat tutmak bu işi hak etmiyor.
//   2. GÖSTERİLEN İPUCU EMEKLİ. Bir kez görülen bir daha hiç çıkmıyor —
//      tekrar, bu tür şeritlerin en hızlı yıprattığı şey.
//   3. ÖMÜR BOYU ÜST SINIR (5). Katalogda şu an üç ipucu var, yani sınır
//      bugün ısırmıyor. Dördüncü ve beşinci eklendiğinde de toplamın
//      kullanıcı açısından "birkaç" olarak kalmasını garantiliyor.
//   4. ÜST ÜSTE İKİ KAPATMA → SİSTEM KALICI SUSAR. Kapatmak bir cevaptır:
//      iki kez alınan cevabın üçüncü kez sorulmaması gerekir.
//
// ── DOKUNMA SAYACI SIFIRLIYOR ──
// `kapatma` ARDIŞIK kapatmayı sayıyor, toplamı değil. Bir ipucuna dokunan
// kullanıcı sistemin işe yaradığını söylemiş oluyor; aylar önceki tek bir
// kapatma yüzünden sonraki ipuçlarını kaybetmesi yanlış olurdu.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gr_ipuclari';

const TOPLAM_SINIR = 5;
const KAPATMA_SINIR = 2;

let durum = null;              // null = henüz okunmadı
let buOturumda = false;        // OTURUM kapsamı — kalıcı değil (bkz. sınır 1)

// ABONELİK YOK, bilerek. Öteki depolar (onboarding, seen, collections) dinleyici
// tutuyor çünkü birden çok ekran onlara bakıyor. Buranın tek okuyucusu
// IpucuSeridi ve o da yalnız mount'ta bir kez okuyor: kullanılmayan bir
// subscribe yüzeyi, ilerde yanlışlıkla bağlanacak ölü bir kanca olurdu.

async function yaz() {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(durum)); } catch { /* bu oturumda geçerli kalır */ }
}

export async function loadIpuclari() {
  if (durum !== null) return durum;
  try {
    const ham = await AsyncStorage.getItem(KEY);
    const c = ham ? JSON.parse(ham) : null;
    // Alanlar TEK TEK doğrulanıyor: bozuk ya da eski biçimli bir kayıt
    // `gorulen.includes` çağrısında patlar ve şerit hiç çizilmezdi.
    durum = {
      gorulen: Array.isArray(c?.gorulen) ? c.gorulen : [],
      kapatma: Number.isFinite(c?.kapatma) ? c.kapatma : 0,
    };
  } catch {
    durum = { gorulen: [], kapatma: 0 };   // okunamadıysa temiz say
  }
  return durum;
}

/** Bugün, bu açılışta, herhangi bir ipucu gösterilebilir mi? */
export function ipucuVerilebilir() {
  if (durum === null) return false;        // okunmadan karar verilmez
  if (buOturumda) return false;
  if (durum.kapatma >= KAPATMA_SINIR) return false;
  if (durum.gorulen.length >= TOPLAM_SINIR) return false;
  return true;
}

export function gorulduMu(id) {
  return !!durum && durum.gorulen.includes(id);
}

export async function ipucuGosterildi(id) {
  if (!durum) return;
  buOturumda = true;
  if (!durum.gorulen.includes(id)) durum.gorulen.push(id);
  await yaz();
}

export async function ipucuKapatildi() {
  if (!durum) return;
  durum.kapatma += 1;
  await yaz();
}

export async function ipucuDokunuldu() {
  if (!durum || durum.kapatma === 0) return;
  durum.kapatma = 0;                       // ardışık seri kırıldı
  await yaz();
}

