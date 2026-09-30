import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Icon } from '../Icon';
import { PressableScale, Txt } from './Primitives';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { component as K, fontFor, layout, typography } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// ARAMA ALANI — kit k.py search_field(): 40 pt, köşe 12, zemin `fill`,
// iç boşluk 0 8 0 12, arama ikonu 18, temizle düğmesi 28 pt alanda 18 pt daire.
// Odakta içte 1,5 pt kırmızı halka — kenarlık değil üst katman, düzen kaymaz.
//
// MİKROFON YOK: tasarımda var, ama mikrofon izni bilerek kapalı ve sesli
// arama yok (AGENTS.md → İzin metinleri; plan §6.4). İkon, var olmayan bir
// özelliği vaat ederdi.
//
// İKİ KİP: `onPress` verilir ve `value` verilmezse düğme gibi davranıyor
// (ana sayfadaki arama girişi gibi); yazı alanı başka ekranda açılıyor.
// ─────────────────────────────────────────────────────────────────────────────
type Props = Omit<TextInputProps, 'style'> & {
  onPress?: () => void; onClear?: () => void; style?: StyleProp<ViewStyle>;
  /** Sağda kırmızı "Vazgeç" (Arama ekranı, DS 2): alan ile arası 10, 16 pt. */
  onCancel?: () => void;
};

export function SearchField({ onCancel, ...props }: Props) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  if (!onCancel) return <Field {...props} />;
  return (
    <View style={[styles.withCancel, props.style]}>
      <Field {...props} style={styles.flex} />
      <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={layout.minTouch / 4} style={styles.cancel}>
        <Txt variant="input" style={{ color: colors.red }}>{t('v2.cancel')}</Txt>
      </Pressable>
    </View>
  );
}

function Field({ value, onChangeText, onPress, onClear, placeholder, style, accessibilityLabel, ...input }: Omit<Props, 'onCancel'>) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const label = accessibilityLabel ?? placeholder ?? t('a11y.search');

  if (onPress && value === undefined) {
    return (
      <PressableScale accessibilityRole="search" accessibilityLabel={label} onPress={onPress}
        style={[styles.box, { backgroundColor: colors.fill }, style]}>
        <Icon name="search" size={K.search.icon} color={colors.text2} strokeWidth={K.search.iconStroke} />
        <Txt variant="input" numberOfLines={1} style={[styles.flex, { color: colors.text3 }]}>{placeholder}</Txt>
      </PressableScale>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: colors.fill }, style]}>
      <Icon name="search" size={K.search.icon} color={colors.text2} strokeWidth={K.search.iconStroke} />
      <TextInput {...input} value={value} onChangeText={onChangeText} placeholder={placeholder}
        accessibilityLabel={label} accessibilityRole="search" returnKeyType="search" clearButtonMode="never"
        maxFontSizeMultiplier={1.3} placeholderTextColor={colors.text3} selectionColor={colors.red}
        onFocus={(e) => { setFocused(true); input.onFocus?.(e); }} onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        style={[styles.input, { color: colors.text }]} />
      {!!value && (
        <Pressable accessibilityRole="button" accessibilityLabel={t('a11y.clear')}
          hitSlop={(layout.minTouch - K.search.clearArea) / 2}
          onPress={() => { onChangeText?.(''); onClear?.(); }} style={styles.clear}>
          <View style={[styles.clearCircle, { backgroundColor: colors.text3 }]}>
            <Icon name="x" size={K.search.clearIcon} color={colors.surface1} strokeWidth={K.search.clearStroke} />
          </View>
        </Pressable>
      )}
      {focused && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ring, { borderColor: colors.red }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  withCancel: { flexDirection: 'row', alignItems: 'center', gap: K.search.cancelGap },
  cancel: { minHeight: layout.minTouch, justifyContent: 'center' },
  box: { height: K.search.height, borderRadius: K.search.radius, paddingLeft: K.search.paddingLeft, paddingRight: K.search.paddingRight,
    flexDirection: 'row', alignItems: 'center', gap: K.search.gap },
  input: { flex: 1, height: K.search.height, padding: 0, ...fontFor('400'), fontSize: typography.input.fontSize },
  clear: { width: K.search.clearArea, height: K.search.clearArea, alignItems: 'center', justifyContent: 'center' },
  clearCircle: { width: K.search.clearCircle, height: K.search.clearCircle, borderRadius: K.search.clearCircle / 2, alignItems: 'center', justifyContent: 'center' },
  ring: { borderRadius: K.search.radius, borderWidth: K.search.focusRing },
});
