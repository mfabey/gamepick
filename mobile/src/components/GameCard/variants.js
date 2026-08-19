import { radius } from '../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// KART VARYANTLARI — ölçüler referans HTML'den ÖLÇÜLDÜ, README'den değil.
//
// Handoff'un CLAUDE.md'si: "Gamerisen Tasarım Yönü.dc.html — piksel
// doğruluğunun kaynağı. Bir ölçüden emin değilsen tarayıcıda aç ve elementi
// ölç; tahmin etme." İkisi çeliştiğinde HTML kazanıyor.
//
// HTML'den okunan ortak yapı (12 — Tek kart ailesi):
//
//   kart      : column, gap 12
//   kapak     : radius 12
//   ad bloğu  : column, gap 4, MIN-HEIGHT 44
//   ad        : 13 / 600 / lineHeight 1.3
//   bağlam    : 12 / text3
//
// "Varyantlar yalnızca ÖLÇÜ ve BAĞLAM SATIRINI değiştirir; kenar 12,
// boşluk 8/12, tipografi 13/12 her yerde aynı."
//
// ── IZGARA GENİŞLİĞİ HESAPLANIYOR, SABİT DEĞİL ──
// HTML 169 diyor ama bu türetilmiş bir sayı: 390pt ekran − 2×20 kenar
// dolgusu − 12 sütun aralığı = 338 / 2 = 169. Sabit yazılsaydı daha geniş
// ve daha dar cihazlarda ızgara bozulurdu. Oran korunuyor: 169/225 = 3:4.
//
// ── ŞERİT 148, 132 DEĞİL ──
// HTML bunu açıkça işaretlemiş: "şerit · 148×160 · eski 132 değil".
// Uygulamadaki 132 tasarımın düzelttiği eski değer.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FAZ 2 — SİNYAL SÖZLEŞMESİ
//
// Fazın eklediği şey bir ölçü değil, bir YASAK: "bir varyant başka bir
// varyantın sinyal setini ödünç alamaz. Şerit kartına fiyat eklemek
// istiyorsan ızgaraya geçersin."
//
// Neden yasak gerekiyor: `context` propu serbestti ve her çağrı yeri kendi
// kombinasyonunu uydurabiliyordu. Depodaki karar (tek bileşen + on prop
// YERİNE dar bileşenler + paylaşılan katman) ancak sınır zorlanırsa duruyor;
// yoksa on proplu anahtar arka kapıdan geri geliyor.
//
// Sinyaller:
//   puan    — metacritic rozeti (kapak sağ üst)
//   indirim — indirim/ücretsiz rozeti (kapak sol üst)
//   tur     — ad altındaki tür satırı
//   fiyat   — ad altındaki fiyat
//   baglam  — çağrı yerinin verdiği serbest satır (arkadaş adı, tarih…)
// ─────────────────────────────────────────────────────────────────────────────

/** Ad bloğu kademeleri. Yükseklik satır sayısı × satır yüksekliği. */
// FAZ 2, "AÇIK" maddesi: "ızgara kart adı 38pt (2×19) satır yüksekliğinden
// TÜREYEN ölçü — boşluk ölçeğine tabi değil ama ölçek dışı sayı olarak
// görünüyor. Kodda satır yüksekliği sabiti olarak tutulmalı, boşluk gibi
// yazılmamalı." Bu yüzden burada, spacing'de değil.
// Stil parçası MODÜL DÜZEYİNDE bir kez donuyor: her render'da yeni bir nesne
// üretilseydi `ad` stili hiç eşitlenmez ve Text her seferinde yeniden
// stillenirdi. Renk taşımıyor, o yüzden temadan bağımsız.
const kademe = (boyut, satirY, satir) => Object.freeze({
  boyut, satirY, satir,
  stil: Object.freeze({ fontSize: boyut, lineHeight: satirY, minHeight: satirY * satir }),
});

export const AD = {
  // B (şerit) — Faz 1'de ölçüldü: 13 · lineHeight 16 · 2 satır = 32.
  kucuk: kademe(13, 16, 2),
  // A (ızgara) — Faz 2 maketi: 15 · 600 · lineHeight 19 · height 38.
  orta:  kademe(15, 19, 2),
};

