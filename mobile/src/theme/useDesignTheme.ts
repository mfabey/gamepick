import { useTheme } from '../context/ThemeContext';
import { designPalettes, lightTabBar } from './palettes';
import { tabBar } from './tokens';

export function useDesignTheme() {
  const { isDark } = useTheme();
  return {
    colors: isDark ? designPalettes.dark : designPalettes.light,
    tabBar: isDark ? tabBar : lightTabBar,
    isDark,
  };
}
