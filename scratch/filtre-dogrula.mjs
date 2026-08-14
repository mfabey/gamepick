#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// FİLTRE DOĞRULAMA — "bu sonuç RAWG'dan mı, yedek listeden mi?"
//
// NEDEN VAR. RAWG çökmüşken üretimi ölçtüm ve sonuçları RAWG sanıp üç yanlış
// sonuç çıkardım:
//   • "metacritic düzeltmem çalışıyor"  → 91–97 aralığı düzeltmeden değil,
//     yedek listenin metacritic'e göre azalan varsayılan sıralamasından geldi
//   • "12 türün 11'i yedeğe düşüyor"    → 12'si de düşüyordu, sebep slug değil
//     RAWG'ın erişilemez olmasıydı
//   • "action RAWG'dan geliyor"         → 73, yedeğin Aksiyon sayısıymış
//
// Yanıt gövdesinde "bu yedek" diyen bir alan YOK; ikisi de
// source='rawg-steam-merge' döndürüyor. Ayırt etmenin tek yolu PARMAK İZİ:
// yedek listenin tür sayıları sabit ve bilinen.
//
// Kullanım:  node scratch/filtre-dogrula.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

const BASE = 'https://www.gamerisen.com';

// FALLBACK_GAMES parmak izi — app/lib/fallback-games.js'ten ÇALIŞMA ANINDA
// okunuyor, elle yazılmıyor: liste büyürse bu betik sessizce yanılmasın.
const src = readFileSync(new URL('../app/lib/fallback-games.js', import.meta.url), 'utf8');
const TR = {
  action: 'Aksiyon', 'role-playing-games-rpg': 'RPG', strategy: 'Strateji',
  adventure: 'Macera', shooter: 'Nişancı', puzzle: 'Bulmaca', sports: 'Spor',
  racing: 'Yarış', horror: 'Korku', platformer: 'Platform',
  card: 'Kart & Masa', simulation: 'Simülasyon',
};
const sayim = {};
for (const m of src.matchAll(/genres:\s*\[([^\]]*)\]/g)) {
  for (const g of m[1].matchAll(/'([^']+)'/g)) sayim[g[1]] = (sayim[g[1]] || 0) + 1;
}
const TOPLAM = [...src.matchAll(/rawgSlug:\s*'/g)].length;

async function rawgAyakta() {
  try {
    const c = new AbortController();
    const zaman = setTimeout(() => c.abort(), 10000);
    const r = await fetch('https://api.rawg.io/api/games?page_size=1', { signal: c.signal });
    clearTimeout(zaman);
    return `HTTP ${r.status} (ayakta)`;
  } catch {
    return 'ERISILEMIYOR';
  }
}

async function sor(qs) {
  const r = await fetch(`${BASE}/api/games?num=24&${qs}`);
  const d = await r.json();
  const mcs = (d.results || []).map((g) => g.metacritic).filter(Boolean).sort((a, b) => a - b);
  return { total: d.total, n: (d.results || []).length, lo: mcs[0], hi: mcs[mcs.length - 1], mcs };
}

/** total, yedek listenin bilinen bir sayısına eşitse yedekten gelmiştir. */
function kaynak(qs, total) {
  if (total === TOPLAM) return 'YEDEK (tum liste)';
  const tur = /genres=([\w-]+)/.exec(qs)?.[1];
  if (tur && sayim[TR[tur]] === total) return `YEDEK (${TR[tur]}=${total})`;
  return 'RAWG';
}

console.log(`RAWG: ${await rawgAyakta()}`);
console.log(`yedek liste: ${TOPLAM} oyun\n`);

const SORGULAR = [
  'metacritic=90',
  'section=topscore&metacritic=90',
  'genres=role-playing-games-rpg',
  'genres=role-playing-games-rpg&metacritic=90',
  'genres=action&metacritic=90',
  'store=epic',
  'tags=open-world,souls-like',
];

let mcKanit = null;
for (const qs of SORGULAR) {
  const r = await sor(qs);
  const k = kaynak(qs, r.total);
  const esik = /metacritic=(\d+)/.exec(qs)?.[1];
  const ihlal = esik ? r.mcs.filter((m) => m < Number(esik)).length : null;
  console.log(
    `${qs.padEnd(42)} total=${String(r.total).padEnd(5)} puan ${r.lo ?? '-'}-${r.hi ?? '-'}` +
    (ihlal === null ? '' : `  esik alti=${ihlal}`) + `   ${k}`
  );
  if (qs === 'genres=role-playing-games-rpg&metacritic=90' && k === 'RAWG') {
    mcKanit = ihlal === 0;
  }
}

console.log('\n── SONUC ──');
if (mcKanit === null) {
  console.log('metacritic duzeltmesi: DOGRULANAMADI — sorgu RAWG\'a ulasmadi.');
} else if (mcKanit) {
  console.log('metacritic duzeltmesi: DOGRULANDI — tur + esik birlikteyken esik alti sonuc yok.');
} else {
  console.log('metacritic duzeltmesi: BASARISIZ — esik alti sonuclar hala geliyor.');
}
