// ─────────────────────────────────────────────────────────────────────────────
// TEMA BAĞLAMI — çalışma anında tema değişimi.
//
// ── NEDEN GEREKTİ (ölçüldü) ──
//
// `theme.js` paleti MODÜL YÜKLENİRKEN seçiyor, çünkü `StyleSheet.create`
// değerleri o an yakalıyor. Elle tema seçimi için tercih eşzamanlı okunmalı
// ama AsyncStorage async. Üç yol denendi:
//
//   • Appearance.setColorScheme('light') → getColorScheme() HEMEN ARDINDAN
//     hâlâ 'dark' döndü. JS tarafında geçerli olmuyor.
//   • Updates.reloadAsync() → geliştirme derlemesinde HATA veriyor
//     ("You cannot use the Updates module in development mode"). Yani
//     doğrulanamıyor. Ayrıca tercih okunamadığı için yeniden yükleme
//     sonrası theme.js gene sistemi okur → sonsuz döngü riski.
//   • Eşzamanlı depo (mmkv) → yeni yerel bağımlılık, yeni binary.
//
// Kalan yol: paleti REAKTİF yapmak. Stil blokları `useStyles(makeStyles)`
// ile tema değişince yeniden üretiliyor.
//
// ── GEÇİŞ STRATEJİSİ ──
//
// `theme.js`'in `colors` dışa aktarımı DURUYOR ve açılış paletini veriyor.
// Henüz dönüştürülmemiş dosyalar çalışmaya devam ediyor — yalnız canlı tema
// değişiminde eski palette kalıyorlar. 54 dosya tek kodmodla çevrilmedi:
// bu oturumda kodmodlar üç kez sessizce hata yaptı ve en büyüğü bu olurdu.
// Dönüşüm doğrulanmış partiler hâlinde ilerliyor.
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { palette } from '../design/tokens';

const PREF_KEY = 'theme_pref';          // 'system' | 'dark' | 'light'
const ThemeContext = createContext(null);

function sistemSemasi() {
  return Appearance.getColorScheme() === 'light' ? 'light' : 'dark';
}

/** Handoff adlarını koddaki eski adlara çeviren tek yer (theme.js ile AYNI eşleme). */
function paletten(t) {
  return {
    bg: t.bg, bgElevated: t.surface, card: t.surface2,
    bgInput: t.surface3, bgHover: t.surface3,
    cardBorder: t.border, borderHover: t.borderStrong,
    text: t.text1, text2: t.text2, text3: t.text3,
    accent: t.brand, accentText: t.brandText,
    accentBg: t.brandWash, accentSoft: t.brandWash,
    accentBorder: t.brandWashBorder, accentPill: t.brandWash,
    onAccent: t.onBrand, surfaceTile: t.surface4,
    glassFill: t.glassFill, glassBorder: t.glassBorder,
    barSolid: t.glassFallback,
    overlay: t.overlayScrimTop,
    overlayStrong: t.overlayScrimBottom ?? t.overlayScrimTop,
  };
}

// Handoff kapsamı dışı — durum ve mağaza renkleri. theme.js'teki değerlerle aynı.
const EK = {
  dark:  { green: '#00d26e', steam: '#1a9fff', xbox: '#4ade80', danger: '#ef4949', accentGlow: 'rgba(232,36,43,0.42)' },
  light: { green: '#00794a', steam: '#0b74c4', xbox: '#107c10', danger: '#c62828', accentGlow: 'rgba(232,36,43,0.28)' },
};

const PALETLER = {
  dark:  { ...paletten(palette.dark),  ...EK.dark },
  light: { ...paletten(palette.light), ...EK.light },
};

export function ThemeProvider({ children }) {
  const [pref, setPrefState] = useState('system');
  const [sistem, setSistem] = useState(sistemSemasi);

  // Tercih AÇILIŞTA okunuyor ama palet ONA GÖRE BAŞLAMIYOR: theme.js zaten
  // sistem temasıyla başladı. Tercih gelene kadarki birkaç kare sistem
  // temasında geçiyor — yeniden yükleme yapmamanın bedeli bu, ve kabul
  // edilebilir: alternatifi doğrulanamayan bir reloadAsync zinciriydi.
  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => { if (v === 'dark' || v === 'light' || v === 'system') setPrefState(v); })
      .catch(() => {});
  }, []);

  // Sistem teması değişimini DİNLİYORUZ — tercih 'system' ise anında yansısın.
  // themeWatch.js'in yaptığı işin reloadAsync'siz hâli.
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSistem(colorScheme === 'light' ? 'light' : 'dark');
    });
    return () => sub.remove();
  }, []);

  const setPref = useCallback((next) => {
    setPrefState(next);
    AsyncStorage.setItem(PREF_KEY, next).catch(() => {});
  }, []);

  const scheme = pref === 'system' ? sistem : pref;

  const value = useMemo(() => ({
    scheme,
    pref,
    setPref,
    colors: PALETLER[scheme],
    isDark: scheme === 'dark',
  }), [scheme, pref, setPref]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Tema değişince stilleri yeniden üretir.
 *
 *   const makeStyles = (colors) => StyleSheet.create({ … });
 *   function Foo() { const styles = useStyles(makeStyles); … }
 *
 * `makeStyles` MODÜL DÜZEYİNDE tanımlanmalı — bileşenin içinde tanımlanırsa
 * her render'da yeni bir fonksiyon olur, useMemo hiç tutmaz ve StyleSheet
 * her çizimde yeniden kurulur.
 */
// ─────────────────────────────────────────────────────────────────────────────
// ÖNBELLEK ÖRNEK BAŞINA DEĞİL, MODÜL DÜZEYİNDE.
//
// Öncesi düz `useMemo(() => makeStyles(colors), …)` idi ve memo ÖRNEK
// başınaydı. Tek bir ekranda sorun değil; ama 50 satırlık bir listede satır
// bileşenini dönüştürünce makeStyles 50 kez çalışır ve 50 ayrı stil nesnesi
// ayrılır. Kalan 50 dosyayı dönüştürmenin ön koşulu bu: aynı makeStyles +
// aynı palet = TEK nesne, kaç bileşen isterse istesin.
//
// WeakMap: anahtar makeStyles fonksiyonunun kendisi, yani modül boşaltılırsa
// girdi de gidiyor. İç Map palete göre ayırıyor (koyu/açık iki girdi).
// ─────────────────────────────────────────────────────────────────────────────
const stilOnbellek = new WeakMap();

function stilAl(makeStyles, colors) {
  let paletMap = stilOnbellek.get(makeStyles);
  if (!paletMap) { paletMap = new Map(); stilOnbellek.set(makeStyles, paletMap); }
  let stiller = paletMap.get(colors);
  if (!stiller) { stiller = makeStyles(colors); paletMap.set(colors, stiller); }
  return stiller;
}

export function useStyles(makeStyles) {
  const { colors } = useTheme();
  return useMemo(() => stilAl(makeStyles, colors), [makeStyles, colors]);
}
