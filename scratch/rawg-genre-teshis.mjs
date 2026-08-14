#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// RAWG TÜR SORGUSU TEŞHİSİ
//
// Üretimde ölçüldü: 12 türün 11'inde /api/games istek RAWG'dan BOŞ dönüyor ve
// route.js:800'deki `if (results.length === 0)` yedek yoluna düşüyor. O yol
// yalnız tür/ücretsiz/arama süzüyor — mağaza, puan ve etiket sessizce yok
// sayılıyor.
//
//   genres=role-playing-games-rpg          → total 26   (yedek havuz)
//   genres=role-playing-games-rpg&mc=90    → total 26   (aynı, puan işlemiyor)
//   metacritic=90 (türsüz)                 → total 122  (RAWG, 91–97) ✓
//
// Bu betik iki soruyu ayırıyor:
//   1. RAWG'ın KENDİSİ mi boş dönüyor?
//   2. Yoksa RAWG doluyor da uygulamanın kendi süzgeçleri mi hepsini eliyor?
//      (isAdultContent · isDlc · hasStores · KNOWN_DELISTED_SLUGS)
//
// Sonra parametreleri tek tek çıkarıp hangisinin sonucu sıfırladığını buluyor.
//
// Kullanım:  node scratch/rawg-genre-teshis.mjs [tür-slug]
// Anahtar .env.local'dan okunuyor; ekrana YAZILMIYOR.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

const TUR = process.argv[2] || 'role-playing-games-rpg';

let KEY;
try {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  KEY = env.match(/^RAWG_API_KEY\s*=\s*(.+)$/m)?.[1]?.trim();
} catch {
  console.error('.env.local bulunamadi. .env.local.example dosyasini kopyalayip');
  console.error('RAWG_API_KEY satirini doldur.');
  process.exit(1);
}
if (!KEY || KEY.startsWith('buraya')) {
  console.error('.env.local icinde RAWG_API_KEY dolu degil.');
  process.exit(1);
}

const BASE = 'https://api.rawg.io/api';

async function sor(params) {
  const u = new URL(BASE + '/games');
  u.searchParams.set('key', KEY);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const r = await fetch(u);
  if (!r.ok) return { hata: `HTTP ${r.status}`, count: 0, results: [] };
  const d = await r.json();
  return { count: d.count ?? 0, results: d.results || [] };
}

// route.js'in tür sorgusu icin kurdugu TAM parametre kumesi
// (genres && !section dali: ordering '-rating', metacritic '60,100')
const TAM = {
  platforms: 4,
  page: 1,
  page_size: 24,
  exclude_additions: true,
  genres: TUR,
  ordering: '-rating',
  metacritic: '60,100',
};

console.log(`tur: ${TUR}\n`);

// ── 1. Tam kume ──
const tam = await sor(TAM);
console.log(`TAM KUME            → RAWG count=${tam.count}, donen=${tam.results.length}${tam.hata ? '  ' + tam.hata : ''}`);

// ── 2. Uygulamanin kendi suzgecleri kacini eliyor ──
if (tam.results.length) {
  const storesVar = tam.results.filter((g) => g.stores && g.stores.length > 0);
  const dlc = tam.results.filter((g) => g.tags?.some((t) => t.slug === 'dlc' || t.slug === 'soundtrack'));
  console.log(`  stores dolu olan  : ${storesVar.length}/${tam.results.length}   ← hasStores suzgeci bunu ariyor`);
  console.log(`  dlc/soundtrack    : ${dlc.length}`);
  if (storesVar.length === 0) {
    console.log('\n  >>> RAWG SONUC DONUYOR ama hicbirinde `stores` alani yok.');
    console.log('  >>> route.js: filteredRawg = rawgResults.filter(g => g.hasStores) → hepsi eleniyor.');
    console.log('  >>> RAWG liste ucu stores alanini her zaman doldurmuyor.');
  }
}

// ── 3. Hangi parametre sifirliyor ──
console.log('\nPARAMETRELERI TEK TEK CIKAR:');
for (const cikar of ['genres', 'ordering', 'metacritic', 'exclude_additions', 'platforms']) {
  const p = { ...TAM };
  delete p[cikar];
  const r = await sor(p);
  console.log(`  -${cikar.padEnd(18)} → count=${r.count}`);
}

// ── 4. Tur slug'i RAWG'da var mi ──
const u = new URL(BASE + '/genres');
u.searchParams.set('key', KEY);
const gr = await fetch(u).then((r) => r.json()).catch(() => null);
const slugs = (gr?.results || []).map((g) => g.slug);
console.log(`\nRAWG tur slug listesi (${slugs.length}): ${slugs.join(', ')}`);
console.log(`"${TUR}" listede mi: ${slugs.includes(TUR) ? 'EVET' : 'HAYIR  ← sorun burada olabilir'}`);
