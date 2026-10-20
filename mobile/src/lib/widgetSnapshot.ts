// ウィジェット・ロック画面・コントロールセンターに渡す内容（App Group の UserDefaults に JSON で置く）
// ウィジェットは記録（entries）を SQLite から直接読み、繰り返しの決まりから、その日に出すかを自分で決める
// （targets/widget/Schedule.swift。stats.ts の isScheduledOn と同じ考え方）。習慣の一覧と表示の言葉はここから読む
// このファイルは React Native に依存させない（単体テストのため）

import type { Day, WeekStart } from './day';
import { effectiveHabitColor, FREE_HABIT_COLOR, habitColor, type Habit, type HabitRule, type Schedule } from './habit';
import { effectiveIcon, parseIcon } from './icons';
import { sfSymbolFor } from './sfSymbols';

export const SNAPSHOT_KEY = 'widgetSnapshot';
// 3：習慣ごとに判定の決まりの履歴（rules）を足した
export const SNAPSHOT_VERSION = 3;

export type WidgetStrings = {
  today: string;
  empty: string;
  allDone: string;
  proLarge: string;
  widgetName: string;
  widgetDescription: string;
  lockName: string;
  lockDescription: string;
  controlName: string;
  controlDescription: string;
  chooseHabit: string;
  heatmapName: string;
  heatmapDescription: string;
};

export type WidgetHabit = {
  id: string;
  name: string;
  /** SF Symbols の名前。絵文字のときは emoji、自分の画像のときは image（App Group の icons/ のファイル名）に入る */
  symbol: string;
  emoji: string | null;
  image: string | null;
  color: { light: string; dark: string };
  kind: Habit['kind'];
  target: number;
  step: number;
  unit: string;
  /** 繰り返し（Pro をやめても、すでに使っている繰り返しはそのまま） */
  schedule: Schedule;
  limitPeriod: Habit['limitPeriod'];
  startDay: Day;
  endDay: Day | null;
  /** 目標や頻度を変える前の判定の決まり（古い順）。ウィジェットも、過去の日はそのとき使っていた決まりで見せる */
  rules: HabitRule[];
};

export type WidgetSnapshot = {
  version: number;
  generatedAt: string;
  dayStartHour: number;
  /** 0 = 日曜、1 = 月曜 */
  weekStart: WeekStart;
  isPro: boolean;
  accent: { light: string; dark: string; lightText: string; darkText: string };
  strings: WidgetStrings;
  habits: WidgetHabit[];
};

export function buildSnapshot(input: {
  habits: Habit[];
  weekStart: WeekStart;
  dayStartHour: number;
  isPro: boolean;
  accent: WidgetSnapshot['accent'];
  strings: WidgetStrings;
  now: Date;
}): WidgetSnapshot {
  const { isPro } = input;
  const list = input.habits;
  return {
    version: SNAPSHOT_VERSION,
    generatedAt: input.now.toISOString(),
    dayStartHour: input.dayStartHour,
    weekStart: input.weekStart,
    isPro,
    accent: input.accent,
    strings: input.strings,
    habits: list.map((h) => {
      const icon = parseIcon(effectiveIcon(h.icon, isPro));
      const color = effectiveHabitColor(h.color, isPro);
      return {
        id: h.id,
        name: h.name,
        symbol: icon.type === 'ion' ? sfSymbolFor(icon.name) : 'circle.fill',
        emoji: icon.type === 'emoji' ? icon.text : null,
        image: icon.type === 'image' ? icon.file : null,
        color: color === FREE_HABIT_COLOR ? { light: input.accent.light, dark: input.accent.dark } : { light: habitColor(color, false), dark: habitColor(color, true) },
        kind: h.kind,
        target: h.target,
        step: h.step,
        unit: h.unit,
        schedule: h.schedule,
        limitPeriod: h.limitPeriod,
        startDay: h.startDay,
        endDay: h.endDay,
        rules: h.rules,
      };
    }),
  };
}
