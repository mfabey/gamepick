// ─────────────────────────────────────────────────────────────────────────────
// Mesaj gruplama ve tarih ayracı — SAF FONKSİYONLAR.
//
// Bileşenin içinde değiller, çünkü sınanabilir olmaları gerekiyor: "kuyruk
// doğru baloncukta mı", "ayraç doğru yerde mi" soruları gözle bakarak
// cevaplanmıyor. Sohbeti elle kurup bakmak, her seferinde iki kişi ve
// dakikalarca yazışma demek.
//
// ── LİSTE TERS ÇEVRİLMİŞ ──
// Veri EN YENİ BAŞTA (msgs[0] = en yeni). Bu dosyada "eski" ve "yeni"
// zamandan söz ediyor, dizinden değil:
//   eski = msgs[i + 1]  → ekranda ÜSTTE
//   yeni = msgs[i - 1]  → ekranda ALTTA
// Çağrı yeri bu eşlemeyi yapıyor; buradaki fonksiyonlar dizini hiç görmüyor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * İki mesajın aynı gruba girmesi için en fazla ne kadar ara olabilir.
 *
 * 60 sn iOS Messages'ın ölçülen davranışı. Daha uzun tutmak (5 dk gibi)
 * ayrı ayrı zamanlarda yazılmış mesajları tek bir blok gibi gösteriyor;
 * daha kısa tutmak arka arkaya hızlı yazılan iki satırı ayırıyor.
 */
export const GRUP_ARALIGI = 60000;

/**
 * Tarih ayracının çıkması için gereken sessizlik.
 *
 * 1 saat. Gün değişimi ayrıca yakalanıyor (bkz. ayracGerekli) — bu eşik
 * "aynı gün ama arada uzun bir boşluk var" durumu için.
 */
export const AYRAC_ARALIGI = 3600000;

/** Grup İÇİ boşluk — aynı kişinin arka arkaya mesajları. */
export const GRUP_ICI = 2;

/** Grup ARASI boşluk — kişi değişti ya da arada zaman geçti. */
export const GRUP_ARASI = 8;

/**
 * İki mesaj aynı gruba mı giriyor?
 *
 * Geri alınmış mesaj da gruplanıyor: yerinde bir iz bırakıyor ve o iz de
 * sıranın parçası. Grubun dışına atmak, silinen mesajın etrafında iki
 * boşluk açardı.
 */
export function ayniGrup(a, b) {
  if (!a || !b) return false;
  if (a.from !== b.from) return false;
  return Math.abs((a.at || 0) - (b.at || 0)) <= GRUP_ARALIGI;
}

/**
 * Bu mesajın ÜSTÜNE tarih ayracı konacak mı?
 *
 * @param {object} mesaj  çizilen mesaj
 * @param {object} eski   zamanda ondan önceki (ekranda üstteki) mesaj
 */
export function ayracGerekli(mesaj, eski) {
  if (!mesaj) return false;
  // Sohbetin en başı: ilk mesajın üstünde ayraç DAİMA var. iOS böyle
  // yapıyor ve konuşmanın ne zaman başladığı tek başına bir bilgi.
  if (!eski) return true;
  const a = new Date(eski.at || 0);
  const b = new Date(mesaj.at || 0);
  if (a.toDateString() !== b.toDateString()) return true;
  return (mesaj.at || 0) - (eski.at || 0) > AYRAC_ARALIGI;
}

/**
 * Bu mesajın kuyruğu var mı? — grubun EN YENİ üyesinde var.
 *
 * @param {object} mesaj
 * @param {object} yeni  zamanda ondan sonraki (ekranda alttaki) mesaj
 */
export function kuyrukVar(mesaj, yeni) {
  return !ayniGrup(mesaj, yeni);
}

/**
 * Mesajın ÜSTÜNDEKİ boşluk.
 *
 * Ayraç varsa 0 döndürüyor: boşluğu ayracın kendi kenar boşluğu veriyor,
 * ikisi toplanırsa arada kocaman bir delik kalıyor.
 */
export function ustBosluk(mesaj, eski) {
  if (ayracGerekli(mesaj, eski)) return 0;
  return ayniGrup(eski, mesaj) ? GRUP_ICI : GRUP_ARASI;
}

/**
 * Tarih ayracının iki parçası: kalın gün + normal saat.
 *
 * İKİ PARÇA, tek dize değil — iOS gün adını kalın yazıyor ve fark oradan
 * çıkıyor. Tek dize döndürseydik çağrı yeri onu tekrar bölmek zorunda
 * kalırdı.
 *
 * @returns {{gun: string, saat: string}}
 */
export function ayracParcalari(ts, t, lang) {
  const d = new Date(ts || 0);
  const now = new Date();
  const loc = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE'
    : lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : 'en-US';

  const saat = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });

  if (d.toDateString() === now.toDateString()) return { gun: t('msg.today'), saat };

  const dun = new Date(now);
  dun.setDate(now.getDate() - 1);
  if (d.toDateString() === dun.toDateString()) return { gun: t('msg.yesterdayCap'), saat };

  // Son bir hafta: gün adı yeterli ve tarihten daha hızlı okunuyor.
  if (now - d < 7 * 86400000) {
    return { gun: d.toLocaleDateString(loc, { weekday: 'long' }), saat };
  }

  // Aynı yıl içindeyse yıl yazılmıyor — taşıdığı bilgi yok.
  const ayniYil = d.getFullYear() === now.getFullYear();
  return {
    gun: d.toLocaleDateString(loc, ayniYil
      ? { day: 'numeric', month: 'long' }
      : { day: 'numeric', month: 'long', year: 'numeric' }),
    saat,
  };
}
