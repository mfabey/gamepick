// Gamerisen ikon seti. Tasarımdaki 24×24 çizgi ikonların birebir aynısı.
// Kaynak: design/kit/k.py → IC ve TAB_FILL. Bu dosya otomatik üretildi; ikon eklemek için aynı biçimi izle.
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

const ICONS = {
  "search": <><Circle cx="11" cy="11" r="7" /><Path d="m20 20-3.6-3.6" /></>,
  "bell": <><Path d="M6 8.5a6 6 0 0 1 12 0c0 6.5 2.5 8.5 2.5 8.5h-17S6 15 6 8.5" /><Path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0" /></>,
  "heart": <><Path d="M19.5 13.6C21 12.1 22 10.6 22 8.6A5.1 5.1 0 0 0 16.9 3.5c-1.8 0-3.1.6-4.9 2.4C10.2 4.1 8.9 3.5 7.1 3.5A5.1 5.1 0 0 0 2 8.6c0 2 1 3.5 2.5 5L12 21z" /></>,
  "comment": <><Path d="M20.5 11.6a8.4 8.4 0 0 1-12.3 7.5L3.5 20.5l1.4-4.6A8.5 8.5 0 1 1 20.5 11.6z" /></>,
  "bookmark": <><Path d="M18.5 21 12 17l-6.5 4V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2z" /></>,
  "share": <><Path d="M12 3v12" /><Path d="m7.5 7.5 4.5-4.5 4.5 4.5" /><Path d="M20 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5" /></>,
  "home": <><Path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z" /></>,
  "users": <><Circle cx="9" cy="7" r="4" /><Path d="M2 21v-1.5A5.5 5.5 0 0 1 7.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21" /><Path d="M16.5 3.3a4 4 0 0 1 0 7.4M18.5 14.4A5.5 5.5 0 0 1 22 19.5V21" /></>,
  "play": <><Rect x="2.5" y="4.5" width="19" height="15" rx="4" /><Path d="m10 9 5 3-5 3z" /></>,
  "playf": <><Path d="M7 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.8L8.5 3.9A1 1 0 0 0 7 4.8z" /></>,
  "msg": <><Path d="M20.5 15a2 2 0 0 1-2 2H7.5l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></>,
  "star": <><Path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" /></>,
  "chev": <><Path d="m9 18 6-6-6-6" /></>,
  "back": <><Path d="m15 18-6-6 6-6" /></>,
  "chevd": <><Path d="m6 9 6 6 6-6" /></>,
  "down": <><Path d="m22 17-8.5-8.5-5 5L2 7" /><Path d="M16 17h6v-6" /></>,
  "up": <><Path d="m22 7-8.5 8.5-5-5L2 17" /><Path d="M16 7h6v6" /></>,
  "arrdown": <><Path d="M12 5v14M19 12l-7 7-7-7" /></>,
  "arrup": <><Path d="M12 19V5M5 12l7-7 7 7" /></>,
  "flame": <><Path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>,
  "clock": <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>,
  "eye": <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><Circle cx="12" cy="12" r="3" /></>,
  "eyeoff": <><Path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.2 3.3M6.6 6.6C3.9 8.4 2 12 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6" /><Path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /><Path d="m2 2 20 20" /></>,
  "more": <><Circle cx="5" cy="12" r="1.2" /><Circle cx="12" cy="12" r="1.2" /><Circle cx="19" cy="12" r="1.2" /></>,
  "plus": <><Path d="M12 5v14M5 12h14" /></>,
  "x": <><Path d="M18 6 6 18M6 6l12 12" /></>,
  "check": <><Path d="M20 6 9 17l-5-5" /></>,
  "send": <><Path d="m21.5 2.5-7 19-4-8.5-8-4z" /><Path d="M21.5 2.5 10.5 13" /></>,
  "image": <><Rect x="3" y="3" width="18" height="18" rx="3" /><Circle cx="9" cy="9" r="2" /><Path d="m21 15-4-4L6 21" /></>,
  "pad": <><Path d="M6 11h4M8 9v4" /><Path d="M15 12h.01M18 10h.01" /><Path d="M17.3 5H6.7a4 4 0 0 0-4 3.6C2.6 9.4 2 14.5 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.4-1.4A2 2 0 0 1 9.8 16h4.4a2 2 0 0 1 1.4.6L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.5-.6-6.6-.7-7.3A4 4 0 0 0 17.3 5z" /></>,
  "poll": <><Path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  "help": <><Circle cx="12" cy="12" r="9" /><Path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.8-3 2.8" /><Path d="M12 17h.01" /></>,
  "info": <><Circle cx="12" cy="12" r="9" /><Path d="M12 16v-4.5M12 8h.01" /></>,
  "trophy": <><Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 21.5h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 21.5M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.3" /><Path d="M18 2.5H6V9a6 6 0 0 0 12 0z" /></>,
  "gear": <><Circle cx="12" cy="12" r="3" /><Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5v-.2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  "edit": <><Path d="M12 20h9" /><Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  "pen": <><Path d="M12 3.5H5.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V12" /><Path d="M18.4 2.6a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></>,
  "ext": <><Path d="M15 3h6v6" /><Path d="M10 14 21 3" /><Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  "monitor": <><Rect x="2.5" y="3.5" width="19" height="13" rx="2" /><Path d="M8 20.5h8M12 16.5v4" /></>,
  "reply": <><Path d="m9 17-5-5 5-5" /><Path d="M20 18v-2a4 4 0 0 0-4-4H4" /></>,
  "sliders": <><Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1.5 14h5M9.5 8h5M17.5 16h5" /></>,
  "zap": <><Path d="M13 2 3.5 14H12l-1 8 9.5-12H12z" /></>,
  "video": <><Path d="m22 8-6 4 6 4z" /><Rect x="2" y="6" width="14" height="12" rx="2.5" /></>,
  "mute": <><Path d="M11 5 6 9H2v6h4l5 4z" /><Path d="m22 9-6 6M16 9l6 6" /></>,
  "volume": <><Path d="M11 5 6 9H2v6h4l5 4z" /><Path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
  "tag": <><Path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" /><Circle cx="7.5" cy="7.5" r="1.2" /></>,
  "refresh": <><Path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><Path d="M21 3v5h-5" /></>,
  "mic": <><Rect x="9" y="3" width="6" height="11" rx="3" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  "userplus": <><Path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><Circle cx="8.5" cy="7" r="4" /><Path d="M20 8v6M23 11h-6" /></>,
  "lock": <><Rect x="4" y="11" width="16" height="10" rx="2.5" /><Path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  "mail": <><Rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><Path d="m3 6.5 9 6.5 9-6.5" /></>,
  "camera": <><Path d="M14.5 4h-5L7.5 6.5H4.5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h15a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3z" /><Circle cx="12" cy="13" r="3.5" /></>,
  "globe": <><Circle cx="12" cy="12" r="9.5" /><Path d="M2.5 12h19M12 2.5a14.5 14.5 0 0 1 0 19M12 2.5a14.5 14.5 0 0 0 0 19" /></>,
  "moon": <><Path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" /></>,
  "textsize": <><Path d="M4 7V5h10v2M9 5v14M7 19h4" /><Path d="M14 13v-1.5h7V13M17.5 11.5V19M16 19h3" /></>,
  "logout": <><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Path d="m16 17 5-5-5-5M21 12H9" /></>,
  "sort": <><Path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16" /></>,
  "cpu": <><Rect x="5" y="5" width="14" height="14" rx="2" /><Rect x="9" y="9" width="6" height="6" rx="1" /><Path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
  "hdd": <><Rect x="2.5" y="12" width="19" height="8" rx="2" /><Path d="M5.5 12 8 4.5h8l2.5 7.5" /><Path d="M6.5 16h.01M10 16h.01" /></>,
  "layers": <><Path d="m12 2.5 9.5 5-9.5 5-9.5-5z" /><Path d="m2.5 12 9.5 5 9.5-5" /><Path d="m2.5 16.5 9.5 5 9.5-5" /></>,
  "alert": <><Path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-2.9L13.7 3.9a2 2 0 0 0-3.4 0z" /><Path d="M12 9v4M12 17h.01" /></>,
  "wifioff": <><Path d="m2 2 20 20" /><Path d="M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M19 12.9a10 10 0 0 0-2.2-1.7M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01" /></>,
  "link": <><Path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><Path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  "pin": <><Path d="M12 17v5" /><Path d="M9 10.8V4h6v6.8l3 3.2v1H6v-1z" /></>,
  "book": <><Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" /><Path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></>,
  "pause": <><Rect x="6" y="5" width="4" height="14" rx="1" /><Rect x="14" y="5" width="4" height="14" rx="1" /></>,
  "max": <><Path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></>,
  "cc": <><Rect x="2.5" y="5" width="19" height="14" rx="3" /><Path d="M10.5 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" /></>,
  "checkc": <><Circle cx="12" cy="12" r="9.5" /><Path d="m8 12 3 3 5-6" /></>,
  "news": <><Path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" /><Path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" /></>,
  "hash": <><Path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></>,
  "bag": <><Path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><Path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>,
  "calendar": <><Rect x="3" y="4.5" width="18" height="17" rx="2.5" /><Path d="M16 2.5v4M8 2.5v4M3 10h18" /></>,
  "spark": <><Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
  "grid": <><Rect x="3" y="3" width="7" height="7" rx="1.5" /><Rect x="14" y="3" width="7" height="7" rx="1.5" /><Rect x="3" y="14" width="7" height="7" rx="1.5" /><Rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  "shield": <><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><Path d="m9 12 2 2 4-4" /></>,
  "phone": <><Path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></>,
} as const;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export type IconProps = {
  name: IconName;
  /** Kenar uzunluğu (pt). Tasarımdaki varsayılan 20–24. */
  size?: number;
  color?: string;
  /** Tasarımda çoğunlukla 2; küçük ikonlarda 2.2–2.6, sekme çubuğunda 1.9. */
  strokeWidth?: number;
  /** Dolgulu kullanım: kalp (seçili), yıldız, playf. */
  fill?: string;
};

