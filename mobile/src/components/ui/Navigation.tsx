import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import Avatar from '../Avatar';
import { Lockup } from '../brand/Logo';
import { Icon, type IconName } from '../Icon';
import { Button, IconButton, Txt } from './Primitives';
import { useLanguage } from '../../context/LanguageContext';
import { useDesignTheme } from '../../theme/useDesignTheme';
import { blur, component as K, layout, priceStyle } from '../../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Gezinme bileşenleri — COMPONENTS.md §3. Kaynak: kit k.py page_head(),
// nav_bar(); s1.py home() başlığı ve sticky_bar(). Tasarımdaki "güvenli alan +
// 44/52" hesabının güvenli alan kısmını çağıran ekran veriyor (SafeAreaView
// edges top); bu bileşenler yalnız satırın kendisini çiziyor.
// ─────────────────────────────────────────────────────────────────────────────

function useGoBack(onBack?: () => void) {
  const router = useRouter();
  return onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
}

/** Büyük başlık (Topluluk, Videolar, Mesajlar…): 52 pt, 28/34 700; sağda ikonlar arası 4. */
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <Txt variant="largeTitle" accessibilityRole="header" numberOfLines={1} style={styles.flex}>{title}</Txt>
      {children ? <View style={styles.pageActions}>{children}</View> : null}
    </View>
  );
}

/** Ortalanmış başlıklı gezinme çubuğu: 44 pt, üç sütun 96 / esnek / 96. */
export function NavBar({ title, subtitle, onBack, left, right, border = false, backLabel }: {
  title?: string; subtitle?: string; onBack?: () => void; left?: React.ReactNode; right?: React.ReactNode;
  border?: boolean; backLabel?: string;
}) {
  const { colors } = useDesignTheme();
  const { t } = useLanguage();
  const back = useGoBack(onBack);
  return (
    <View style={[styles.navBar, border && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
      <View style={styles.navSide}>
        {left !== undefined ? left : (
          <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? t('a11y.back')} onPress={back} style={styles.navBack}>
            <Icon name="back" size={K.navBar.backIcon} color={colors.text} strokeWidth={K.navBar.backStroke} />
          </Pressable>
        )}
      </View>
      <View style={styles.navTitle}>
        {title ? <Txt variant="headline" accessibilityRole="header" numberOfLines={1}>{title}</Txt> : null}
        {subtitle ? <Txt variant="navSubtitle" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : null}
      </View>
      <View style={[styles.navSide, styles.navRight]}>{right}</View>
    </View>
  );
}

/** Ana sayfa başlığı: solda Lockup (32/22/9), sağda arama, bildirim ve 44 pt alanda 30 pt avatar. */
export function HomeHeader({ onSearch, onNotifications, hasUnread, avatar, name, onProfile, children }: {
  onSearch?: () => void; onNotifications?: () => void; hasUnread?: boolean;
  avatar?: string | null; name?: string; onProfile?: () => void;
  /** Bildirim merkezi gelene kadar ek eylemler (ör. haberler) buraya. */
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <View style={styles.homeHeader}>
      <Lockup markSize={K.homeHeader.markSize} wordSize={K.homeHeader.wordSize} gap={K.homeHeader.lockupGap} />
      <View style={styles.homeActions}>
        {onSearch && <IconButton icon="search" label={t('a11y.search')} onPress={onSearch} />}
        {onNotifications && <IconButton icon="bell" label={t('v2.notifications')} dot={hasUnread} onPress={onNotifications} />}
        {children}
        {onProfile && (
          <Pressable accessibilityRole="button" accessibilityLabel={t('tab.profile')} onPress={onProfile} style={styles.homeAvatar}>
            <Avatar avatar={avatar} name={name} size={K.homeHeader.avatar} style={undefined} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Sabit alt çubuğun kapladığı yükseklik — kaydırılan içeriğe alt dolgu olarak. */
export function useStickyBarInset() {
  const insets = useSafeAreaInsets();
  return K.stickyBar.paddingTop + K.stickyBar.button + Math.max(insets.bottom, K.stickyBar.minBottom);
}

/** Oyun Detayı / Fiyat Karşılaştırma altındaki fiyat + eylem çubuğu (tasarımda 92 = 10 + 48 + 34). */
export function StickyBottomBar({ price, subtitle, actionLabel, onAction, actionIcon = 'ext', disabled }: {
  price: string; subtitle?: string; actionLabel: string; onAction: () => void; actionIcon?: IconName; disabled?: boolean;
}) {
  const { colors, isDark } = useDesignTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, K.stickyBar.minBottom), borderTopColor: colors.lineStrong },
      Platform.OS !== 'ios' && { backgroundColor: colors.tabBar }]}>
      {/* iOS'ta cam (tabBar + blur 20); Android'de deneysel blur yerine aynı renk düz dolgu. */}
      {Platform.OS === 'ios' && <>
        <BlurView pointerEvents="none" tint={isDark ? 'dark' : 'light'} intensity={blur.tabBar.intensity} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar }]} />
      </>}
      <View style={styles.flex}>
        <Text allowFontScaling={false} numberOfLines={1} style={priceStyle(20, colors.text)}>{price}</Text>
        {subtitle ? <Txt variant="caption" numberOfLines={1} style={{ color: colors.text2 }}>{subtitle}</Txt> : null}
      </View>
      <Button title={actionLabel} height={K.stickyBar.button} iconRight={actionIcon} onPress={onAction} disabled={disabled} />
    </View>
  );
}

/** Karusel sayfa noktaları: seçili 18×6 kırmızı, diğerleri 6×6, aralık 6. */
export function PageDots({ count, active, style }: { count: number; active: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useDesignTheme();
  if (count < 2) return null;
  return (
    // Süs: karusel kaydırılarak geziliyor; ekran okuyucu kartları zaten sırayla okuyor.
    <View style={[styles.dots, style]} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.dot, {
          width: index === active ? K.pageDots.active : K.pageDots.size,
          backgroundColor: index === active ? colors.red : colors.pageDotOff,
        }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pageHeader: { height: K.pageHeader.height, paddingHorizontal: layout.gutter, flexDirection: 'row', alignItems: 'center' },
  pageActions: { flexDirection: 'row', alignItems: 'center', gap: K.pageHeader.actionGap, marginRight: K.pageHeader.edge },
  navBar: { height: K.navBar.height, paddingHorizontal: K.navBar.paddingH, flexDirection: 'row', alignItems: 'center' },
  navSide: { width: K.navBar.side, flexDirection: 'row', alignItems: 'center' },
  navRight: { justifyContent: 'flex-end', marginRight: K.navBar.edge },
  navBack: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center', marginLeft: K.navBar.backEdge },
  navTitle: { flex: 1, minWidth: 0, alignItems: 'center' },
  homeHeader: { height: K.homeHeader.height, paddingHorizontal: layout.gutter, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  homeActions: { flexDirection: 'row', alignItems: 'center', gap: K.homeHeader.actionGap, marginRight: K.homeHeader.edge },
  homeAvatar: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: K.stickyBar.paddingTop, paddingHorizontal: K.stickyBar.paddingH,
    borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: K.stickyBar.gap, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: K.pageDots.gap, marginTop: K.pageDots.top },
  dot: { height: K.pageDots.size, borderRadius: K.pageDots.size / 2 },
});
