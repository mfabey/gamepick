import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  Switch as NativeSwitch, type PressableProps, type TextProps, type TextInputProps,
  type StyleProp, type ViewStyle, type SwitchProps } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from '../Icon';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { typography, fontFor, control as C, motion, radius, layout, space } from '../../theme/tokens';

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof typography }) {
  const { colors } = useDesignTheme();
  return <Text maxFontSizeMultiplier={1.3} {...props} style={[typography[variant], { color: colors.text }, style]} />;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function PressableScale({ style, onPressIn, onPressOut, disabled, dimDisabled = true, ...props }: PressableProps & { dimDisabled?: boolean }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({
    opacity: disabled && dimDisabled ? C.disabledOpacity : 1 - progress.value * (1 - motion.press.opacity),
    transform: [{ scale: reduced ? 1 : 1 - progress.value * (1 - motion.press.scale) }],
  }));
  return <AnimatedPressable {...props} disabled={disabled}
    onPressIn={(event) => { setPressed(true); progress.value = withTiming(1, { duration: reduced ? 0 : motion.press.duration }); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); progress.value = withTiming(0, { duration: reduced ? 0 : motion.press.duration }); onPressOut?.(event); }}
    style={[typeof style === 'function' ? style({ pressed }) : style, animated]} />;
}

type ButtonProps = PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'tinted'; height?: 48 | 44 | 40 | 36; icon?: IconName; loading?: boolean };
export function Button({ title, variant = 'primary', height = 48, icon, loading, disabled, style, ...props }: ButtonProps) {
  const { colors } = useDesignTheme();
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surface2 : variant === 'tinted' ? colors.accentTint : undefined;
  const color = variant === 'primary' ? colors.onPrimary : variant === 'secondary' ? colors.text : colors.red;
  const fontSize = height === 48 ? 16 : height === 44 ? 15 : 14;
  return <PressableScale accessibilityRole="button" {...props} disabled={disabled || loading} dimDisabled={!!disabled}
    accessibilityState={{ ...props.accessibilityState, disabled: !!disabled || !!loading, busy: !!loading }}
    style={(state) => [s.button, { backgroundColor, height, minWidth: layout.minTouch,
      borderRadius: height >= 40 ? radius.button : radius.buttonSmall,
      paddingHorizontal: height >= 44 ? C.buttonPadding : C.buttonSmallPadding,
      opacity: disabled ? C.disabledOpacity : 1 }, typeof style === 'function' ? style(state) : style]}
    hitSlop={height < layout.minTouch ? (layout.minTouch - height) / 2 : undefined}>
    {loading ? <ActivityIndicator size={C.spinner} color={color} /> : icon ? <Icon name={icon} size={fontSize + 2} color={color} strokeWidth={C.iconStroke} /> : null}
    <Txt variant="button" style={{ color, fontSize }}>{title}</Txt>
  </PressableScale>;
}

export function IconButton({ icon, label, onPress, selected, style }: { icon: IconName; label: string; onPress?: () => void; selected?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useDesignTheme();
  return <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[s.iconButton, style]}>
    <Icon name={icon} size={C.iconButtonGlyph} color={selected ? colors.red : colors.text} />
  </PressableScale>;
}

export function Chip({ title, selected = false, onPress, icon }: { title: string; selected?: boolean; onPress: () => void; icon?: IconName }) {
  const { colors } = useDesignTheme();
  const color = selected ? colors.onPrimary : colors.text;
  return <PressableScale accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} hitSlop={(layout.minTouch - C.chipHeight) / 2}
    style={[s.chip, { backgroundColor: selected ? colors.primary : colors.surface2 }]}>
    {icon && <Icon name={icon} size={15} color={color} />}
    <Txt variant="subhead" style={{ color }}>{title}</Txt>
  </PressableScale>;
}

