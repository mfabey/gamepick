// ─────────────────────────────────────────────────────────────────────────────
// KOMPAKT OYUN SATIRI — 2.0, kit s4.py profile() → prow().
//
// Yoğun listeler (Liste detayı, Koleksiyon detayı). Ad tek satır + ellipsis —
// burada ad zaten BİLİNEN bir şeyin hatırlatıcısı.
//
// NEDEN AYRI BİR BİLEŞEN (Faz 2'den): list/[id] ve collection/[id] 2 sütunlu
// ızgarada adı KAPAK ÜSTÜNE yazıyordu; açık temada açık renkli kapakta beyaz
// ad kayboluyordu. Satır bunu çözdü, 2.0 ölçüsü aynı kararı taşıyor.
//
// 2.0 FARKI: kapak 36×48 → 46×60 ve satırı dolduruyor; satır 72 → 60 ve
// satırlar arası 8. AYRAÇ KALKTI: Faz 2'de kapak satırdan küçüktü ve satırları
// ancak çizgi ayırıyordu; kitte kapak satırın tam boyu, 8 pt boşlukla kapaklar
// satırları kendisi ayırıyor. Kapağın üstünde karartma yok (GameCover'ın
// perdesi kapak üstüne yazı yazmak için; burada yazı kapağın yanında).
//
// SABİT YÜKSEKLİK — FlashList sözleşmesi: satır içerikle büyümüyor, liste
// kaydırmada sıçramıyor. SATIR_Y satır + satır arası boşluk.
// ─────────────────────────────────────────────────────────────────────────────
import { memo, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import PosterImage from './PosterImage';
import Monogram from './Monogram';
import { Icon } from './Icon';
import { PressableScale, Txt } from './ui/Primitives';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K } from '../theme/tokens';

const R = K.gameRow;
export const SATIR_Y = R.height + R.rowGap;

/**
 * @param {object}  game        { id, name, image, logo? }
 * @param {node}   [durum]      ad altındaki tek satır ("Kütüphanende · 46 saat")
 * @param {node}   [sag]        sağ yuva; verilmezse ok
 * @param {func}    onPress
 * @param {func}   [onLongPress]
 */
function GameRow({ game, durum, sag, onPress, onLongPress }) {
  const { colors } = useDesignTheme();
  // Kapak zinciri (görsel → logo) tükenirse MONOGRAM, boş kutu değil. Düşen
  // adres tutuluyor: FlashList satırı başka oyuna verdiğinde yeni adres denenir.
  const [failedUri, setFailedUri] = useState(null);
  const showMonogram = !game?.image || failedUri === game.image;

  return (
    <PressableScale
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={game?.name}
      style={styles.satir}
    >
      <View style={[styles.kapak, { backgroundColor: colors.surface2 }]}>
        {showMonogram
          ? <Monogram name={game?.name} style={StyleSheet.absoluteFill} not={false} />
          : <PosterImage
              uri={game.image}
              fallbackUri={game?.logo}
              recyclingKey={String(game?.id ?? '')}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={StyleSheet.absoluteFill}
              onError={() => setFailedUri(game.image)}
            />}
      </View>

      <View style={styles.metin}>
        <Txt variant="cardTitle" numberOfLines={1}>{game?.name}</Txt>
        {durum ? (
          typeof durum === 'string'
            ? <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{durum}</Txt>
            : durum
        ) : null}
      </View>

      {sag !== undefined ? sag : (
        <Icon name="chev" size={R.chevron} color={colors.text3} strokeWidth={R.chevronStroke} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  satir: {
    height: R.height,
    marginBottom: R.rowGap,
    flexDirection: 'row',
    alignItems: 'center',
    gap: R.gap,
  },
  kapak: { width: R.coverWidth, height: R.coverHeight, borderRadius: R.coverRadius, overflow: 'hidden' },
  metin: { flex: 1, minWidth: 0 },
});

export default memo(GameRow);
