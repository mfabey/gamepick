#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// GİZLİ ANAHTAR DENETLEYİCİSİ: build kapısı.
//
// NEDEN VAR: ef0c04c'de Riot API anahtarı `process.env.RIOT_API_KEY || '...'`
// biçiminde kaynağa gömüldü ve public repoya push edildi. Anahtar yenilendi;
// bu denetleyici aynı hatanın üretime gitmesini build aşamasında durdurur.
//
// NE ARANIYOR: sağlayıcıların SABİT ÖNEKLİ anahtar biçimleri (Riot, Google,
// Groq, OpenAI, Anthropic, GitHub, AWS, Stripe, Slack, Vercel Blob) ve PEM
// özel anahtar blokları. Steam anahtarı gibi önek taşımayan 32 haneli hex
// dizgeleri bilerek ARANMIYOR: her yerde geçen hash'lerle karışıp sahte alarm
// üretir, sahte alarm veren denetleyici de bir süre sonra kapatılır.
//
// NEREDE: git'in izlediği dosyalar (`git ls-files`). Git yoksa (ör. bazı CI
// ortamları) depo ağacı taranır; `.env*`, node_modules, .next gibi yerler
// her iki durumda da atlanır.
//
// MUAFİYET: herkese açık olması TASARIM GEREĞİ olan bir değer (ör. Firebase
// web yapılandırmasındaki `AIza...` anahtarı) için satıra
// `secret-scan: allow` yorumu eklenir. Muafiyet satır bazında ve görünür
// olsun diye dosya bazında muafiyet listesi YOK.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep, basename } from 'node:path';

const ROOT = process.cwd();
const ATLANAN_DIZIN = new Set([
  'node_modules', '.next', '.git', '.idea', '.vscode', '.expo', '.vercel',
  'Pods', 'build', 'dist', 'coverage', 'output', 'scratch',
]);
const IKILI_UZANTI = /\.(png|jpe?g|gif|webp|ico|svg|mp4|mov|webm|mp3|wav|ttf|otf|woff2?|eot|pdf|zip|gz|tgz|jar|keystore|jks|p12|aab|apk|ipa|DS_Store)$/i;
const AZAMI_BOYUT = 2 * 1024 * 1024;

const KALIPLAR = [
  { ad: 'Riot API anahtarı',      re: /RGAPI-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
  { ad: 'Google API anahtarı',    re: /AIza[0-9A-Za-z_-]{35}/ },
  { ad: 'Groq API anahtarı',      re: /gsk_[A-Za-z0-9]{20,}/ },
  { ad: 'Anthropic API anahtarı', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { ad: 'OpenAI API anahtarı',    re: /sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}/ },
  { ad: 'GitHub jetonu',          re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/ },
  { ad: 'AWS erişim anahtarı',    re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { ad: 'Stripe gizli anahtarı',  re: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/ },
  { ad: 'Slack jetonu',           re: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { ad: 'Vercel Blob jetonu',     re: /vercel_blob_rw_[A-Za-z0-9_]{20,}/ },
  { ad: 'PEM özel anahtarı',      re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/ },
];

const MUAF_ISARET = /secret-scan:\s*allow/;
// Firebase mobil istemci yapılandırma dosyaları (Android paket adı + SHA-1 ile
// kısıtlanan istemci kimliği taşır ve JSON içinde yorum satırı yazılamaz).
const FIREBASE_ISTEMCI_DOSYALARI = new Set([
  'mobile/google-services.json',
  'mobile/GoogleService-Info.plist',
]);

function envDosyasiMi(yol) {
  const ad = basename(yol);
  // .env.local.example gibi şablonlar taranır; gerçek .env dosyaları git'e
  // zaten girmemeli (.gitignore) ve yerelde gerçek anahtar taşıması normal.
  return /^\.env(\..+)?$/.test(ad) && !/\.example$/.test(ad);
}

function gitDosyalari() {
  try {
    // --others --exclude-standard: henüz commit'lenmemiş ama .gitignore'da da
    // olmayan yeni dosyalar; push edilecekleri için onlar da taranır.
    const cikti = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024,
    });
    const liste = cikti.split('\0').filter(Boolean);
    return liste.length ? liste.map((f) => join(ROOT, f)) : null;
  } catch {
    return null;
  }
}

function agacDosyalari(dizin) {
  const out = [];
  for (const ad of readdirSync(dizin)) {
    const tam = join(dizin, ad);
    let st;
    try { st = statSync(tam); } catch { continue; }
    if (st.isDirectory()) {
      if (!ATLANAN_DIZIN.has(ad)) out.push(...agacDosyalari(tam));
    } else {
      out.push(tam);
    }
  }
  return out;
}

const kaynak = gitDosyalari();
const dosyalar = (kaynak ?? agacDosyalari(ROOT)).filter((f) => {
  const parcalar = relative(ROOT, f).split(sep);
  if (parcalar.some((p) => ATLANAN_DIZIN.has(p))) return false;
  if (envDosyasiMi(f) || IKILI_UZANTI.test(f)) return false;
  if (!existsSync(f)) return false; // git'te silinmiş ama henüz commit'lenmemiş
  const st = statSync(f);
  return st.isFile() && st.size <= AZAMI_BOYUT;
});

const bulgular = [];

for (const dosya of dosyalar) {
  const icerik = readFileSync(dosya, 'utf8');
  if (icerik.includes('\0')) continue; // ikili dosya
  const satirlar = icerik.split(/\r?\n/);
  for (let i = 0; i < satirlar.length; i++) {
    const satir = satirlar[i];
    if (MUAF_ISARET.test(satir)) continue;
    const goreli = relative(ROOT, dosya).split(sep).join('/');
    for (const { ad, re } of KALIPLAR) {
      if (ad === 'Google API anahtarı' && FIREBASE_ISTEMCI_DOSYALARI.has(goreli)) continue;
      const m = satir.match(re);
      if (m) {
        // Bulunan değeri ASLA tam yazdırma: build logları da okunabilir.
        const deger = m[0];
        const maskeli = deger.slice(0, 6) + '…' + '*'.repeat(6);
        bulgular.push({ dosya: goreli, no: i + 1, ad, maskeli });
        break;
      }
    }
  }
}

if (bulgular.length) {
  console.error('\n\x1b[31m✗ Gizli anahtar denetimi BAŞARISIZ\x1b[0m\n');
  for (const b of bulgular) {
    console.error(`  \x1b[1m${b.ad}\x1b[0m  ${b.dosya}:${b.no}  (${b.maskeli})`);
  }
  console.error('\n  Anahtarlar YALNIZCA ortam değişkeninden okunur (Vercel / .env.local).');
  console.error('  `process.env.X || \'gerçek-anahtar\'` biçiminde yedek YAZILMAZ.');
  console.error('  Anahtar daha önce push edildiyse koddan silmek yetmez: sağlayıcıda YENİLE.');
  console.error('  Değer gerçekten herkese açık olacak şekilde tasarlandıysa (ör. Firebase');
  console.error('  web anahtarı) satıra `secret-scan: allow` yorumu ekle.\n');
  process.exit(1);
}

console.log(`✓ Gizli anahtar denetimi: ${dosyalar.length} dosya tarandı, gömülü anahtar yok (${kaynak ? 'git ls-files' : 'dizin ağacı'})`);
