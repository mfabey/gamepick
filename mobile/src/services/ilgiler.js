// ─────────────────────────────────────────────────────────────────────────────
// İLGİ ALANLARI — G-02b (27 Eyl)
//
// Tanıtımın ikinci adımı ve Ayarlar → İlgi alanları. Üç liste: platformlar,
// türler, takip edilen mağazalar. HESABA BAĞLI (scopedKey): hesap değişince
// başka kişinin seçimleri görünmez (bkz. owner.js, dismissStore ile aynı kalıp).
//
// TÜRLER ZEVK PROFİLİNE YAZILIYOR — seçimin asıl etkisi bu. `recordSignal`
// 'pick' ağırlığıyla (4): tek bir istek listesi ekleme (3) kadar güçlü, ama
// kullanıcı oynadıkça/beğendikçe davranış sinyalleri hızla geçiyor. Yalnız
// YENİ seçilen türler yazılıyor; ikinci kaydetmede aynı tür tekrar
// eklenmiyor, yoksa her kayıt profili aynı yöne biraz daha iterdi.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey, ownerReady, registerScopedStore } from './owner';
import { recordSignal } from './tasteProfile';

const STORAGE_KEY = 'gr_ilgiler';
const BOS = Object.freeze({ platformlar: [], turler: [], magazalar: [], kaydedildi: 0 });

// Seçenekler. Türler zevk profilinin KANONİK adları (recommend.js GENRE_CANON);
// etiketleri genre.* çevirilerinden geliyor.
export const PLATFORMLAR = ['pc', 'playstation', 'xbox', 'switch', 'mobile'];
export const TURLER = ['RPG', 'Action', 'Adventure', 'Strategy', 'Shooter', 'Indie',
  'Simulation', 'Horror', 'Sports', 'Racing', 'Puzzle', 'Platformer', 'Fighting'];
export const MAGAZALAR = ['Steam', 'Epic Games', 'GOG', 'PlayStation Store', 'Xbox Store'];

let ilgiler = BOS;
let yuklendi = false;
let yukleme = null;
const dinleyiciler = new Set();
function yay() { dinleyiciler.forEach((f) => f()); }

export function ilgileriYukle() {
  if (yuklendi) return Promise.resolve(ilgiler);
  if (!yukleme) {
    yukleme = (async () => {
      await ownerReady();
      try {
        const raw = await AsyncStorage.getItem(scopedKey(STORAGE_KEY));
        if (raw) ilgiler = { ...BOS, ...(JSON.parse(raw) || {}) };
      } catch { /* boş seçimle devam */ }
      yuklendi = true;
      yay();
      return ilgiler;
    })();
  }
  return yukleme;
}

registerScopedStore({
  keys: [STORAGE_KEY],
  rebind: async () => { ilgiler = BOS; yuklendi = false; yukleme = null; await ilgileriYukle(); },
});

/** Seçimleri kaydeder; yeni seçilen türleri zevk profiline 'pick' olarak yazar. */
export async function ilgileriKaydet({ platformlar = [], turler = [], magazalar = [] }) {
  if (!yuklendi) await ilgileriYukle();
  const yeniTurler = turler.filter((g) => !ilgiler.turler.includes(g));
  ilgiler = { platformlar, turler, magazalar, kaydedildi: Date.now() };
  yay();
  try { await AsyncStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(ilgiler)); } catch { /* bellekte kaldı */ }
  if (yeniTurler.length) await recordSignal({ genres: yeniTurler, type: 'pick' });
}

function abone(f) { dinleyiciler.add(f); ilgileriYukle(); return () => dinleyiciler.delete(f); }
export function useIlgiler() {
  return useSyncExternalStore(abone, () => ilgiler, () => ilgiler);
}
