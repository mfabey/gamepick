// ─────────────────────────────────────────────────────────────────────────────
// Gamerisen geliştirici rozeti — 2.0 (27 Eyl).
//
// Satır içi (ad yanında): 2.0 `shield` ikonu, altın (kit: `trophy` tonu —
// marka kırmızısı değil). Etiketli (profil başlığı): 2.0 `Badge` — altın
// zemin + kalkan + "DEV". Eski sürüm Ionicons kalkanı ve sabit #F59E0B
// renkli, kenarlıklı bir kutuydu; açık temada okunmuyordu.
// ─────────────────────────────────────────────────────────────────────────────
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { Txt } from './ui/Primitives';
import { isDeveloperUser } from '../utils/developer';
import { useDesignTheme } from '../theme/useDesignTheme';
import { component as K, space } from '../theme/tokens';

/**
 * @param {object|string} user       Kullanıcı nesnesi veya kullanıcı adı
 * @param {string}        username   Kullanıcı adı (@username)
 * @param {boolean}       isDeveloper Sunucu tarafından doğrulanmış geliştirici bayrağı
 * @param {number}        size       Kalkan simgesi boyutu (varsayılan: 13)
 * @param {boolean}       showLabel  "DEV" etiketini kalkanın yanında gösterme
 * @param {object}        style      Ek stil nesnesi
 */
function DevBadge({ user, username, isDeveloper, size = 13, showLabel = false, style }) {
  const { colors } = useDesignTheme();
  const isDev = isDeveloper || isDeveloperUser(user || username);
  if (!isDev) return null;

  if (!showLabel) {
    return (
      <View style={[styles.satir, style]} accessibilityLabel="Gamerisen">
        <Icon name="shield" size={size} color={colors.gold} fill={colors.goldTint} strokeWidth={2.2} />
      </View>
    );
  }
  return (
    <View style={[styles.etiket, { backgroundColor: colors.goldTint }, style]} accessibilityLabel="Gamerisen DEV">
      <Icon name="shield" size={K.badgeSmall.icon} color={colors.gold} strokeWidth={2.4} />
      <Txt variant="badge" style={{ color: colors.gold }}>DEV</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  satir: { marginLeft: space[4], justifyContent: 'center' },
  // 2.0 Badge ölçüsü: 18 yükseklik, köşe 5.
  etiket: { flexDirection: 'row', alignItems: 'center', gap: K.badgeSmall.gap, height: K.badgeSmall.height,
    borderRadius: K.badgeSmall.radius, paddingHorizontal: K.badgeSmall.paddingH, marginLeft: space[8] },
});

export default memo(DevBadge);
