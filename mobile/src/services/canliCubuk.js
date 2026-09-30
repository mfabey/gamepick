// ─────────────────────────────────────────────────────────────────────────────
// CANLI ÇUBUK — paylaşılan küçük durum (26 Eyl tasarımı)
//
// İki şey tutuluyor, ikisi de hiçbir şey ÇİZDİRMİYOR, yalnız okunuyor:
//
// 1. CANLI OLAY. Uygulama açıkken gelen `price-alert` ve `dm` push'ları, bir
//    çubuk ekrandayken sistem afişi yerine çubuğun üstündeki kapsülde
//    gösteriliyor. 4 sn sonra kendini kapatıyor. Aynı olay oturumda bir kez.
//
// 2. ÇUBUK SAHİPLERİ. Kapsülü çizebilecek yüzeyler (sekme çubuğu, Reels,
//    oyun detayı) odaktayken kendini sayıyor. Sayı 0'sa — ör. Ayarlar'dayken —
//    bildirim işleyicisi afişi GÖSTERMEYE devam ediyor; yoksa olay görünmeden
//    kaybolurdu.
//
// Aktif sekme de burada: sekme dışı ekranlardaki daire, dönülecek sekmenin
// ikonunu gösteriyor.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useSyncExternalStore } from 'react';

export const OLAY_SURE_MS = 4000;

let olay = null;          // { id, tur: 'fiyat' | 'mesaj', baslik, metin, veri }
let zamanlayici = null;
let sahipSayisi = 0;
let aktifSekme = 'index';
const gosterilenler = new Set();
const dinleyiciler = new Set();

function yay() { dinleyiciler.forEach((fn) => fn()); }
function abone(fn) { dinleyiciler.add(fn); return () => dinleyiciler.delete(fn); }

/** Bir kapsül ekranda mı? Bildirim işleyicisi afişi buna göre bastırıyor. */
export function cubukGorunur() { return sahipSayisi > 0; }

/**
 * Odaktaki çubuk sahibi kendini sayar. `aktif` false olunca (odak gidince)
 * sayıdan düşer. Sekme çubuğu, Reels ve oyun detayı çağırıyor.
 */
export function useCubukSahibi(aktif) {
  useEffect(() => {
    if (!aktif) return undefined;
    sahipSayisi += 1;
    return () => { sahipSayisi = Math.max(0, sahipSayisi - 1); };
  }, [aktif]);
}

/**
 * Olayı göster. `anahtar` aynı olayın oturumda ikinci kez çıkmasını önlüyor
 * (cron aynı indirimi yeniden gönderebilir). Gösterildiyse true döner.
 */
export function canliOlayGoster({ anahtar, tur, baslik, metin, veri }) {
  if (anahtar) {
    if (gosterilenler.has(anahtar)) return false;
    gosterilenler.add(anahtar);
  }
  olay = { id: Date.now(), tur, baslik: baslik || '', metin: metin || '', veri: veri || {} };
  if (zamanlayici) clearTimeout(zamanlayici);
  zamanlayici = setTimeout(canliOlayKapat, OLAY_SURE_MS);
  yay();
  return true;
}

export function canliOlayKapat() {
  if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
  if (!olay) return;
  olay = null;
  yay();
}

export function useCanliOlay() {
  return useSyncExternalStore(abone, () => olay, () => olay);
}

/** Sekme çubuğu seçim değişince yazar. */
export function aktifSekmeYaz(ad) {
  if (!ad || ad === aktifSekme) return;
  aktifSekme = ad;
  yay();
}

export function useAktifSekme() {
  return useSyncExternalStore(abone, () => aktifSekme, () => aktifSekme);
}
