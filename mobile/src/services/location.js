import * as Location from 'expo-location';

// ─────────────────────────────────────────────────────────────────────────────
// Şehir etiketi — paylaşılan kartlara iliştirilen isteğe bağlı konum.
//
// KOORDİNAT CİHAZDAN ÇIKMIYOR. Ters coğrafi çözümleme BURADA, cihazda
// yapılıyor; sunucuya yalnızca şehir adı gidiyor. Sunucuya koordinat gönderip
// orada çözseydik enlem/boylam sunucu günlüklerine düşerdi — ve bir kez
// günlüğe düşen konum, sonradan silinse bile bir süre orada kalır.
//
// SÜREKLİ TAKİP YOK. Bu modül yalnızca kullanıcı açıkça istediğinde, tek
// seferlik çağrılıyor. Arka plan izni istenmiyor, konum saklanmıyor.
//
// DÜŞÜK DOĞRULUK BİLİNÇLİ: şehir adı için sokak hassasiyeti gereksiz ve
// istemediğimiz bir şey. `Lowest` hem daha hızlı hem daha az bilgi topluyor.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ ok: true, city: string } | { ok: false, reason: 'DENIED'|'UNAVAILABLE' }} CityResult
 */

/**
 * Kullanıcının şehrini çözer. İzin YOKSA ister.
 * @returns {Promise<CityResult>}
 */
export async function resolveCity() {
  try {
    // Yalnızca ön plan izni. `requestBackgroundPermissionsAsync` KULLANILMIYOR.
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'DENIED' };

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });

    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });

    const p = places?.[0];
    // `city` bazı bölgelerde boş dönüyor; sırayla daha genişe düşüyoruz.
    // Sokak/adres alanları BİLEREK kullanılmıyor — istediğimiz şehir düzeyi.
    const city = p?.city || p?.subregion || p?.region || null;
    if (!city) return { ok: false, reason: 'UNAVAILABLE' };

    return { ok: true, city: String(city).slice(0, 28) };
  } catch {
    return { ok: false, reason: 'UNAVAILABLE' };
  }
}
