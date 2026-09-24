import React, { Children, isValidElement, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View,
  Switch as NativeSwitch, type PressableProps, type TextProps, type TextInputProps,
  type StyleProp, type ViewStyle, type SwitchProps } from 'react-native';
import { Image, type ImageProps } from 'expo-image';
import { BlurView } from 'expo-blur';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from '../Icon';
import { GlassView } from './GlassView';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { designPalettes } from '../../theme/palettes';
import { typography, fontFor, control as C, component as K, motion, radius, layout, space, shadow, blur } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Gamerisen 2.0 temel kontrolleri — COMPONENTS.md §1–2.
// Ölçülerin kaynağı design/kit/k.py (btn, iconbtn, chip, segmented, toggle,
// field, sec_head) ve c.py (row_item, group). Sayılar tokens.ts'ten geliyor.
// Renkler useDesignTheme'den: açık/koyu tercihi korunuyor (plan §3.1).
// ─────────────────────────────────────────────────────────────────────────────

export function Txt({ variant = 'body', style, ...props }: TextProps & { variant?: keyof typeof typography }) {
  const { colors } = useDesignTheme();
  return <Text maxFontSizeMultiplier={1.3} {...props} style={[typography[variant], { color: colors.text }, style]} />;
}

// Basma: scale 0.97 + opaklık 0.9, 150 ms ease-out (kit `.press`). Tek bileşen:
// bütün kartlar ve butonlar aynı hissi versin.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function PressableScale({ style, onPressIn, onPressOut, disabled, dimDisabled = true, ...props }: PressableProps & { dimDisabled?: boolean }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const [pressed, setPressed] = useState(false);
  const animated = useAnimatedStyle(() => ({
    opacity: disabled && dimDisabled ? C.disabledOpacity : 1 - progress.value * (1 - motion.press.opacity),
    transform: [{ scale: reduced ? 1 : 1 - progress.value * (1 - motion.press.scale) }],
  }));
  const to = (value: number) => withTiming(value, { duration: reduced ? 0 : motion.press.duration, easing: motion.easing.out });
  return <AnimatedPressable {...props} disabled={disabled}
    onPressIn={(event) => { setPressed(true); progress.value = to(1); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); progress.value = to(0); onPressOut?.(event); }}
    style={[typeof style === 'function' ? style({ pressed }) : style, animated]} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'tinted' | 'onArt';
type ButtonProps = PressableProps & {
  title: string; variant?: ButtonVariant;
  /** COMPONENTS: 48/44/40/36. Kaynaklarda ayrıca 52 (Giriş yap), 50 (G-08 Mağazaya Git,
   *  G-03 sosyal girişler), 34 (G-12/G-22 kaydet) ve 30 (DS 2 Mini) var. */
  height?: 52 | 50 | 48 | 44 | 40 | 36 | 34 | 30;
  icon?: IconName; iconRight?: IconName; loading?: boolean;
  /** Görselin üstünde (HeroCard): renkler temadan bağımsız, tasarımın koyu paleti.
   *  Açık temada birincil koyulaşıyor; koyu degradeli görsel üstünde siyah buton kayboluyordu. */
  onImage?: boolean;
};
export function Button({ title, variant = 'primary', height = 48, icon, iconRight, loading, disabled, onImage, style, ...props }: ButtonProps) {
  const themed = useDesignTheme().colors;
  const colors = onImage ? designPalettes.dark : themed;
  const backgroundColor = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surface2
    : variant === 'tinted' ? colors.accentTint : undefined;
  // Görsel üstü buton TEMA BAĞIMSIZ beyaz: zemin görsel (kit btn 'onart').
  const color = variant === 'primary' ? colors.onPrimary : variant === 'secondary' ? colors.text
    : variant === 'onArt' ? colors.white : colors.red;
  const fontSize = height >= 48 ? 16 : height === 44 ? 15 : height >= 36 ? 14 : 13;
  return <PressableScale accessibilityRole="button" {...props} disabled={disabled || loading} dimDisabled={!!disabled}
    accessibilityState={{ ...props.accessibilityState, disabled: !!disabled || !!loading, busy: !!loading }}
    style={(state) => [s.button, { backgroundColor, height, minWidth: layout.minTouch,
      borderRadius: height >= 40 ? radius.button : radius.buttonSmall,
      paddingHorizontal: height >= 44 ? C.buttonPadding : C.buttonSmallPadding,
      opacity: disabled ? C.disabledOpacity : 1 }, variant === 'onArt' && s.clip, typeof style === 'function' ? style(state) : style]}
    hitSlop={height < layout.minTouch ? (layout.minTouch - height) / 2 : undefined}>
    {variant === 'onArt' && <>
      <BlurView pointerEvents="none" tint={blur.glass.tint} intensity={blur.glass.intensity} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.onArtButton }]} />
    </>}
    {/* YÜKLENİRKEN YALNIZ YAY (DS 2 "Yükleniyor" sütunu). İçerik görünmez ama
        yerini koruyor: buton genişliği değişmiyor, düzen kaymıyor. */}
    <View style={[s.buttonContent, loading && s.hidden]}>
      {icon ? <Icon name={icon} size={fontSize + 2} color={color} strokeWidth={C.iconStroke} /> : null}
      <Txt variant="button" numberOfLines={1} style={{ color, fontSize }}>{title}</Txt>
      {iconRight ? <Icon name={iconRight} size={fontSize + 1} color={color} strokeWidth={C.iconStroke} /> : null}
    </View>
    {loading && <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.centered]}>
      <ActivityIndicator size={Platform.OS === 'ios' ? 'small' : C.spinner} color={color} />
    </View>}
  </PressableScale>;
}

