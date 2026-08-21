import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { posterImage } from '../utils/images';

// Dikey kart görseli: Steam yatay header'ı dikey kapağa (library_600x900) çevirir.
// Dikey kapak 404 olursa (nadir) orijinal görsele zarif geri döner — recycling-güvenli
// (uri değişince otomatik sıfırlanır, ekstra state efekti yok).
export default function PosterImage({ uri, fallbackUri, onError, ...rest }) {
  const poster = posterImage(uri);
  const swapped = poster !== uri;
  
  const [failedPoster, setFailedPoster] = useState(null);
  const [failedOriginal, setFailedOriginal] = useState(false);

  // Geri dönüşüm sıfırlaması
  useEffect(() => {
    setFailedPoster(null);
    setFailedOriginal(false);
  }, [uri]);

  const usePortrait = swapped && failedPoster !== poster;
  
  let source = uri;
  if (usePortrait) {
    source = poster;
  } else if (failedOriginal && fallbackUri) {
    source = fallbackUri;
  }

  return (
    <Image
      source={source}
      onError={(e) => {
        // ÖNEMLİ: onError yalnız SON çare de başarısız olduğunda çağrılıyor.
        if (usePortrait) {
          setFailedPoster(poster);   // hâlâ bir şansımız var: orijinale dön
          return;
        }
        if (!failedOriginal && fallbackUri) {
          setFailedOriginal(true);   // son bir şansımız daha var: logoya/kapsüle dön
          return;
        }
        onError?.(e);                // zincirin sonu — gerçekten kapak yok
      }}
      {...rest}
    />
  );
}
