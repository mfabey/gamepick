// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ PERDESİ DURUMU — tanıtım ömürde bir kez gösterilir.
//
// Bu dosya `services/onboarding.js`'in yerine geçti. Eskisi iki ayrı şeyi
// tutuyordu: zevk seçimi yapıldı mı (`gr_onboarded`) ve tanıtım gösterildi mi
// (`gr_perde`). Zevk seçimi ekranı kalkınca birincinin konusu kalmadı.
//
// `gr_onboarded` anahtarı mevcut kurulumlarda DEPODA KALIYOR ve kimse
// okumuyor. Silme göçü yazılmadı: bir kullanıcının cihazından veri silmek,
// okunmayan birkaç baytı temizlemekten daha riskli bir iş.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gr_perde';

let perde = null;             // null = henüz okunmadı
let okuma = null;             // uçuştaki okuma (tekilleştirme)

export async function loadPerde() {
  if (perde !== null) return perde;
  // TEKİLLEŞTİRME: iki çağıran var — kök düzen (perdeyi indirmek için) ve
  // (tabs) düzeni (tanıtımı çizmek için). İkisi de açılışta çalışıyor;
  // paylaşılan söz olmadan aynı anahtar iki kez okunurdu.
  if (!okuma) {
    okuma = AsyncStorage.getItem(KEY)
      .then((v) => { perde = v === '1'; return perde; })
      .catch(() => {
        perde = true;         // okunamadıysa GÖSTERME — tanıtımı tekrarlamak,
        return perde;         // hiç göstermemekten daha rahatsız edici.
      });
  }
  return okuma;
}

/** `null` = henüz okunmadı · `true` = gösterildi · `false` = hiç gösterilmedi */
export function perdeGorulduMu() { return perde; }

export async function perdeyiGorulduYaz() {
  perde = true;
  try { await AsyncStorage.setItem(KEY, '1'); } catch { /* bu oturumda geçildi say */ }
}
