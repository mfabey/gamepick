import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { type, motion } from '../theme';
import { useStyles, useTheme } from '../context/ThemeContext';
import { getAvatarPreset } from '../utils/avatar';
import { avatarPalette, component, fontFor } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Kullanıcı avatarı — TEK ÇİZİM YERİ.
//
// NEDEN BİLEŞEN OLDU: aynı "ön ayar varsa renk+simge, yoksa baş harf" mantığı
// sekiz dosyada birebir kopyalanmıştı. Avatar artık FOTOĞRAF da olabildiği
// için o mantık üçe çıkıyordu; sekiz yerde üç dallı bir koşul demek, birinde
// unutmak demek.
//
// Bugün bunun bedeli zaten görüldü: `stripHtml` vardı ama paylaşılmadığı için
// oyun detayı açıklamayı temizlerken anasayfa akışı ham HTML basıyordu.
//
// ÜÇ DURUM, bu sırayla:
//   1. `avatar` http ile başlıyorsa  → yüklenen fotoğraf
//   2. geçerli bir ön ayar kimliğiyse → renk + simge
//   3. hiçbiri değilse                → adın baş harfi
// ─────────────────────────────────────────────────────────────────────────────

// Baş harf zemini (kit avatar() + COMPONENTS §5): `avatarPalette` içinden, ada
// göre SABİT seçiliyor — aynı kişi her listede aynı renkte. Zemin kişinin
// rengi, harf açık: tema bağımsız.
function paletteFor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

function isPhoto(v) {
  return typeof v === 'string' && (/^https?:\/\//.test(v) || /^data:image\//.test(v));
}

/**
 * @param avatar ön ayar kimliği (`p1`…), fotoğraf URL'i veya null
 * @param name   baş harf yedeği için görünen ad
 * @param size   çap (pt)
 * @param style  ek stil (kenarlık, konum vb.)
 */
function Avatar({ avatar, name, size = 36, style }) {
  const styles = useStyles(makeStyles);
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (isPhoto(avatar)) {
    return (
      <View style={[styles.base, box, style]}>
        <Image
          source={avatar}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={motion.image}
        />
      </View>
    );
  }

  const preset = getAvatarPreset(avatar);
  if (preset) {
    return (
      <View style={[styles.base, box, { backgroundColor: preset.bg }, style]}>
        {/* Simge çapla ölçekleniyor: sabit boyut, 22pt'lik avatarda taşıyor
            56pt'likte kayboluyordu. */}
        <Ionicons name={preset.icon} size={Math.round(size * 0.5)} color={preset.iconColor} />
      </View>
    );
  }

  return (
    <View style={[styles.base, box, { backgroundColor: paletteFor(name) }, style]}>
      <Text allowFontScaling={false} style={[styles.letter, { fontSize: Math.floor(size * component.avatar.initialRatio) }]}>
        {String(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: '#F5F5F7', ...fontFor('600'), letterSpacing: 0 },
});

export default memo(Avatar);
