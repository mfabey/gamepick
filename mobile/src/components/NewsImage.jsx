import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme';

// Görseli olan → resim; olmayan → renkli harf placeholder.
// News sekmesi ve Home haber şeridi ortak kullanır.
export default function NewsImage({ item, style }) {
  if (item.image) {
    return (
      <Image source={item.image} recyclingKey={item.id} cachePolicy="memory-disk"
        style={style} contentFit="cover" transition={200} />
    );
  }
  return (
    <View style={[style, { backgroundColor: item.art || colors.card, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: 'rgba(255,255,255,0.85)' }}>{item.mono || '?'}</Text>
    </View>
  );
}