type IconButtonProps = {
  icon: IconName; label: string; onPress?: () => void; onLongPress?: () => void;
  selected?: boolean; disabled?: boolean;
  /** plain: zeminsiz · filled: surface2 · onArt: görsel üstü cam */
  variant?: 'plain' | 'filled' | 'onArt';
  /** onArt'ta bulanıklık: kaydırılan listelerde false (plan §6.1). */
  blurred?: boolean;
  size?: number; iconSize?: number; color?: string; strokeWidth?: number; fill?: string;
  /** 8 pt kırmızı nokta; halka rengi arkadaki zemin olmalı. */
  dot?: boolean; ringColor?: string;
  badge?: number | string;
  style?: StyleProp<ViewStyle>;
};
export function IconButton({ icon, label, onPress, onLongPress, selected, disabled, variant = 'plain', blurred = true,
  size = C.iconButton, iconSize = C.iconButtonGlyph, color, strokeWidth, fill, dot, ringColor, badge, style }: IconButtonProps) {
  const { colors } = useDesignTheme();
  const onArt = variant === 'onArt';
  const tint = color ?? (selected ? colors.red : onArt ? colors.white : colors.text);
  const badgeText = typeof badge === 'number' && badge > 99 ? '99+' : badge;
  return <PressableScale accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!selected, disabled: !!disabled }}
    onPress={onPress} onLongPress={onLongPress} disabled={disabled}
    hitSlop={size < layout.minTouch ? (layout.minTouch - size) / 2 : undefined}
    style={[s.iconButton, { width: size, height: size, borderRadius: size / 2 },
      variant === 'filled' && { backgroundColor: colors.surface2 }, style]}>
    {onArt && <GlassView pointerEvents="none" blurred={blurred} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />}
    <Icon name={icon} size={iconSize} color={tint} strokeWidth={strokeWidth} fill={fill} />
    {dot && badge == null ? <View pointerEvents="none" style={[s.dot, { backgroundColor: colors.red,
      boxShadow: shadow.ring(K.iconButton.dotRing, ringColor ?? colors.bg) }]} /> : null}
    {badge != null && badge !== 0 ? <View pointerEvents="none" style={[s.badge, { backgroundColor: colors.brand }]}>
      <Text allowFontScaling={false} style={[s.badgeText, { color: colors.white }]}>{badgeText}</Text>
    </View> : null}
  </PressableScale>;
}

