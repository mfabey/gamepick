import { useWindowDimensions } from 'react-native';
import { layout, size, component as K } from '../theme/tokens';

// Sabit 148 pt kartlar: dar pencerede küçülmek yerine sütun sayısı azalır.
export function useDesignGrid() {
  const { width } = useWindowDimensions();
  const gap = K.rail.game[0];
  const columns = Math.max(1, Math.floor((width - layout.gutter * 2 + gap) / (size.cover.medium.width + gap)));
  return { columns, padding: layout.gutter - gap / 2, gap };
}
