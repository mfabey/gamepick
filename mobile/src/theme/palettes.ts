import { colors, tabBar } from './tokens';

export type DesignColors = { [K in keyof typeof colors]: string };

// The handoff contains a dark palette. The light counterpart preserves the
// existing system/light preference while using the same semantic roles.
export const lightColors: DesignColors = {
  ...colors,
  bg: '#F4F4F4', bg2: '#EFEFF2', surface1: '#FFFFFF',
  surface2: '#E5E5EA', surface3: '#D8D8DE',
  fill: 'rgba(118,118,128,0.12)',
  line: 'rgba(0,0,0,0.08)', lineStrong: 'rgba(0,0,0,0.14)',
  text: '#191919', text2: '#53535B', text3: '#62626B',
  red: '#BC0C0C', primary: '#191919', onPrimary: '#F5F5F7',
  onPrimaryMuted: 'rgba(245,245,247,0.65)',
  green: '#087A35', greenTint: 'rgba(8,122,53,0.12)', onGreen: '#FFFFFF',
  orange: '#9B5700', orangeTint: 'rgba(155,87,0,0.12)',
  gold: '#806000', goldTint: 'rgba(128,96,0,0.12)',
  starOff: '#AEAEB2', segmentedThumb: '#FFFFFF',
  switchOff: 'rgba(120,120,128,0.20)', tabBar: 'rgba(244,244,244,0.96)',
  pillNeutral: 'rgba(0,0,0,0.08)', pillNeutralSoft: 'rgba(0,0,0,0.06)',
  pageDotOff: 'rgba(0,0,0,0.22)',
};

export const designPalettes: Record<'dark' | 'light', DesignColors> = {
  dark: colors, light: lightColors,
};

export const lightTabBar = {
  ios: {
    ...tabBar.ios,
    iconOff: lightColors.text2, cutout: '#E4E4E8',
    glassTint: 'rgba(244,244,244,0.35)', fallbackFill: 'rgba(244,244,244,0.72)',
    edge: 'inset 0 0 0 0.5px rgba(0,0,0,0.10)',
    shadow: '0 12px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
    lens: { ...tabBar.ios.lens, fill: 'rgba(0,0,0,0.06)', edge: 'inset 0 0 0 0.5px rgba(0,0,0,0.06)' },
    badge: { ...tabBar.ios.badge, ring: '#EFEFF2' },
  },
  android: {
    ...tabBar.android, iconOff: lightColors.text2, cutout: '#E2B6B6', fill: lightColors.bg2,
    indicator: { ...tabBar.android.indicator, fill: 'rgba(188,12,12,0.16)' },
  },
};

/** Legacy names remain valid until each screen adopts the v2 primitives. */
export function legacyDesignColors(c: DesignColors) {
  return {
    bg: c.bg, bgElevated: c.bg2, card: c.surface1,
    bgInput: c.surface2, bgHover: c.surface2, surfaceTile: c.surface3,
    cardBorder: c.line, borderHover: c.lineStrong,
    text: c.text, text2: c.text2, text3: c.text3,
    accent: c.brand, accentText: c.red,
    accentBg: c.redTint, accentSoft: c.redTint, accentPill: c.redTint,
    accentBorder: c.accentLine, onAccent: c.white,
    accentFillStrong: c.brand, green: c.green, danger: c.red,
    glassFill: c.tabBar, glassBorder: c.lineStrong, barSolid: c.bg2,
    tabVurgu: c.accentTint,
  };
}
