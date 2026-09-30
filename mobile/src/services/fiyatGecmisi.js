// ─────────────────────────────────────────────────────────────────────────────
// FİYAT GEÇMİŞİ HESAPLARI — G-08 (27 Eyl). Saf fonksiyonlar, bileşene bağlı değil.
//
// Girdi sunucunun (api/price-history) değişim GÜNLÜĞÜ: her kayıt fiyatın
// değiştiği an, zamana göre artan. Fiyat iki kayıt arasında SABİT (basamak
// fonksiyonu) — grafik de kit'teki gibi basamaklı çiziliyor.
//
// Örnekleme istemcide: aralık (3A/6A/1Y/Tümü) değiştirmek yeni istek
// gerektirmiyor.
// ─────────────────────────────────────────────────────────────────────────────

const GUN = 24 * 3600 * 1000;

export const ARALIKLAR = ['3m', '6m', '1y', 'all'];

/** t anındaki fiyat: t'ye kadarki son kayıt; t ilk kayıttan önceyse null. */
function fiyatAn(events, t) {
  let p = null;
  for (const e of events) { if (e.t <= t) p = e.price; else break; }
  return p;
}

/**
 * Grafiğin dilimleri. Her dilimin değeri dilim içindeki EN DÜŞÜK fiyat:
 * kısa bir indirim dilim ortasına düşse de grafikte görünsün.
 * @returns {{ values: number[], starts: number[] }} en az 2 dilim yoksa values boş
 */
export function seriOrnekle(events, aralik, now = Date.now()) {
  if (!events?.length) return { values: [], starts: [] };
  const ilk = events[0].t;
  let bas; let n;
  if (aralik === '3m') { bas = now - 91 * GUN; n = 13; }
  else if (aralik === '6m') { bas = now - 182 * GUN; n = 13; }
  else if (aralik === '1y') { bas = now - 365 * GUN; n = 12; }
  else { bas = ilk; n = Math.min(24, Math.max(6, Math.round((now - ilk) / (30 * GUN)))); }
  // Günlük aralıktan kısaysa grafik veri olan yerden başlıyor.
  bas = Math.max(bas, ilk);
  if (now - bas < 2 * GUN) return { values: [], starts: [] };
  const adim = (now - bas) / n;
  const values = []; const starts = [];
  for (let i = 0; i < n; i++) {
    const a = bas + i * adim; const b = a + adim;
    let enDusuk = fiyatAn(events, a);
    for (const e of events) if (e.t > a && e.t < b && (enDusuk == null || e.price < enDusuk)) enDusuk = e.price;
    if (enDusuk == null) continue;
    values.push(enDusuk); starts.push(a);
  }
  return values.length >= 2 ? { values, starts } : { values: [], starts: [] };
}

/** [from, to] aralığında zamana göre AĞIRLIKLI ortalama; veri yoksa null. */
export function ortalama(events, from, to = Date.now()) {
  if (!events?.length) return null;
  let toplam = 0; let sure = 0;
  let t = Math.max(from, events[0].t);
  let p = fiyatAn(events, t);
  for (const e of events) {
    if (e.t <= t) continue;
    if (e.t >= to) break;
    if (p != null) { toplam += p * (e.t - t); sure += e.t - t; }
    t = e.t; p = e.price;
  }
  if (p != null && to > t) { toplam += p * (to - t); sure += to - t; }
  return sure > 0 ? toplam / sure : null;
}

/** Son `pencere` içinde fiyat düştüyse düşüş miktarı, yoksa null. */
export function sonDusus(events, pencere = GUN, now = Date.now()) {
  if (!events || events.length < 2) return null;
  const son = events[events.length - 1];
  const onceki = events[events.length - 2];
  if (now - son.t > pencere || son.price >= onceki.price) return null;
  return onceki.price - son.price;
}

/**
 * Hedef fiyat adımı — GÖRÜNTÜ para biriminde "yuvarlak" bir sayı. ₺'de
 * 5/10/50/100, $'da 0,5/1/5/10: "₺499 → ₺509" yerine "₺500 → ₺510".
 */
export function hedefAdimi(gorunen, lira) {
  if (lira) return gorunen < 100 ? 5 : gorunen < 500 ? 10 : gorunen < 2000 ? 50 : 100;
  return gorunen < 5 ? 0.5 : gorunen < 20 ? 1 : gorunen < 100 ? 5 : 10;
}

/** Önerilen ilk hedef: güncel fiyatın %80'i, adıma yuvarlanmış (görüntü biriminde). */
export function onerilenHedef(gorunenFiyat, lira) {
  const adim = hedefAdimi(gorunenFiyat, lira);
  return Math.max(adim, Math.floor((gorunenFiyat * 0.8) / adim) * adim);
}
