import { Image } from 'expo-image';

// Görselleri önden önbelleğe ısıt (sonsuz scroll'da gecikmeyi önler).
// Boş/yinelenen URL'leri eler; sessizce çalışır (hata scroll'u etkilemez).
export function prefetchImages(urls) {
  const list = Array.from(new Set((urls || []).filter(Boolean)));
  if (list.length === 0) return;
  try {
    Image.prefetch(list, { cachePolicy: 'memory-disk' });
  } catch {
    // prefetch başarısız olsa bile görsel normal akışta yüklenir
  }
}
