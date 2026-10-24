'use no memo';
// react-native-android-widget は、ふつうの関数として部品を呼ぶので、React Compiler の書き換えを止める

// Android のウィジェットの部品（react-native-android-widget）
import { FlexWidget, IconWidget, TextWidget } from 'react-native-android-widget';

import { formatAmount, habitColor, effectiveHabitColor, FREE_HABIT_COLOR, type Habit } from '@/lib/habit';
import { currentLocale } from '@/lib/i18n';
import { effectiveIcon, FALLBACK_ICON, parseIcon } from '@/lib/icons';
import type { Palette } from '@/lib/themeColors';

import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

type HexColor = `#${string}`;

/** Ionicons のフォント（app.config.ts で assets/fonts/Ionicons.ttf を入れている） */
export const ICON_FONT = 'Ionicons';

export function glyph(name: string): string {
  const code = (glyphs as Record<string, number>)[name] ?? (glyphs as Record<string, number>)[FALLBACK_ICON];
  return String.fromCodePoint(code);
}

export function hex(c: string): HexColor {
  return c as HexColor;
}

export function colorOf(habit: Habit, palette: Palette, isPro: boolean, dark: boolean): string {
  const c = effectiveHabitColor(habit.color, isPro);
  return c === FREE_HABIT_COLOR ? palette.accent : habitColor(c, dark);
}

/** 習慣のアイコン（自分の画像は、ウィジェットでは基本のアイコンにする） */
export function HabitGlyph({ habit, color, size, isPro }: { habit: Habit; color: string; size: number; isPro: boolean }) {
  const v = parseIcon(effectiveIcon(habit.icon, isPro));
  if (v.type === 'emoji') return <TextWidget text={v.text} style={{ fontSize: size * 0.9 }} />;
  return <IconWidget icon={glyph(v.type === 'ion' ? v.name : FALLBACK_ICON)} font={ICON_FONT} size={size} style={{ color: hex(color) }} />;
}

/** 大きな丸と同じ。押すと記録する */
export function RecordCircle({
  habit,
  color,
  palette,
  done,
  over,
  size,
}: {
  habit: Habit;
  color: string;
  palette: Palette;
  done: boolean;
  over: boolean;
  size: number;
}) {
  const filled = done && !over;
  const border = over ? palette.textSecondary : color;
  return (
    <FlexWidget
      clickAction="record"
      clickActionData={{ habitId: habit.id }}
      accessibilityLabel={habit.name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: hex(border),
        backgroundColor: hex(filled ? color : palette.surface),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {/* チェック印は「できた」型だけ（押すと取り消す）。数値型は目標に届いても押すと足すので「+250」のまま（アプリと同じ） */}
      {filled && habit.kind === 'check' ? (
        <IconWidget icon={glyph('checkmark')} font={ICON_FONT} size={size * 0.5} style={{ color: hex(palette.accentText) }} />
      ) : habit.kind === 'check' ? (
        <TextWidget text=" " style={{ fontSize: 4 }} />
      ) : (
        <TextWidget
          text={`+${formatAmount(habit.step, currentLocale())}`}
          style={{ fontSize: size * 0.26, fontWeight: 'bold', color: hex(filled ? palette.accentText : border) }}
          maxLines={1}
        />
      )}
    </FlexWidget>
  );
}
