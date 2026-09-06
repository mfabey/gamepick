import NetInfo from '@react-native-community/netinfo';

// ─────────────────────────────────────────────────────────────────────────────
// AĞ DURUMU — "çevrimdışı mıyız" sorusunun tek cevap yeri.
//
// ── KARAR YALNIZ `isConnected`E BAKIYOR ─────────────────────────────────────
//
// NetInfo iki alan veriyor ve ikisi AYNI ŞEY DEĞİL:
//
//   isConnected          → cihaz bir ağa bağlı mı (radyo/Wi-Fi açık mı)
//   isInternetReachable  → o ağdan internete ÇIKILABİLİYOR mu
//
// İkincisi bir YOKLAMA isteğiyle ölçülüyor (kütüphanenin varsayılanı Google'ın
// `generate_204` adresi). O adres bir ülkede/kurumsal ağda engellenirse alan
// `false` döner ve biz internet varken "çevrimdışısın" deriz — üstelik bu
// yalnız yanlış bir yazı değil: aşağıdaki `cevrimdisiMi()` queryCache'te ağ
// isteğini ATLATIYOR, yani uygulama kendini bayat veriye kilitlerdi.
//
// O yüzden karar tek alana bakıyor: `isConnected === false`. Bağlı olduğu hâlde
// internete çıkamayan ağ (otel/captive portal) burada "çevrimdışı" sayılmaz —
// istek atılır, düşer ve ekran "Bağlanılamadı" der. Doğrusu da bu: sorun
// bağlantının YOKLUĞU değil, o ağın kendisi.
//
// `=== false` katı yazıldı: alan `null` da olabiliyor (henüz ölçülmedi) ve
// `!durum.isConnected` yazılsaydı ölçülmemiş durum çevrimdışı sayılırdı —
// açılışın ilk saniyesinde tüm istekler atlanırdı.
//
// ── İZLEYİCİ TEMBEL BAŞLIYOR ────────────────────────────────────────────────
// Modül yüklenirken değil, ilk soruda. Böylece içe aktarım sırası önemsiz ve
// hiç sorulmazsa boşuna bir sistem dinleyicisi açılmıyor.
// ─────────────────────────────────────────────────────────────────────────────

let cevrimdisi = false;      // İYİMSER BAŞLANGIÇ — bkz. `=== false` notu
let izleyici = null;
const dinleyiciler = new Set();

function uygula(durum) {
  const yeni = durum?.isConnected === false;
  if (yeni === cevrimdisi) return;
  cevrimdisi = yeni;
  dinleyiciler.forEach((cb) => cb(cevrimdisi));
}

function izleBaslat() {
  if (izleyici) return;
  try {
    izleyici = NetInfo.addEventListener(uygula);
    // Abonelik ilk durumu da yayınlıyor; `fetch` yine de çağrılıyor çünkü bu
    // garanti kütüphane sürümüne bağlı ve ilk kare yanlış duruma düşmemeli.
    NetInfo.fetch().then(uygula).catch(() => {});
  } catch {
    // Modül yoksa (web/test) çevrimdışı ölçümü kapalı kalır: uygulama
    // ÇEVRİMİÇİ varsayar ve eskisi gibi çalışır.
    izleyici = null;
  }
}

/** @returns {boolean} cihaz hiçbir ağa bağlı değil mi */
export function cevrimdisiMi() {
  izleBaslat();
  return cevrimdisi;
}

/** @returns {func} abonelikten çıkış */
export function agAbone(cb) {
  izleBaslat();
  dinleyiciler.add(cb);
  return () => { dinleyiciler.delete(cb); };
}

/**
 * Durumu ŞİMDİ yeniden ölç. "Tekrar dene"nin ilk adımı: kullanıcı düğmeye
 * bastığında bağlantı geri gelmiş olabilir ve olay henüz düşmemiş olabilir.
 * @returns {Promise<boolean>} çevrimiçi mi
 */
export function agTazele() {
  izleBaslat();
  return NetInfo.fetch()
    .then((d) => { uygula(d); return !cevrimdisi; })
    .catch(() => !cevrimdisi);
}
