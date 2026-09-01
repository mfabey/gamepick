// ─────────────────────────────────────────────────────────────────────────────
// KANONİK OYUN KİMLİĞİ — regresyon sınaması.
//
// Neden var: tek `rawg_` öneki iki uyumsuz sayı uzayından besleniyor (RAWG id
// ve Steam appid). Aşağıdaki üç vaka UYDURMA DEĞİL — 1 Eylül 2026'da canlı
// production'dan (`www.gamerisen.com`) ölçüldü; üçü de tek bir sıradan
// oturumda aynı anda erişilebilir durumdaydı.
//
// Bu hatanın cihazda görünüşü: "istek listesine ekledim ama aramada listede
// değil" ve "aynı oyun koleksiyonda iki kez". İkisi de ancak iki farklı
// listeden aynı oyuna girilerek fark edilebiliyor — burada saniyeler içinde
// sınanıyor.
//
// Kullanım: node scripts/check-kimlik.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { ayniOyun, oyunAnahtarlari, birincilAnahtar, kumedeVar } from '../src/services/oyunKimlik.js';

let gecti = 0, kaldi = 0;
const es = (ad, bulunan, beklenen) => {
  const ok = bulunan === beklenen;
  console.log((ok ? '  ✓ ' : '  ✗ ') + ad + (ok ? '' : `\n      bulunan: ${bulunan}  beklenen: ${beklenen}`));
  ok ? gecti++ : kaldi++;
};

// ── ÖLÇÜLMÜŞ ÇAKIŞMALAR (canlı, 2026-09-01) ─────────────────────────────────
// Sol: RAWG uzayı (tür / curated listeleri). Sağ: Steam appid uzayı
// (indirim / arama). `appid` yalnız detay ve Reels kayıtlarında bulunuyor.
const RDR2_RAWG  = { id: 'rawg_28',      rawgId: 28,      rawgSlug: 'red-dead-redemption-2', name: 'Red Dead Redemption 2' };
const RDR2_STEAM = { id: 'rawg_1174180', rawgId: 1174180, rawgSlug: 'red-dead-redemption-2', name: 'Red Dead Redemption 2' };

const ELDEN_RAWG  = { id: 'rawg_326243',  rawgId: 326243,  rawgSlug: 'elden-ring', name: 'Elden Ring' };
const ELDEN_STEAM = { id: 'rawg_1245620', rawgId: 1245620, rawgSlug: 'elden-ring', name: 'ELDEN RING' };

// Hades: slug İKİ uzayda AYRIŞIYOR — slug tek başına yetmediğinin kanıtı.
const HADES_RAWG  = { id: 'rawg_274755',  rawgId: 274755,  rawgSlug: 'hades-2018', name: 'Hades' };
const HADES_STEAM = { id: 'rawg_1145360', rawgId: 1145360, rawgSlug: 'hades',      name: 'Hades' };

console.log('\n— Ölçülmüş çift kimlikler birleşmeli —');
es('RDR2      : tür listesi ↔ indirim listesi', ayniOyun(RDR2_RAWG, RDR2_STEAM), true);
es('Elden Ring: curated ↔ arama (ad büyük/küçük farklı)', ayniOyun(ELDEN_RAWG, ELDEN_STEAM), true);
es('Hades     : slug ayrışıyor, ad kademesi tutuyor', ayniOyun(HADES_RAWG, HADES_STEAM), true);

console.log('\n— Farklı oyunlar birleşmemeli —');
es('RDR2 ↔ Elden Ring', ayniOyun(RDR2_RAWG, ELDEN_RAWG), false);
es('Hades ↔ RDR2', ayniOyun(HADES_STEAM, RDR2_STEAM), false);
// Ad aynı, appid farklı → appid kazanır (Prey 2006 ↔ Prey 2017 deseni).
es('Aynı ad, farklı appid → AYRI oyun', ayniOyun(
  { id: 'rawg_3970',   appid: '3970',   rawgSlug: 'prey', name: 'Prey' },
  { id: 'rawg_480490', appid: '480490', rawgSlug: 'prey', name: 'Prey' },
), false);
// Ama appid'lerden biri bilinmiyorsa ad/slug hâlâ birleştirmeli.
es('Aynı ad, appid tek tarafta → AYNI oyun', ayniOyun(
  { id: 'rawg_3970', rawgSlug: 'prey', name: 'Prey' },
  { id: 'rawg_3970', appid: '3970', rawgSlug: 'prey', name: 'Prey' },
), true);

console.log('\n— Appid en güçlü kademe —');
es('appid varsa birincil anahtar steam:', birincilAnahtar({ id: 'rawg_28', appid: 1174180, name: 'Red Dead Redemption 2' }), 'steam:1174180');
es('steamAppId de kabul ediliyor', birincilAnahtar({ id: 'x', steamAppId: '1145360', name: 'Hades' }), 'steam:1145360');
es('appid yoksa slug', birincilAnahtar(RDR2_RAWG), 'slug:reddeadredemption2');
es('slug da yoksa ad', birincilAnahtar({ id: 'rawg_9', name: 'Hades' }), 'ad:hades');
es('hiçbiri yoksa ham kimlik', birincilAnahtar({ id: 'rawg_9' }), 'id:rawg_9');
es('boş kayıt anahtar üretmez', oyunAnahtarlari(null).length, 0);
es('geçersiz appid yok sayılır', birincilAnahtar({ id: 'a', appid: 'abc', name: 'X' }), 'ad:x');

console.log('\n— Görüldü / ilgilenmiyorum kümeleri —');
// Detaydan "görüldü" yazılıyor (appid'li), akıştaki aday RAWG uzayında geliyor.
const kume = new Set(oyunAnahtarlari({ id: 'rawg_1145360', appid: '1145360', rawgSlug: 'hades', name: 'Hades' }));
es('detayda görülen oyun akışta da görülmüş sayılır', kumedeVar(kume, HADES_RAWG), true);
es('alakasız oyun kümede yok', kumedeVar(kume, RDR2_RAWG), false);
es('kümesiz çağrı çökmez', kumedeVar(null, RDR2_RAWG), false);

console.log(`\n${kaldi === 0 ? '✓' : '✗'} kimlik eşleştirmesi: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi === 0 ? 0 : 1);
