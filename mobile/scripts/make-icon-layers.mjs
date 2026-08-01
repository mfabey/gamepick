import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const SRC = 'assets/icon.png';
const OUT_DIR = 'assets/icon-layers';
fs.mkdirSync(OUT_DIR, { recursive: true });

const img = await Jimp.read(SRC);
const W = img.bitmap.width, H = img.bitmap.height;
console.log('kaynak: ' + W + 'x' + H);

// ── 1) ÖN PLAN KATMANI ────────────────────────────────────────────────────
// Logo siyah zemine yapışık. Ayırırken iki tuzak var:
//
//  a) Alfa için PARLAKLIK kullanılamaz. Kırmızının parlaklığı düşüktür
//     (0.2126 ağırlık), o yüzden kırmızı yarı saydam kalıp soluk pembeye döner.
//     Onun yerine EN YÜKSEK KANAL kullanılıyor: doygun kırmızı da tam opak olur.
//
//  b) Kenar pikselleri siyahla harmanlanmış (premultiplied) geliyor. Alfa
//     verilip renk düzeltilmezse kenarlar kirli/koyu kalır. RGB alfaya
//     bölünerek harmanlama geri alınıyor.
const EDGE = 40;   // bu değerin altı kenar rampası sayılır

const fg = img.clone();
fg.scan(0, 0, W, H, function (x, y, idx) {
  const d = this.bitmap.data;
  const r = d[idx], g = d[idx + 1], b = d[idx + 2];
  const maxc = Math.max(r, g, b);

  if (maxc <= 2) { d[idx + 3] = 0; return; }              // saf zemin
  const a = maxc >= EDGE ? 255 : Math.round((maxc / EDGE) * 255);
  d[idx + 3] = a;

  if (a > 0 && a < 255) {                                  // premultiply geri al
    const k = 255 / a;
    d[idx]     = Math.min(255, Math.round(r * k));
    d[idx + 1] = Math.min(255, Math.round(g * k));
    d[idx + 2] = Math.min(255, Math.round(b * k));
  }
});
await fg.writeAsync(path.join(OUT_DIR, 'foreground.png'));
console.log('yazildi: ' + OUT_DIR + '/foreground.png  (saydam zemin, logo isareti)');

// ── 2) ARKA PLAN KATMANI ──────────────────────────────────────────────────
// Icon Composer arka planı ayrı ister.
// DİKKAT: Buraya sahte cam parlaması KOYULMAZ — specular highlight, refraction
// ve translucency'yi SİSTEM uyguluyor (Apple HIG, "App icons"). Elle eklenirse
// iki efekt üst üste biner ve ikon bozuk görünür.
const bg = new Jimp(W, H, 0x000000ff);
await bg.writeAsync(path.join(OUT_DIR, 'background.png'));
console.log('yazildi: ' + OUT_DIR + '/background.png   (duz marka zemini)');

// ── 3) TINTED GÖRÜNÜM ─────────────────────────────────────────────────────
// iOS "tinted" modda ikonu tek renge indirger; gri tonlamalı sürüm vermek
// sistemin renklendirmeyi doğru yapmasını sağlar.
const tinted = img.clone().greyscale().contrast(0.25);
await tinted.writeAsync('assets/icon-tinted.png');
console.log('yazildi: assets/icon-tinted.png          (tinted gorunum)');

// ── Doğrulama: renk gerçekten korunmuş mu? ────────────────────────────────
const check = await Jimp.read(path.join(OUT_DIR, 'foreground.png'));
const probe = (x, y) => {
  const p = Jimp.intToRGBA(check.getPixelColor(x, y));
  return 'rgba(' + p.r + ',' + p.g + ',' + p.b + ',' + p.a + ')';
};
console.log('\ndogrulama:');
console.log('  kose (zemin, a=0 olmali) : ' + probe(10, 10));
console.log('  kirmizi bolge            : ' + probe(390, 300));
console.log('  beyaz bolge              : ' + probe(520, 700));