export function Chip({ title, selected = false, onPress, icon, chevron, removable, count, accessibilityLabel }: {
  title: string; selected?: boolean; onPress: () => void; icon?: IconName;
  /** Sonda aşağı ok: seçenek listesi açan çip ("Platform ⌄"). */
  chevron?: boolean;
  /** Sonda ×: uygulanmış filtre, dokununca kalkar ("RPG ×", DS 2). */
  removable?: boolean;
  /** Başlıktan sonra sayı rozeti — kit results() "Filtrele ②". 0 ya da yoksa çizilmez. */
  count?: number;
  accessibilityLabel?: string;
}) {
  const { colors } = useDesignTheme();
  const color = selected ? colors.onPrimary : colors.text;
  const trailing: IconName | null = removable ? 'x' : chevron ? 'chevd' : null;
  return <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ selected }}
    onPress={onPress} hitSlop={(layout.minTouch - C.chipHeight) / 2}
    style={[s.chip, removable && s.chipRemovable, { backgroundColor: selected ? colors.primary : colors.surface2 }]}>
    {icon && <Icon name={icon} size={K.chip.icon} color={color} strokeWidth={K.chip.iconStroke} />}
    <Txt variant="subhead" numberOfLines={1} style={{ color }}>{title}</Txt>
    {count ? <View style={[s.badge, s.badgeInline, { backgroundColor: colors.brand }]}>
      <Text allowFontScaling={false} style={[s.badgeText, { color: colors.white }]}>{count > 99 ? '99+' : count}</Text>
    </View> : null}
    {trailing && <Icon name={trailing} size={K.chip.chevron} color={color} strokeWidth={K.chip.chevronStroke} />}
  </PressableScale>;
}

export function Segmented({ items, value, onChange, accessibilityLabel, compact }: {
  items: { value: string; label: string }[]; value: string; onChange: (value: string) => void; accessibilityLabel?: string;
  /** Kısa boy (DS 2 · fiyat grafiği aralığı 3A/6A/1Y/Tümü): 30 pt, 12/600. */
  compact?: boolean;
}) {
  const { colors } = useDesignTheme();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const selected = Math.max(0, items.findIndex((item) => item.value === value));
  const itemWidth = items.length ? (width - C.segmentPadding * 2) / items.length : 0;
  const position = useSharedValue(0);
  // İlk yerleşim animasyonsuz: genişlik ölçülmeden parça soldan kayarak girerdi.
  const placed = useRef(false);
  useEffect(() => {
    if (!itemWidth) return;
    const next = selected * itemWidth;
    if (reduced || !placed.current) { position.value = next; placed.current = true; return; }
    position.value = withTiming(next, { duration: motion.duration.transition, easing: motion.easing.standard });
  }, [selected, itemWidth, reduced, position]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: position.value }] }));
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}
    style={[s.segment, compact && { height: K.segmentCompact.height }, { backgroundColor: colors.fill }]}>
    {itemWidth > 0 && <Animated.View pointerEvents="none"
      style={[s.segmentThumb, { width: itemWidth, backgroundColor: colors.segmentedThumb, boxShadow: shadow.segmentedThumb }, thumb]} />}
    {items.map((item) => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: item.value === value }}
      hitSlop={space[4]} onPress={() => onChange(item.value)} style={s.segmentItem}>
      {/* Beş dilde etiket 86 pt'lik parçaya sığmayabilir (plan §6.3): taşmak yerine küçülür. */}
      <Txt variant={compact ? 'captionStrong' : 'footnoteStrong'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{item.label}</Txt>
    </Pressable>)}
  </View>;
}

