import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../Icon';
import { PressableScale, Txt } from './Primitives';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { useLanguage } from '../../context/LanguageContext';
import { gradients, size } from '../../theme/tokens';

export default function VideoCard({ item, onPress, short = false, fluid = false }) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  return <PressableScale accessibilityRole="button" accessibilityLabel={item.name} onPress={onPress}
    style={{ width: fluid ? '100%' : short ? size.cover.short.width : size.cover.video.width }}>
    <View style={[s.cover, { height: short ? size.cover.short.height : undefined, aspectRatio: short ? undefined : 280 / 158, backgroundColor: colors.surface2 }]}>
      <Image source={item.thumbnail || item.image} contentFit="cover" recyclingKey={item.id} style={StyleSheet.absoluteFill} />
      {short ? <LinearGradient {...gradients.shortCard} style={StyleSheet.absoluteFill} /> : null}
      <View style={[s.play, { backgroundColor: colors.darkGlass }]}><Icon name="playf" size={22} color={colors.white} /></View>
      {short && <Txt variant="footnoteStrong" numberOfLines={2} style={[s.shortTitle, { color: colors.white }]}>{item.name}</Txt>}
    </View>
    {!short && <View style={s.info}>
      <Txt variant="cardTitle" numberOfLines={2}>{item.name}</Txt>
      <Txt variant="footnote" style={{ color: colors.text2 }}>{t('v2.trailers')} · Steam</Txt>
    </View>}
  </PressableScale>;
}
const s = StyleSheet.create({
  cover: { borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  info: { paddingTop: 8, gap: 4 },
  shortTitle: { position: 'absolute', bottom: 12, left: 12, right: 12 },
});
