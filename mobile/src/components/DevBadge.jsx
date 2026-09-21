import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDeveloperUser } from '../utils/developer';
import { useStyles, useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../theme';

/**
 * Gamerisen Geliştirici Kalkan Rozeti
 * 
 * @param {object|string} user       Kullanıcı nesnesi veya kullanıcı adı
 * @param {string}        username   Kullanıcı adı (@username)
 * @param {boolean}       isDeveloper Sunucu tarafından doğrulanmış geliştirici bayrağı
 * @param {number}        size       Kalkan simgesi boyutu (varsayılan: 13)
 * @param {boolean}       showLabel  "DEV" etiketini kalkanın yanında gösterme
 * @param {object}        style      Ek stil nesnesi
 */
function DevBadge({ user, username, isDeveloper, size = 13, showLabel = false, style }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();

  const isDev = isDeveloper || isDeveloperUser(user || username);
  if (!isDev) return null;

  return (
    <View style={[styles.wrap, showLabel && styles.wrapWithLabel, style]}>
      <Ionicons name="shield-checkmark" size={size} color="#F59E0B" />
      {showLabel ? <Text style={styles.labelText}>DEV</Text> : null}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.s4,
  },
  wrapWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
    // tema-bagimsiz: gelistirici rozeti ozel altin sarisi vurgusu
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    // tema-bagimsiz: gelistirici rozeti ozel altin sarisi cercevesi
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.s4,
    paddingVertical: 0,
    marginLeft: spacing.s8,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
});

export default memo(DevBadge);
