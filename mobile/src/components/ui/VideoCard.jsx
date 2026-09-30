import { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShortCard, VideoCard as MediaVideoCard } from './Media';

// ─────────────────────────────────────────────────────────────────────────────
// Video akışı öğesini (api/video-feed) tasarımın VideoCard / ShortCard'ına
// bağlayan ince katman. Çizim Media.tsx'te (kit video()/short()).
//
// Kaynak Steam'in resmi fragmanı: tür etiketi "Fragman", satır "Steam · tür".
// Süre, izlenme ve yaratıcı akışta YOK; kart o öğeleri çizmiyor (sahte veri yok).
// Oyun çipi de yok: başlık zaten oyunun adı, çip aynı adı tekrarlardı.
// ─────────────────────────────────────────────────────────────────────────────
export default memo(function VideoCard({ item, onPress, short = false, fluid = false }) {
  const { t } = useLanguage();
  const image = item.thumbnail || item.image;
  if (short) return <ShortCard title={item.name} image={image} recyclingKey={String(item.id)} onPress={onPress} />;
  return <MediaVideoCard title={item.name} image={image} type={t('v2.trailer')} creator="Steam" meta={item.genres?.[0]}
    width={fluid ? '100%' : undefined} recyclingKey={String(item.id)} onPress={onPress} />;
});
