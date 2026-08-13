import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, type } from '../theme';
import { getAvatarPreset } from '../utils/avatar';

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

function isPhoto(v) {
  return typeof v === 'string' && /^https?:\/\//.test(v);
}

/**
 * @param avatar ön ayar kimliği (`p1`…), fotoğraf URL'i veya null
 * @param name   baş harf yedeği için görünen ad
 * @param size   çap (pt)
 * @param style  ek stil (kenarlık, konum vb.)
 */
function Avatar({ avatar, name, size = 36, style }) {
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
          transition={140}
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
    <View style={[styles.base, box, style]}>
      <Text style={[styles.letter, { fontSize: Math.round(size * 0.42) }]}>
        {String(name || '?').charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { color: colors.text2, fontWeight: '800' },
});

export default memo(Avatar);