export function Segmented({ items, value, onChange }: { items: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useDesignTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selected = Math.max(0, items.findIndex((item) => item.value === value));
  const itemWidth = items.length ? (width - C.segmentPadding * 2) / items.length : 0;
  const position = useSharedValue(0);
  React.useEffect(() => {
    position.value = reduced ? selected * itemWidth : withTiming(selected * itemWidth, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [selected, itemWidth, reduced, position]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[s.segment, { backgroundColor: colors.fill }]} accessibilityRole="tablist">
    {itemWidth > 0 && <Animated.View pointerEvents="none" style={[s.segmentThumb, { width: itemWidth, backgroundColor: colors.segmentedThumb }, thumb]} />}
    {items.map((item) => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: item.value === value }}
      hitSlop={space[4]} onPress={() => onChange(item.value)} style={s.segmentItem}>
      <Txt variant="footnoteStrong" numberOfLines={1}>{item.label}</Txt>
    </Pressable>)}
  </View>;
}

export function TextField({ label, helper, error, style, onFocus, onBlur, ...props }: TextInputProps & { label: string; helper?: string; error?: string }) {
  const { colors } = useDesignTheme();
  const [focused, setFocused] = useState(false);
  return <View style={s.fieldGroup}>
    <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{label}</Txt>
    <TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} maxFontSizeMultiplier={1.3}
      placeholderTextColor={colors.text3} selectionColor={colors.red}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
      style={[s.field, { color: colors.text, backgroundColor: colors.surface1,
        borderColor: error || focused ? colors.red : colors.line,
        borderWidth: error || focused ? C.fieldFocusWidth : C.fieldBorderWidth }, style]} />
    {(error || helper) && <Txt variant="caption" accessibilityLiveRegion={error ? 'polite' : 'none'} style={{ color: error ? colors.red : colors.text3 }}>{error || helper}</Txt>}
  </View>;
}

export function Switch(props: SwitchProps) {
  const { colors } = useDesignTheme();
  return <NativeSwitch {...props} trackColor={{ false: colors.switchOff, true: colors.green }} accessibilityRole="switch" />;
}

export function CoverImage({ style, ...props }: ImageProps) {
  const { colors } = useDesignTheme();
  return <Image contentFit="cover" cachePolicy="memory-disk" {...props} style={[{ backgroundColor: colors.surface2, borderRadius: radius.cover }, style]} />;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useDesignTheme();
  return <View style={s.section}><Txt variant="title2" accessibilityRole="header" style={s.flex}>{title}</Txt>
    {action && <Pressable onPress={onAction} accessibilityRole="button" style={s.sectionAction}><Txt variant="cardTitle" style={{ color: colors.text2 }}>{action}</Txt><Icon name="chev" size={16} color={colors.text2} /></Pressable>}
  </View>;
}

export function ListGroup({ title, children, note }: { title?: string; children: React.ReactNode; note?: string }) {
  const { colors } = useDesignTheme();
  return <View style={s.listGroup}>{title && <Txt variant="footnoteStrong" style={[s.listLabel, { color: colors.text2 }]}>{title}</Txt>}
    <View style={[s.listBox, { backgroundColor: colors.surface1 }]}>{children}</View>
    {note && <Txt variant="caption" style={[s.listLabel, { color: colors.text3 }]}>{note}</Txt>}
  </View>;
}

export function ListRow({ title, value, icon, onPress, trailing, destructive }: { title: string; value?: string; icon?: IconName; onPress?: () => void; trailing?: React.ReactNode; destructive?: boolean }) {
  const { colors } = useDesignTheme();
  const content = <>{icon && <Icon name={icon} size={20} color={destructive ? colors.red : colors.text2} />}
    <Txt variant="input" style={[s.flex, destructive && { color: colors.red }]}>{title}</Txt>
    {value && <Txt variant="cardTitle" style={{ color: colors.text2 }}>{value}</Txt>}
    {trailing ?? (onPress ? <Icon name="chev" size={16} color={colors.text3} /> : null)}</>;
  return onPress ? <PressableScale onPress={onPress} accessibilityRole="button" style={s.listRow}>{content}</PressableScale> : <View style={s.listRow}>{content}</View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: C.buttonGap },
  iconButton: { width: C.iconButton, height: C.iconButton, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  chip: { height: C.chipHeight, paddingHorizontal: C.chipPadding, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: space[6] },
  segment: { height: C.segmentHeight, padding: C.segmentPadding, borderRadius: radius.segmented, flexDirection: 'row' },
  segmentItem: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  segmentThumb: { position: 'absolute', left: C.segmentPadding, top: C.segmentPadding, bottom: C.segmentPadding, borderRadius: radius.md },
  fieldGroup: { gap: C.fieldLabelGap },
  field: { minHeight: C.fieldHeight, paddingHorizontal: C.fieldPadding, borderRadius: radius.button, ...fontFor('400'), fontSize: 16 },
  section: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: C.sectionHeight },
  sectionAction: { minHeight: layout.minTouch, flexDirection: 'row', alignItems: 'center', gap: space[4] },
  listGroup: { marginHorizontal: layout.gutter, gap: space[8] },
  listLabel: { paddingHorizontal: C.listPadding },
  listBox: { borderRadius: radius.card, overflow: 'hidden' },
  listRow: { minHeight: C.listHeight, paddingHorizontal: C.listPadding, paddingVertical: space[8], flexDirection: 'row', alignItems: 'center', gap: C.listGap },
});
