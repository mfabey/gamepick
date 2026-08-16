import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { type, motion } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Görseli olan → resim; olmayan → renkli harf placeholder.
// News sekmesi ve Home haber şeridi ortak kullanır.
export default function NewsImage({ item, style }) {
  // Kanca erken donusten ONCE: gorsel varsa asagida hemen donuluyor.
  const { colors } = useTheme();
  if (item.image) {
    return (
      <Image source={item.image} recyclingKey={item.id} cachePolicy="memory-disk"
        style={style} contentFit="cover" transition={motion.image} />
    );
  }
  return (
    <View style={[style, { backgroundColor: item.art || colors.card, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: type.title1, fontWeight: '900', color: 'rgba(255,255,255,0.85)' }}>{item.mono || '?'}</Text>
    </View>
  );
}