type FieldProps = TextInputProps & {
  label: string; helper?: string; error?: string; success?: string;
  icon?: IconName; trailing?: React.ReactNode;
  /** Sağ altta `uzunluk/maxLength` — biyografi gibi sınırlı alanlar. */
  counter?: boolean;
  /** Şifre alanı: göster/gizle düğmesi alanın içinde. */
  secure?: boolean;
};
export function TextField({ label, helper, error, success, icon, trailing, counter, secure, style, onFocus, onBlur, multiline, ...props }: FieldProps) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const message = error || success || helper;
  const tone = error ? colors.red : success ? colors.green : colors.text3;
  const active = !!error || focused;
  return <View style={s.fieldGroup}>
    <Txt variant="footnoteStrong" style={{ color: colors.text2 }}>{label}</Txt>
    <View style={[s.fieldBox, multiline && s.fieldBoxMultiline, { backgroundColor: colors.surface1 }]}>
      {icon && <Icon name={icon} size={C.fieldIcon} color={colors.text2} />}
      <TextInput {...props} multiline={multiline} secureTextEntry={secure ? hidden : props.secureTextEntry}
        accessibilityLabel={props.accessibilityLabel ?? label} maxFontSizeMultiplier={1.3}
        placeholderTextColor={colors.text3} selectionColor={colors.red}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }} onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[s.fieldInput, multiline && s.fieldInputMultiline, { color: colors.text }, style]} />
      {secure && <Pressable accessibilityRole="button" accessibilityLabel={t(hidden ? 'acc.showPassword' : 'acc.hidePassword')}
        onPress={() => setHidden((value) => !value)} hitSlop={space[8]} style={s.fieldTrailing}>
        <Icon name={hidden ? 'eye' : 'eyeoff'} size={C.fieldIcon} color={colors.text2} />
      </Pressable>}
      {trailing}
      {/* HALKA AYRI KATMANDA: kalınlık 1 → 2 olurken kenarlık değişseydi içerik
          1 pt kayardı. Kit halkayı `box-shadow: inset` çiziyor, düzen oynamıyor. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.fieldRing, {
        borderColor: active ? colors.red : colors.line,
        borderWidth: active ? C.fieldFocusWidth : C.fieldBorderWidth }]} />
    </View>
    {(message || counter) && <View style={s.helperRow}>
      {error ? <Icon name="alert" size={K.field.helperIcon} color={tone} strokeWidth={C.iconStroke} />
        : success ? <Icon name="checkc" size={K.field.helperIcon} color={tone} strokeWidth={C.iconStroke} /> : null}
      <Txt variant="caption" accessibilityLiveRegion={error ? 'polite' : 'none'} style={[s.flex, { color: tone }]}>{message ?? ''}</Txt>
      {counter && props.maxLength ? <Txt variant="caption" style={{ color: colors.text3, fontVariant: ['tabular-nums'] }}>
        {`${String(props.value ?? '').length}/${props.maxLength}`}</Txt> : null}
    </View>}
  </View>;
}

// iOS'ta yerel Switch tasarımla birebir (51×31). Android'in yerel Material
// anahtarı başka ölçü ve biçimde; DS 2 tek bir anahtar tarif ediyor, o yüzden
// Android'de kit'in `toggle()`u çiziliyor: 51×31, 27 düğme, 200 ms.
export function Switch({ value, onValueChange, disabled, accessibilityLabel, ...props }: SwitchProps) {
  const { colors } = useDesignTheme();
  if (Platform.OS === 'ios') {
    return <NativeSwitch {...props} value={value} onValueChange={onValueChange} disabled={disabled}
      accessibilityLabel={accessibilityLabel} trackColor={{ false: colors.switchOff, true: colors.green }}
      ios_backgroundColor={colors.switchOff} accessibilityRole="switch" />;
  }
  return <AndroidSwitch value={!!value} onValueChange={onValueChange} disabled={disabled}
    accessibilityLabel={accessibilityLabel} on={colors.green} off={colors.switchOff} knob={colors.white} />;
}

function AndroidSwitch({ value, onValueChange, disabled, accessibilityLabel, on, off, knob }: {
  value: boolean; onValueChange?: (value: boolean) => void; disabled?: boolean | null; accessibilityLabel?: string;
  on: string; off: string; knob: string;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    const next = value ? 1 : 0;
    progress.value = reduced ? next : withTiming(next, { duration: motion.duration.standard, easing: motion.easing.switch });
  }, [value, reduced, progress]);
  const travel = K.switchAndroid.width - K.switchAndroid.knob - K.switchAndroid.inset * 2;
  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [off, on]) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: progress.value * travel }] }));
  return <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ checked: value, disabled: !!disabled }} disabled={!!disabled}
    onPress={() => onValueChange?.(!value)} hitSlop={(layout.minTouch - K.switchAndroid.height) / 2}
    style={{ opacity: disabled ? C.disabledOpacity : 1 }}>
    <Animated.View style={[s.switchTrack, track]}>
      <Animated.View style={[s.switchKnob, { backgroundColor: knob, boxShadow: shadow.switchKnob }, thumb]} />
    </Animated.View>
  </Pressable>;
}

export function CoverImage({ style, radius: r = radius.cover, contentPosition, ...props }: ImageProps & { radius?: number }) {
  const { colors } = useDesignTheme();
  return <Image contentFit="cover" cachePolicy="memory-disk" contentPosition={contentPosition} {...props}
    style={[{ backgroundColor: colors.surface2, borderRadius: r }, style]} />;
}

export function SectionHeader({ title, action, onAction, subtitle }: { title: string; action?: string; onAction?: () => void; subtitle?: string }) {
  const { colors } = useDesignTheme();
  return <View style={s.sectionWrap}>
    <View style={s.section}>
      <Txt variant="title2" accessibilityRole="header" numberOfLines={2} style={s.flex}>{title}</Txt>
      {/* Satır 28 pt kalıyor (kit sec_head); 44 pt dokunma alanı hitSlop'tan. */}
      {action && <Pressable onPress={onAction} accessibilityRole="button" hitSlop={(layout.minTouch - C.sectionHeight) / 2} style={s.sectionAction}>
        <Txt variant="link" style={{ color: colors.text2 }}>{action}</Txt>
        <Icon name="chev" size={K.sectionHeader.linkIcon} color={colors.text2} strokeWidth={K.sectionHeader.linkStroke} />
      </Pressable>}
    </View>
    {subtitle ? <Txt variant="footnote" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : null}
  </View>;
}

