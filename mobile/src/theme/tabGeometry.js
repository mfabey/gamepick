// Both platform bars overlay the scene; lists reserve the full occupied area.
//
// CANLI ÇUBUK (26 Eyl): Android de artık YÜZEN kapsül. Tam genişlik çubukta
// `bottom` 0'dı ve çubuk gezinme alanını kendi dolgusuyla kaplıyordu; yüzen
// kapsül gezinme alanının 8 ÜSTÜNDE duruyor (hareketle gezinme 24 + 8, üç
// düğmeli gezinme 48 + 8). `side` iki platformda kenar payı, `mini` bağlamda
// sekmelerin indiği dairenin ve aksesuar kapsülünün yüksekliği.
export function tabGeometry(platform, safeBottom, extra = 12) {
  const safe = Math.max(0, Number(safeBottom) || 0);
  const ios = platform === 'ios';
  const height = ios ? 62 : 64;
  const bottom = ios ? Math.max(safe - 13, 12) : safe + 8;
  const occupied = height + bottom;
  return {
    height,
    bottom,
    side: ios ? 20 : 16,
    mini: ios ? 52 : 56,
    occupied,
    contentInset: occupied + extra,
  };
}
