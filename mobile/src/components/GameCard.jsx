import { memo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors, radius } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { usePrice } from '../hooks/usePrice';
import PosterImage from './PosterImage';

const BLUR_HASH = 'L03[?nof_3of~qWBofof00WB%MWB';

function GameCard({ game }) {
  const router = useRouter();
  const { t, formatPrice } = useLanguage();
  // Fiyat: merkezi önbellek + dedup + eşzamanlılık limitli servis üzerinden
  const price = usePrice(game);

  const isFree = game.isFree || price?.isFree;
  const onSale = price?.discount > 0 && !isFree;

  const mcColor = game.metacritic >= 80 ? colors.green
    : game.metacritic >= 60 ? '#fbbf24' : '#f87171';

  return (
    <Pressable
      onPress={() => router.push({
        pathname: '/game/[id]',
        params: { id: String(game.id), name: game.name, image: game.image || '', slug: game.rawgSlug || '', hasSteam: game.hasSteam ? '1' : '' },
      })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.coverWrap}>
        <PosterImage
          uri={game.image}
          placeholder={BLUR_HASH}
          recyclingKey={String(game.id)}
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'rgba(6,7,9,0.55)', 'rgba(6,7,9,0.96)']}
          locations={[0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Metacritic */}
        {game.metacritic ? (
          <View style={styles.mcBadge}>
            <Text style={[styles.mcText, { color: mcColor }]}>{game.metacritic}</Text>
          </View>
        ) : null}

        {/* Ücretsiz / indirim rozeti */}
        {isFree ? (
          <View style={[styles.tagBadge, { backgroundColor: colors.green }]}>
            <Text style={styles.tagFree}>{t('card.free')}</Text>
          </View>
        ) : onSale ? (
          <View style={[styles.tagBadge, { backgroundColor: colors.accent }]}>
            <Text style={styles.tagSale}>-%{price.discount}</Text>
          </View>
        ) : null}

        {/* Alt bilgi */}
        <View style={styles.info}>
          <Text numberOfLines={2} style={styles.name}>{game.name}</Text>
          <View style={styles.metaRow}>
            {game.genres?.length ? (
              <Text numberOfLines={1} style={styles.genre}>{game.genres.slice(0, 2).join(' · ')}</Text>
            ) : <View />}
            {isFree ? (
              <Text style={styles.priceFree}>{t('card.free')}</Text>
            ) : price?.price != null ? (
              <Text style={[styles.price, onSale && { color: colors.accentText }]}>{formatPrice(price.price)}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// Prop olarak yalnızca `game` alır; referans stabil olduğu için parent
// re-render'larında (arama, loadingMore vb.) yeniden render OLMAZ.
export default memo(GameCard);

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  coverWrap: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#0d0f12' },
  mcBadge: {
    position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(8,10,14,0.75)',
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  mcText: { fontSize: 12, fontWeight: '800' },
  tagBadge: { position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagFree: { fontSize: 11, fontWeight: '800', color: '#04130d' },
  tagSale: { fontSize: 11, fontWeight: '800', color: '#fff' },
  info: { position: 'absolute', left: 12, right: 12, bottom: 11 },
  name: { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  genre: { fontSize: 11.5, color: 'rgba(255,255,255,0.6)', flexShrink: 1, marginRight: 8 },
  price: { fontSize: 14, fontWeight: '800', color: '#fff' },
  priceFree: { fontSize: 14, fontWeight: '800', color: colors.green },
});
