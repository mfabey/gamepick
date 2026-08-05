// ─────────────────────────────────────────────────────────────────────────────
// Widget görselleri — indir, base64'e çevir, App Group'a metin olarak geçir.
//
// NEDEN BÖYLE:
// WidgetKit render sırasında ağdan görsel çekemiyor; timeline entry'si hazır
// gelmek zorunda. Yani görseli UYGULAMA indirip BAYT olarak geçirmeli.
//
// Kanal olarak mevcut setWidgetData(key, string) kullanılıyor. Alternatif
// App Group konteynerine dosya yazmaktı ama o native modüle yeni bir fonksiyon
// eklemek demekti; base64 ile mevcut boru hattı olduğu gibi çalışıyor.
//
// Saf JS: fetch + blob + FileReader. Yeni bağımlılık yok — expo-file-system
// bu projede kurulu değil (yalnızca başka paketlerin geçişli bağımlılığı) ve
// ona doğrudan yaslanmak kırılgan olurdu.
// ─────────────────────────────────────────────────────────────────────────────

// UserDefaults büyük veri için tasarlanmadı. Sınır bilinçli olarak dar:
// base64 ham boyutu ~%33 şişiriyor, yani 90 KB'lık tavan ~120 KB'lık metin
// demek. Fırsat widget'ı tek görsel, istek listesi üç küçük görsel taşıyor;
// toplam 150 KB'ı geçmiyor.
const MAX_BYTES = 90 * 1024;

/**
 * Görseli indirip base64 gövdesini döndürür (veri URI öneki OLMADAN).
 * Hata, zaman aşımı ya da boyut aşımı durumunda null — çağıran taraf
 * görselsiz devam eder, widget mevcut düzenini korur.
 */
export async function fetchImageBase64(url, maxBytes = MAX_BYTES) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const blob = await res.blob();
    // Boyut kontrolü indirmeden SONRA: Steam CDN her zaman Content-Length
    // vermiyor, bu yüzden başlığa güvenmek yerine gerçek boyuta bakılıyor.
    if (!blob.size || blob.size > maxBytes) return null;

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const s = String(reader.result || '');
        const comma = s.indexOf(',');
        resolve(comma >= 0 ? s.slice(comma + 1) : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Steam kapak adresleri appid'den türetilebiliyor — uygulamadaki `image`
// alanı boş olsa bile görsel elde edilebiliyor.
//
// İki boy kullanılıyor, kullanım yerine göre:
//   header   460×215  — fırsat widget'ı (küçük widget 158pt @3x ≈ 474px)
//   capsule  231×87   — istek listesi satır küçük resmi, ~10 KB
export function steamHeaderUrl(appid) {
  if (!appid) return null;
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}

export function steamCapsuleUrl(appid) {
  if (!appid) return null;
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/capsule_231x87.jpg`;
}
