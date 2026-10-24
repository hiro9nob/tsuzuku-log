import { useColorScheme } from 'react-native';

import { effectiveHabitColor, FREE_HABIT_COLOR, habitColor, type HabitColorId } from '@/lib/habit';
import { useIsPro } from '@/lib/pro';
import { useSettings } from '@/lib/settings';
import { resolveTheme, type Palette } from '@/lib/themeColors';

export type Theme = Palette & { isDark: boolean; habit: (id: HabitColorId) => string };

// ライト／ダークの切り替えは _layout.tsx で Appearance.setColorScheme を呼ぶので、useColorScheme がそれに従う
// 画面では色を直接書かず、ここから取る
export function useTheme(): Theme {
  const isDark = useColorScheme() === 'dark';
  const isPro = useIsPro();
  const def = resolveTheme(
    useSettings((s) => s.theme),
    isPro,
  );
  const palette = isDark ? def.dark : def.light;
  // 習慣の色は Pro。Pro でないとき（と「テーマの色」を選んだとき）は、テーマのアクセントの色で表示する
  return {
    ...palette,
    isDark,
    habit: (id) => {
      const c = effectiveHabitColor(id, isPro);
      return c === FREE_HABIT_COLOR ? palette.accent : habitColor(c, isDark);
    },
  };
}

export const spacing = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
export const radius = { s: 10, m: 16, l: 24, full: 999 } as const;