// Satırlar arasındaki ayraç GRUBUN işi: satır kendi başına "ilk mi" bilemez.
// Ayraç ikonlu satırda metnin hizasından (60), ikonsuzda kenar boşluğundan (16).
export function ListGroup({ title, children, note }: { title?: string; children: React.ReactNode; note?: string }) {
  const { colors } = useDesignTheme();
  const rows = Children.toArray(children).filter(isValidElement) as React.ReactElement<{ icon?: IconName }>[];
  return <View style={s.listGroup}>{title && <Txt variant="footnoteStrong" style={[s.listLabel, { color: colors.text2 }]}>{title}</Txt>}
    <View style={[s.listBox, { backgroundColor: colors.surface1 }]}>
      {rows.map((row, index) => <React.Fragment key={row.key ?? index}>
        {index > 0 && <View style={[s.separator, { backgroundColor: colors.line,
          marginLeft: row.props.icon ? K.listRow.separatorWithIcon : K.listRow.separator }]} />}
        {row}
      </React.Fragment>)}
    </View>
    {note && <Txt variant="caption" style={[s.listLabel, { color: colors.text3 }]}>{note}</Txt>}
  </View>;
}

export function ListRow({ title, value, description, icon, iconBackground, onPress, trailing, destructive, disabled, accessibilityLabel }: {
  title: string; value?: string; icon?: IconName; iconBackground?: string; onPress?: () => void;
  description?: string; disabled?: boolean;
  /** Sağdaki öğe; verilmezse dokunulabilir satırda ok. `false` oku gizler (ör. "Çıkış yap"). */
  trailing?: React.ReactNode; destructive?: boolean; accessibilityLabel?: string;
}) {
  const { colors } = useDesignTheme();
  const content = <>
    {icon && <View style={[s.listIconBox, { backgroundColor: iconBackground ?? colors.surface2 }]}>
      <Icon name={icon} size={K.listRow.icon} color={destructive ? colors.red : colors.text} />
    </View>}
    <View style={s.flex}>
      <Txt variant="input" numberOfLines={2} style={destructive && { color: colors.red }}>{title}</Txt>
      {description && <Txt variant="footnote" style={{ color: colors.text2 }}>{description}</Txt>}
    </View>
    {value && <Txt variant="bodyTight" numberOfLines={1} style={[s.listValue, { color: colors.text2 }]}>{value}</Txt>}
    {trailing ?? (onPress ? <Icon name="chev" size={K.sectionHeader.linkIcon} color={colors.text3} strokeWidth={K.sectionHeader.linkStroke} /> : null)}
  </>;
  return onPress
    ? <PressableScale onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={accessibilityLabel} style={s.listRow}>{content}</PressableScale>
    : <View accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel} style={s.listRow}>{content}</View>;
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: C.buttonGap },
  hidden: { opacity: 0 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: K.iconButton.dotTop, right: K.iconButton.dotRight, width: K.iconButton.dotSize, height: K.iconButton.dotSize, borderRadius: K.iconButton.dotSize / 2 },
  badge: { position: 'absolute', top: K.iconButton.badgeTop, right: K.iconButton.badgeRight, minWidth: K.iconButton.badgeSize, height: K.iconButton.badgeSize,
    borderRadius: K.iconButton.badgeSize / 2, paddingHorizontal: K.iconButton.badgePadding, alignItems: 'center', justifyContent: 'center' },
  badgeText: { ...typography.badge, fontVariant: ['tabular-nums'] },
  // Aynı rozet, IconButton'ın köşesi yerine çipin satırında (akışta).
  badgeInline: { position: 'relative', top: 0, right: 0 },
  chip: { height: C.chipHeight, paddingHorizontal: C.chipPadding, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: K.chip.gap },
  chipRemovable: { paddingRight: K.chip.removablePaddingRight },
  segment: { height: C.segmentHeight, padding: C.segmentPadding, borderRadius: radius.segmented, flexDirection: 'row' },
  segmentItem: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  segmentThumb: { position: 'absolute', left: C.segmentPadding, top: C.segmentPadding, bottom: C.segmentPadding, borderRadius: radius.md },
  fieldGroup: { gap: C.fieldLabelGap },
  fieldBox: { minHeight: C.fieldHeight, borderRadius: radius.button, paddingHorizontal: C.fieldPadding, flexDirection: 'row', alignItems: 'center', gap: K.field.iconGap },
  fieldBoxMultiline: { alignItems: 'flex-start', paddingVertical: space[12] },
  fieldInput: { flex: 1, minHeight: C.fieldHeight - 2, padding: 0, ...fontFor('400'), fontSize: typography.input.fontSize },
  fieldInputMultiline: { minHeight: C.fieldHeight * 2, textAlignVertical: 'top' },
  fieldTrailing: { alignSelf: 'center' },
  fieldRing: { borderRadius: radius.button },
  helperRow: { flexDirection: 'row', alignItems: 'center', gap: K.field.helperGap },
  switchTrack: { width: K.switchAndroid.width, height: K.switchAndroid.height, borderRadius: K.switchAndroid.height / 2, padding: K.switchAndroid.inset },
  switchKnob: { width: K.switchAndroid.knob, height: K.switchAndroid.knob, borderRadius: K.switchAndroid.knob / 2 },
  sectionWrap: { gap: K.sectionHeader.subtitleGap },
  section: { flexDirection: 'row', alignItems: 'center', gap: space[12], minHeight: C.sectionHeight },
  sectionAction: { height: C.sectionHeight, flexDirection: 'row', alignItems: 'center', gap: K.sectionHeader.linkGap },
  listGroup: { marginHorizontal: layout.gutter, gap: space[8] },
  listLabel: { paddingHorizontal: C.listPadding },
  listBox: { borderRadius: radius.card, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth },
  listRow: { minHeight: C.listHeight, paddingHorizontal: C.listPadding, paddingVertical: space[8], flexDirection: 'row', alignItems: 'center', gap: C.listGap },
  listIconBox: { width: K.listRow.iconBox, height: K.listRow.iconBox, borderRadius: K.listRow.iconBoxRadius, alignItems: 'center', justifyContent: 'center' },
  listValue: { maxWidth: '45%' },
});
