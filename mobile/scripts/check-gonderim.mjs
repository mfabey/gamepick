// ─────────────────────────────────────────────────────────────────────────────
// İYİMSER GÖNDERİM EŞLEŞTİRMESİ — regresyon sınaması.
//
// Neden var: Pusher bağlandıktan sonra gönderilen mesaj İKİ yoldan geliyor
// (anlık yankı + HTTP yanıtı). Yanlış eşleştirme cihazda şöyle görünüyordu:
// "aynı mesaj iki kez" ve "baloncuk iki kez zıplıyor". İkisi de ancak
// gerçek bir gönderim yapılarak fark edilebiliyor — burada saniyeler
// içinde sınanıyor.
//
// Kullanım: node scripts/check-gonderim.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { tmpDegistir, bekleyenEsIndeks } from '../src/utils/gonderimEsleme.js';

const BEN = 'u1', O = 'u2';
let gecti = 0, kaldi = 0;
const es = (ad, bulunan, beklenen) => {
  const ok = JSON.stringify(bulunan) === JSON.stringify(beklenen);
  console.log((ok ? '  ✓ ' : '  ✗ ') + ad + (ok ? '' : `\n      bulunan : ${JSON.stringify(bulunan)}\n      beklenen: ${JSON.stringify(beklenen)}`));
  ok ? gecti++ : kaldi++;
};

// addMessage'in yaptigini birebir taklit eden yardimci
function yankiUygula(liste, gelen, ben) {
  if (liste.some((x) => x.id === gelen.id)) return liste;
  const i = bekleyenEsIndeks(liste, gelen, ben);
  if (i >= 0) { const k = liste.slice(); k[i] = { ...gelen, yerelId: liste[i].yerelId }; return k; }
  return [gelen, ...liste];
}
const kimlikler = (l) => l.map((m) => (m.yerelId || m.id) + ':' + m.id);

const TMP = 'tmp-1';
const iyimser = { id: TMP, yerelId: TMP, from: BEN, text: 'selam', at: 100, pending: true };
const gercek  = { id: 'srv-9', from: BEN, text: 'selam', at: 100 };

console.log('\n— SIRA 1: yanki once, HTTP yaniti sonra —');
let l = [iyimser];
l = yankiUygula(l, gercek, BEN);
es('yanki ayri satir ACMIYOR (tek satir)', l.length, 1);
es('gercek kimlige gecti, ANAHTAR korundu', kimlikler(l), ['tmp-1:srv-9']);
l = tmpDegistir(l, TMP, gercek);
es('HTTP yaniti coklamiyor', kimlikler(l), ['tmp-1:srv-9']);

console.log('\n— SIRA 2: HTTP yaniti once, yanki sonra —');
l = [iyimser];
l = tmpDegistir(l, TMP, gercek);
es('tmp gercege dondu, ANAHTAR korundu', kimlikler(l), ['tmp-1:srv-9']);
l = yankiUygula(l, gercek, BEN);
es('gec gelen yanki coklamiyor', kimlikler(l), ['tmp-1:srv-9']);

console.log('\n— Yanlis eslesme olmamali —');
es('karsi tarafin mesaji bekleyene YAZILMAZ',
   bekleyenEsIndeks([iyimser], { id: 's2', from: O, text: 'selam', at: 101 }, BEN), -1);
es('farkli metin eslesmez',
   bekleyenEsIndeks([iyimser], { id: 's3', from: BEN, text: 'baska', at: 101 }, BEN), -1);
es('bekleyen olmayan satir eslesmez',
   bekleyenEsIndeks([{ ...iyimser, pending: false }], gercek, BEN), -1);
l = yankiUygula([iyimser], { id: 's4', from: O, text: 'merhaba', at: 101 }, BEN);
es('karsi taraftan gelen YENI satir aciyor', l.length, 2);

console.log('\n— GIF ve medya —');
const gifTmp = { id: 'tmp-2', yerelId: 'tmp-2', from: BEN, text: '', at: 1, pending: true, gif: { url: 'g.gif' } };
es('ayni GIF eslesir', bekleyenEsIndeks([gifTmp], { id: 's5', from: BEN, text: '', gif: { url: 'g.gif' } }, BEN), 0);
es('farkli GIF eslesmez', bekleyenEsIndeks([gifTmp], { id: 's6', from: BEN, text: '', gif: { url: 'x.gif' } }, BEN), -1);
const medTmp = { id: 'tmp-3', yerelId: 'tmp-3', from: BEN, text: '', at: 1, pending: true, media: { url: 'm.jpg' } };
es('ayni medya eslesir', bekleyenEsIndeks([medTmp], { id: 's7', from: BEN, text: '', media: { url: 'm.jpg' } }, BEN), 0);

console.log(`\n${kaldi === 0 ? '✓' : '✗'} gonderim eslestirmesi: ${gecti} gecti, ${kaldi} kaldi`);
process.exit(kaldi ? 1 : 0);
