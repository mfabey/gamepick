import { useState } from 'react';
import { Image } from 'expo-image';
import { posterImage } from '../utils/images';

// Dikey kart görseli: Steam yatay header'ı dikey kapağa (library_600x900) çevirir.
// Dikey kapak 404 olursa (nadir) orijinal görsele zarif geri döner — recycling-güvenli
// (uri değişince otomatik sıfırlanır, ekstra state efekti yok).
export default function PosterImage({ uri, onError, ...rest }) {
  const poster = posterImage(uri);
  const swapped = poster !== uri;
  const [failedPoster, setFailedPoster] = useState(null);

  const usePortrait = swapped && failedPoster !== poster;
  const source = usePortrait ? poster : uri;

  return (
    <Image
      source={source}
      onError={(e) => {
        if (usePortrait) setFailedPoster(poster); // portre başarısız → header'a dön
        onError?.(e);
      }}
      {...rest}
    />
  );
}
