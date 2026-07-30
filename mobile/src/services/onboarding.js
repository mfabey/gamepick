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
