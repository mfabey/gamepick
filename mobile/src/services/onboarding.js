// ─────────────────────────────────────────────────────────────────────────────
// İlk açılış durumu — oyun seçimi ekranı bir kez gösterilir.
// Soğuk başlangıcı çözer: kullanıcı hiç gezinmeden kişiselleştirme aktif olur.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gr_onboarded';

let done = null;              // null = henüz okunmadı
const listeners = new Set();

function emit() { listeners.forEach((l) => l()); }

export async function loadOnboarding() {
  if (done !== null) return done;
  try {
    done = (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    done = false;             // okunamadıysa göster — kullanıcıyı boş ekranda bırakma
  }
  emit();
  return done;
}

export async function completeOnboarding() {
  done = true;
  try { await AsyncStorage.setItem(KEY, '1'); } catch { /* yine de bu oturumda geçildi say */ }
  emit();
}

// Ayarlardan "zevkini yeniden seç" için
export async function resetOnboarding() {
  done = false;
  try { await AsyncStorage.removeItem(KEY); } catch {}
  emit();
}

export function isOnboarded() { return done; }
export function subscribeOnboarding(cb) { listeners.add(cb); return () => listeners.delete(cb); }

// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ PERDESİ — AYRI BAYRAK, `gr_onboarded`'a YASLANMIYOR.
//
// Perde ilk yazıldığında kendi anahtarı yoktu: "bu ekran ömürde bir kez
// açılıyor, perde de onunla bir kez oynar" diye düşünülmüştü. YANLIŞTI.
// Ayarlar'daki "Zevkini yeniden seç" satırı `/onboarding`'e push ediyor
// (settings.jsx) ve `gr_onboarded`'a hiç dokunmuyor — yani ekran tekrar
// tekrar açılabiliyor. Sonuç: uygulamayı zaten bilen kullanıcı, ayarlardan
// her giriş yaptığında 4 saniyelik tanıtımı yeniden izliyordu.
//
// İki kavram gerçekten ayrı:
//   gr_onboarded → zevk seçimi YAPILDI mı (tekrarlanabilir bir eylem)
//   gr_perde     → tanıtım GÖSTERİLDİ mi (ömürde bir kez)
//
// Bayrağın kendi anahtarı olması, ileride eklenecek her giriş noktasını da
// kendiliğinden doğru kılıyor: çağıranın "perdeyi kapat" demeyi hatırlaması
// gerekmiyor.
// ─────────────────────────────────────────────────────────────────────────────
const PERDE_KEY = 'gr_perde';

let perde = null;             // null = henüz okunmadı

export async function loadPerde() {
  if (perde !== null) return perde;
  try {
    perde = (await AsyncStorage.getItem(PERDE_KEY)) === '1';
  } catch {
    perde = true;             // okunamadıysa GÖSTERME — tanıtımı tekrarlamak,
                              // hiç göstermemekten daha rahatsız edici.
  }
  return perde;
}

/** `null` = henüz okunmadı · `true` = gösterildi · `false` = hiç gösterilmedi */
export function perdeGorulduMu() { return perde; }

export async function perdeyiGorulduYaz() {
  perde = true;
  try { await AsyncStorage.setItem(PERDE_KEY, '1'); } catch { /* bu oturumda geçildi say */ }
}
