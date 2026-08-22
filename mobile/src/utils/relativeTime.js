// ─────────────────────────────────────────────────────────────────────────────
// BAĞIL ZAMAN — "12 dk önce"
//
// NEDEN İSTEMCİDE. Haber ucu 30 dk ISR önbellekli. Etiketi sunucu üretseydi
// "5 dk önce" yazan bir yanıt 35 dakika boyunca servis edilebilirdi — yani
// tazeliği anlatan alan, tazeliği en çok yanıltan alan olurdu.
// Sunucu ham zaman damgasını (`ts`) yolluyor, cümleyi burası kuruyor.
//
// ESKİYE DÜŞÜŞ: bir haftadan eskisinde bağıl ifade işe yaramıyor
// ("9 gün önce" bir tarih kadar bilgi vermiyor), o yüzden çağrı yeri
// mutlak tarihe dönüyor.
// ─────────────────────────────────────────────────────────────────────────────

const DK = 60 * 1000;
const SA = 60 * DK;
const GUN = 24 * SA;

/**
 * @param {number} ts     epoch ms
 * @param {func}   t      i18n çevirici
 * @returns {string|null} `null` = çok eski, çağrı yeri tarihi göstersin
 */
export function bagilZaman(ts, t) {
  if (!ts || typeof ts !== 'number') return null;
  const fark = Date.now() - ts;

  // Gelecek zamanlı damga (kaynak saati ileri) — "az önce" say.
  if (fark < 0) return t('time.justNow');
  if (fark < 2 * DK) return t('time.justNow');
  if (fark < SA) return t('time.minsAgo').replace('{n}', String(Math.floor(fark / DK)));
  if (fark < GUN) return t('time.hoursAgo').replace('{n}', String(Math.floor(fark / SA)));
  if (fark < 2 * GUN) return t('time.yesterday');
  if (fark < 7 * GUN) return t('time.daysAgo').replace('{n}', String(Math.floor(fark / GUN)));
  return null;
}