export function Icon({ name, size = 24, color = colors.text, strokeWidth = 2, fill = 'none' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {ICONS[name]}
    </Svg>
  );
}

/** Seçili sekme ikonları: dolgulu, iç kesikler zemin rengiyle (cutout) çizilir. */
const TAB_FILLED = {
  "home": (color: string, cutout: string) => <><Path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" fill={color} stroke={color} /><Rect x="9.9" y="14" width="4.2" height="6.4" rx="1" fill={cutout} /></>,
  "users": (color: string, cutout: string) => <><Circle cx="9" cy="7" r="4" fill={color} stroke={color} /><Path d="M2 21v-1.5A5.5 5.5 0 0 1 7.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21z" fill={color} stroke={color} /><Path d="M16.5 3.3a4 4 0 0 1 0 7.4M18.5 14.4A5.5 5.5 0 0 1 22 19.5V21" stroke={color} /></>,
  "play": (color: string, cutout: string) => <><Rect x="2.5" y="4.5" width="19" height="15" rx="4" fill={color} stroke={color} /><Path d="m10 9 5 3-5 3z" fill={cutout} stroke={cutout} strokeWidth="1.2" strokeLinejoin="round" /></>,
  "msg": (color: string, cutout: string) => <><Path d="M20.5 15a2 2 0 0 1-2 2H7.5l-4 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" fill={color} stroke={color} /></>,
} as const;

export type TabIconName = keyof typeof TAB_FILLED;

export function TabIcon({ name, active, color, size = 24, cutout = colors.bg2 }: {
  name: TabIconName; active: boolean; color: string; size?: number; cutout?: string;
}) {
  if (!active) return <Icon name={name} size={size} color={color} strokeWidth={1.9} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {TAB_FILLED[name](color, cutout)}
    </Svg>
  );
}