/** Varyantın taşıyabileceği sinyaller — dışındakiler ÇİZİLMİYOR. */
function sinyal(...adlar) {
  const kume = new Set(adlar);
  return Object.freeze({
    has: (ad) => kume.has(ad),
    liste: Object.freeze([...adlar]),
  });
}

/** Kapak köşesi, kart içi boşluklar — her varyantta aynı. */
// Değerler HTML'den ölçüldü ve 4pt ızgarasında: 12 · 8 · 4.
export const KART = {
  gap: 12,          // kapak grubu ↔ (varsa) alt eylem
  metinGap: 8,      // kapak ↔ metin bloğu
  satirGap: 4,      // ad ↔ bağlam
};

// AD BLOĞU SABİT YÜKSEKLİKLİ (Faz 1'de şerit, Faz 2'de ızgara).
// Kartlar arasında ad altındaki satırlar AYNI HİZAYA gelsin diye: ad bir
// satırsa da iki satırsa da blok aynı yükseklikte.
//
// minHeight, height DEĞİL: erişilebilirlik punto ölçeğinde sığmayan ad
// kırpılırdı. Varsayılan ölçekte ikisi aynı sonucu veriyor — hizalama
// zaten orada sağlanıyor.

export const VARYANT = {
  // Oyunlar ekranı, profil kütüphanesi. Genişlik sütun aritmetiğinden gelir.
  grid: {
    genislik: null,          // ebeveyn belirler (2 sütun)
    kapakOran: 169 / 225,    // 3:4
    kapakYukseklik: null,
    yaricap: radius.lg,      // Faz 2: A → 16
    ad: AD.orta,
    // "Niyetli tarama. TAM sinyal seti: puan, indirim, tür, fiyat."
    sinyal: sinyal('puan', 'indirim', 'tur', 'fiyat'),
  },
  // Anasayfa ve videolar şeritleri. Genişlik SABİT, yükseklik içerikle esner
  // ("Şerit yüksekliği içeriğe göre esner, kart genişliği sabit kalır —
  // satır ritmi bozulmaz").
  //
  // KAPAK 3:4 — 160 DEĞİL. Eski handoff "148×160" diyordu; yeni tasarımın
  // üç telefon karesi de 148×197 ölçtü (= 3/4) ve karar tablosu bunu
  // "kapak 3/4" diye yazıyor. Izgara karesiyle aynı oran: iki yüzeydeki
  // aynı oyun aynı biçimde duruyor, 0.925 ↔ 0.75 farkı kalkıyor.
  rail: {
    genislik: 148,
    kapakOran: 3 / 4,
    kapakYukseklik: null,
    yaricap: radius.md,      // Faz 2: B → 12
    ad: AD.kucuk,
    // "Göz gezdirme. Sinyal AZALTILMIŞ: yalnızca puan. Fiyat ve tür
    //  bilinçli yok — şerit karar verdirmez, detaya gönderir."
    sinyal: sinyal('puan'),
  },
  // Arkadaş şeridi / topluluk. HTML: "16:9 + arkadaş cam etiketi".
  // Arkadas seridi / topluluk. HTML: "16:9 + arkadas cam etiketi".
  //
  // TEK DOLU YUZEYLI VARYANT. Maket olculdu: 202x167, yaricap 16, surface2
  // dolgu, 1px kenarlik; icinde 200x104 kapak ve altinda metin blogu.
  // Otekiler (grid, rail) yuzeysiz — kapak zaten kendi yuzeyi. Sosyal kart
  // bir ARKADAS ETKINLIGI tasiyor, katalog ogesi degil; dolu yuzey onu
  // cevresindeki katalog seritlerinden ayiriyor.
  //
  // FAZ 2'NİN BEŞLİSİNDE YOK — bilerek. Fazın beşi katalog kartları
  // (ızgara, şerit, akış, deste, satır); bu ise ARKADAŞ ETKİNLİĞİ taşıyor.
  // Sinyali de ondan: puan değil, kimin oynadığı.
  social: {
    genislik: 202,
    kapakOran: 16 / 9,
    kapakYukseklik: null,
    yuzey: true,
    yaricap: radius.md,
    ad: AD.kucuk,
    sinyal: sinyal('baglam'),
  },
};
