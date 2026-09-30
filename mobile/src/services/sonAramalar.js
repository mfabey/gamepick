// ─────────────────────────────────────────────────────────────────────────────
// SON ARAMALAR — G-05 (27 Eyl). Yalnız CİHAZDA; sunucuya gitmiyor (trend
// listesine giden tek şey açılan oyunun appid'i, bkz. api/games →
// recordSearchPick). HESABA BAĞLI (scopedKey): başka hesaba geçince önceki
// kişinin aramaları görünmez. En çok 8, en yeni önce, büyük/küçük harf
// duyarsız tekil.
// ─────────────────────────────────────────────────────────────────────────────
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scopedKey, ownerReady, registerScopedStore } from './owner';

const KEY = 'gr_son_aramalar';
const MAX = 8;
const BOS = Object.freeze([]);

let liste = BOS;
let yuklendi = false;
let yukleme = null;
const dinleyiciler = new Set();
const yay = () => dinleyiciler.forEach((f) => f());

function yukle() {
  if (yuklendi) return Promise.resolve(liste);
  if (!yukleme) {
    yukleme = (async () => {
      await ownerReady();
      try {
        const raw = await AsyncStorage.getItem(scopedKey(KEY));
        const d = raw ? JSON.parse(raw) : [];
        if (Array.isArray(d)) liste = d.filter((x) => typeof x === 'string').slice(0, MAX);
      } catch { /* boş */ }
      yuklendi = true;
      yay();
      return liste;
    })();
  }
  return yukleme;
}

registerScopedStore({
  keys: [KEY],
  rebind: async () => { liste = BOS; yuklendi = false; yukleme = null; await yukle(); },
});

async function yaz(yeni) {
  liste = yeni;
  yay();
  try { await AsyncStorage.setItem(scopedKey(KEY), JSON.stringify(yeni)); } catch { /* bellekte kaldı */ }
}

export async function aramaEkle(q) {
  const s = String(q || '').trim().slice(0, 80);
  if (s.length < 2) return;
  await yukle();
  await yaz([s, ...liste.filter((x) => x.toLocaleLowerCase() !== s.toLocaleLowerCase())].slice(0, MAX));
}

export async function aramaSil(q) {
  await yukle();
  await yaz(liste.filter((x) => x !== q));
}

export async function aramalariTemizle() {
  await yaz([]);
}

function abone(f) { dinleyiciler.add(f); yukle(); return () => dinleyiciler.delete(f); }
export function useSonAramalar() {
  return useSyncExternalStore(abone, () => liste, () => liste);
}
