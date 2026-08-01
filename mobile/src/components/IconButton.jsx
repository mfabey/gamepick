// ─────────────────────────────────────────────────────────────────────────────
// İkon butonu — ikon-only kontroller için tek doğru yer.
//
// Denetimde 41 ikon-only butonun accessibilityLabel'ı olmadığı çıktı; VoiceOver
// bunları okuyamıyordu. Her birine tek tek etiket eklemek yerine bileşene
// taşındı, çünkü tek tek eklenen etiketler zamanla yine unutulur.
//
// Bileşen üç şeyi birden garanti ediyor:
//   1. accessibilityLabel — verilmezse ikon adından TÜRETİLİR (yerelleştirilmiş)
//   2. Basma geri bildirimi — dokunuşa 100ms içinde görsel yanıt (HIG)
//   3. 44×44pt dokunma hedefi — görsel boyut küçük olsa da hitSlop ile
//
// Etiket bileşenin İÇİNDE çözülüyor; çağıran tarafın `t` erişimi olması
// gerekmiyor, bu yüzden alt bileşenlerde de sorunsuz kullanılabiliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// Sık kullanılan ikonlar için varsayılan etiket anahtarları
const DEFAULT_LABELS = {
  'chevron-back': 'a11y.back',
  'chevron-forward': 'a11y.forward',
  'close': 'a11y.close',
  'close-circle': 'a11y.clear',
  'trash-outline': 'a11y.delete',
  'trash': 'a11y.delete',
  'share-outline': 'a11y.share',
  'share-social-outline': 'a11y.share',
  'settings-outline': 'a11y.settings',
  'create-outline': 'a11y.rename',
  'add': 'a11y.add',
  'albums-outline': 'a11y.addToCollection',
  'albums': 'a11y.addToCollection',
  'notifications-outline': 'a11y.follow',
  'notifications': 'a11y.unfollow',
  'flag-outline': 'a11y.report',
  'ellipsis-horizontal': 'a11y.more',
  'arrow-undo': 'a11y.undo',
  'information': 'a11y.info',
  'information-circle-outline': 'a11y.info',
  'heart': 'a11y.like',
  'heart-outline': 'a11y.like',
  'checkmark': 'a11y.confirm',
  'search': 'a11y.search',
  'log-out-outline': 'a11y.signOut',
};

const MIN_TARGET = 44;

export default function IconButton({
  icon,
  label,                 // açık etiket — verilmezse ikondan türetilir
  size = 22,
  color = colors.text,
  onPress,
  onLongPress,
  disabled,
  style,
  variant = 'plain',     // 'plain' | 'surface'
  ...rest
}) {
  const { t } = useLanguage();

  const key = DEFAULT_LABELS[icon];
  // t() bilinmeyen anahtarda anahtarın kendisini döndürüyor; o durumda
  // etiketsiz bırakmak yerine ikon adını okunur hâle getiriyoruz.
  const resolved = label
    || (key && t(key) !== key ? t(key) : null)
    || String(icon).replace(/-(outline|circle|sharp)$/g, '').replace(/-/g, ' ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolved}
      accessibilityState={disabled ? { disabled: true } : undefined}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'surface' && styles.surface,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      {...rest}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: MIN_TARGET,
    minHeight: MIN_TARGET,
    borderRadius: MIN_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: { backgroundColor: colors.card },
  // Basma geri bildirimi düzen KAYDIRMADAN yapılıyor (ölçek değil, opaklık):
  // ölçek animasyonu komşu içeriği titretiyordu.
  pressed: { opacity: 0.55 },
  disabled: { opacity: 0.4 },
});
