import { spacing } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Profil kapak ızgarasının ÖLÇÜSÜ — koleksiyon ve istek listesi sekmeleri.
// Hücrenin kendisi 2.0 `GameCardSmall` (ui/GameCards); burada yalnız sütun
// sayısı ve hücre genişliği hesaplanıyor.
//
// 2.0 (COMPONENTS §4): "GameCardSmall üç sütunda 16 boşlukla dizilir."
// 390 pt'de (390 − 2×20 kenar − 2×16 boşluk) / 3 = 106 — kitin game_s
// genişliğinin kendisi. Eski hücre 114 pt, 4 pt boşluk ve kapak üstünde
// perdeli addı; 2.0'da ad kapağın ALTINDA.
//
// GENİŞLİK PENCEREDEN HESAPLANIYOR, yazılmıyor. Sabit yazılsaydı dar cihazda
// ızgara taşardı — bu depoda TAM BU HATA bir kez oldu: profil ızgarası kenar
// payı ayrı bir sabite bağlıydı ve gövde dolgusu 16'dan 20'ye çekilince ızgara
// 8pt taşmıştı.
// ─────────────────────────────────────────────────────────────────────────────

export const GRID_GAP = spacing.s16;
export const GRID_PAD = spacing.s20;

// Kitin 390 pt'de verdiği hücre genişliği (game_s). IZGARANIN ÖLÇÜ BİRİMİ BU:
// geniş ekranda sütun sayısı artıyor, hücre boyu sabite yakın kalıyor.
const HEDEF_HUCRE = 106;

/**
 * Sütun sayısı — PENCEREDEN TÜRÜYOR, sabit değil.
 *
 * Sabit 3 iken iPad'de (820 pt) her hücre ~250 pt oluyordu: aynı sayıda kapak,
 * iki buçuk katı büyüklükte. Izgaranın işi çok kapağı bir arada göstermek;
 * geniş ekranda kazanılan yer HÜCREYE değil SÜTUNA gitmeli.
 *
 * Alt sınır 3: kitin sayısı. 375 pt'de hesap 2 verirdi; 3 sütunda hücre
 * 101 pt oluyor, 2 sütunda 157 — dar pencerede büyümek yerine hafif küçülmek
 * kitin yoğunluğunu koruyor.
 * Ölçüm: 375 → 3 (101) · 390 → 3 (106) · 411 → 3 (113) · 820 → 6 (117).
 */
export function gridCols(width) {
  const n = Math.floor((width - GRID_PAD * 2 + GRID_GAP) / (HEDEF_HUCRE + GRID_GAP));
  return Math.max(3, n);
}

/** Tek hücrenin genişliği (pt). Yükseklik kitin 106×142 oranından türüyor. */
export function coverWidth(windowWidth, cols = gridCols(windowWidth)) {
  const inner = windowWidth - GRID_PAD * 2;
  return (inner - GRID_GAP * (cols - 1)) / cols;
}
