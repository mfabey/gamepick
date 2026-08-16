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

/** Kapak köşesi, kart içi boşluklar — her varyantta aynı. */
// Değerler HTML'den ölçüldü ve 4pt ızgarasında: 12 · 8 · 4.
export const KART = {
  gap: 12,          // kapak grubu ↔ (varsa) alt eylem
  metinGap: 8,      // kapak ↔ metin bloğu
  satirGap: 4,      // ad ↔ bağlam
  adMinHeight: 44,  // "sabit yükseklikli blok" — erişilebilirlikte kart uzar
};

export const VARYANT = {
  // Oyunlar ekranı, profil kütüphanesi. Genişlik sütun aritmetiğinden gelir.
  grid: {
    genislik: null,          // ebeveyn belirler (2 sütun)
    kapakOran: 169 / 225,    // 3:4
    kapakYukseklik: null,
  },
  // Anasayfa ve videolar şeritleri. Genişlik SABİT, yükseklik içerikle esner
  // ("Şerit yüksekliği içeriğe göre esner, kart genişliği sabit kalır —
  // satır ritmi bozulmaz").
  rail: {
    genislik: 148,
    kapakOran: null,
    kapakYukseklik: 160,
  },
  // Arkadaş şeridi / topluluk. HTML: "16:9 + arkadaş cam etiketi".
  social: {
    genislik: null,
    kapakOran: 16 / 9,
    kapakYukseklik: null,
  },
};
