// ─────────────────────────────────────────────────────────────────────────────
// Bağlam menüsünün konumu.
//
// SAF FONKSİYON, bileşenin içinde değil. Sebebi ölçülebilirlik: menünün ekran
// dışına taşıp taşmadığını gözle kontrol etmek, elde her cihaz boyutunu
// denemek demek. Burada sayıyla sınanıyor.
//
// KURAL SIRASI önemli:
//   1. Yatayda menü baloncuğun HİZASINA gelir — kendi mesajımda sağ kenara,
//      karşı tarafınkinde sol kenara. Menü hangi mesaja ait olduğunu
//      konumuyla söylemeli, bir ok işaretiyle değil.
//   2. Dikeyde ÖNCE ALTINA denenir. Altına sığmıyorsa üstüne geçer; ikisi de
//      sığmıyorsa güvenli alanın içine kelepçelenir.
//   3. Kelepçeleme HER ZAMAN son adım. Hizalama kelepçelemeyi ezemez, aksi
//      hâlde ekranın kenarındaki bir baloncukta menünün yarısı dışarıda kalır.
//
// `placement` dönüyor çünkü menü açılırken hangi yönden büyüyeceğini bilmeli:
// altına açılan menü yukarıdan, üstüne açılan aşağıdan büyümeli — tersi
// hareketin nereden çıktığını yanlış anlatır.
// ─────────────────────────────────────────────────────────────────────────────

/** Ekran kenarıyla menü arasındaki en küçük boşluk. */
export const EDGE_PAD = 12;
/** Baloncukla menü arasındaki boşluk. */
export const GAP = 8;

/**
 * @param {object} p
 * @param {{x:number,y:number,width:number,height:number}} p.bubble  pencere koordinatı
 * @param {{width:number,height:number}} p.menu
 * @param {{width:number,height:number}} p.screen
 * @param {{top:number,bottom:number}} [p.insets]
 * @param {boolean} p.mine  kendi mesajım mı (yatay hizayı belirler)
 * @returns {{x:number, y:number, placement:'below'|'above'}}
 */
export function anchorMenu({ bubble, menu, screen, insets = { top: 0, bottom: 0 }, mine }) {
  const top    = (insets.top || 0) + EDGE_PAD;
  const bottom = screen.height - (insets.bottom || 0) - EDGE_PAD;

  // ── Yatay ──
  let x = mine
    ? bubble.x + bubble.width - menu.width   // sağ kenarlar hizalı
    : bubble.x;                              // sol kenarlar hizalı
  const maxX = screen.width - menu.width - EDGE_PAD;
  x = Math.min(Math.max(x, EDGE_PAD), Math.max(EDGE_PAD, maxX));

  // ── Dikey ──
  const below = bubble.y + bubble.height + GAP;
  const above = bubble.y - menu.height - GAP;

  let y;
  let placement;
  if (below + menu.height <= bottom) {
    y = below;
    placement = 'below';
  } else if (above >= top) {
    y = above;
    placement = 'above';
  } else {
    // İkisi de sığmıyor (uzun menü / küçük ekran / açık klavye). Daha çok yer
    // hangi taraftaysa oraya yaslanıp güvenli alana kelepçeliyoruz — menünün
    // kırpılması, ekran dışına taşmasından iyidir.
    const roomBelow = bottom - below;
    const roomAbove = bubble.y - GAP - top;
    placement = roomBelow >= roomAbove ? 'below' : 'above';
    y = placement === 'below' ? below : above;
  }
  y = Math.min(Math.max(y, top), Math.max(top, bottom - menu.height));

  return { x: Math.round(x), y: Math.round(y), placement };
}
