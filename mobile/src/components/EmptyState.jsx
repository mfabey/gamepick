// ─────────────────────────────────────────────────────────────────────────────
// Boş durum — sekiz ekranda kopyalanmış olan kalıbın tek hâli.
//
// HIG: boş bir ekran ölü uç olmamalı; ne olduğunu açıklamalı ve mümkünse
// kullanıcıyı bir sonraki adıma yönlendirmeli. Bu yüzden eylem düğmesi
// birinci sınıf bir seçenek.
// ─────────────────────────────────────────────────────────────────────────────
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, spacing, type } from '../theme';

export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  text,
  actionLabel,
  onAction,
  actionIcon,
  compact = false,
  children,
}) {
  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={compact ? 34 : 42} color={colors.text3} />
      </View>

      {title ? <Text style={styles.title}>{title}</Text> : null}
      {text ? <Text style={styles.text}>{text}</Text> : null}

      {actionLabel && onAction ? (
        <Pressable
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.85 }]}
          onPress={onAction}
        >
          {actionIcon ? <Ionicons name={actionIcon} size={17} color="#fff" /> : null}
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 40,
  },
  compact: { flex: 0, paddingVertical: 28 },

  // Simgeyi daireye almak boş alana bir odak noktası veriyor —
  // çıplak simge ekranda kaybolmuş gibi duruyordu.
  iconWrap: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.cardBorder,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    color: colors.text,
    fontSize: type.headline,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  text: {
    color: colors.text2,
    fontSize: type.subhead,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    maxWidth: 320,
  },

  action: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    height: 50, paddingHorizontal: 22,
    borderRadius: radius.lg, backgroundColor: colors.accent,
    marginTop: 22,
  },
  actionText: { color: '#fff', fontSize: type.subhead, fontWeight: '800' },
});
