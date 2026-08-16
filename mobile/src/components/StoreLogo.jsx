import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { radius, motion } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Mağaza adı → SimpleIcons slug + marka rengi (web StoreLogo ile birebir).
// Xbox SimpleIcons'ta yok → Ionicons glyph.
// yedekAccent PARAMETRE: meta bir bilesen degil, kanca cagiramaz. Bilinmeyen
// magazanin yedek rengi canli paletten geliyor; modul sabiti olarak
// birakilsaydi tema degisince eski marka rengiyle cizilirdi.
function meta(store, yedekAccent) {
  const s = (store || '').toLowerCase();
  if (s.includes('steam'))       return { slug: 'steam',          bg: '#1b2838' };
  if (s.includes('epic'))        return { slug: 'epicgames',      bg: '#121212' };
  if (s.includes('gog'))         return { slug: 'gogdotcom',      bg: '#7c2da0' };
  if (s.includes('humble'))      return { slug: 'humblebundle',   bg: '#cc2929' };
  if (s.includes('playstation')) return { slug: 'playstation',    bg: '#003791' };
  if (s.includes('nintendo'))    return { slug: 'nintendoswitch', bg: '#e60012' };
  if (s.includes('xbox') || s.includes('microsoft') || s.includes('game pass'))
    return { ion: 'logo-xbox', bg: '#107c10' };
  return { slug: 'googlechrome', bg: yedekAccent };
}

// Markalı yuvarlak rozet + beyaz logo. Logo yüklenmezse renk rozeti fallback olur.
export default function StoreLogo({ store, size = 26 }) {
  const { colors } = useTheme();
  const { slug, ion, bg } = meta(store, colors.accent);
  const inner = Math.round(size * 0.56);
  return (
    <View style={{ width: size, height: size, borderRadius: radius.sm ?? 7, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      {ion ? (
        <Ionicons name={ion} size={inner} color="#fff" />
      ) : (
        <Image
          source={`https://cdn.simpleicons.org/${slug}/white`}
          style={{ width: inner, height: inner }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={motion.image}
        />
      )}
    </View>
  );
}
