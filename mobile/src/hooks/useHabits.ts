import { useCallback } from 'react';

import type { Day } from '@/lib/day';
import { effectiveSchedule, type Entry, type Habit } from '@/lib/habit';
import { allEntries, entriesOf, getHabit, listHabits } from '@/lib/habits';
import { useIsPro } from '@/lib/pro';
import { useWeekStart } from '@/lib/settings';
import { computeStreaks, todayStateOf, type Streaks, type TodayState } from '@/lib/stats';

import { useData } from './useData';

export type HabitView = {
  habit: Habit;
  entries: ReadonlyMap<Day, Entry>;
  streaks: Streaks;
  state: TodayState;
};

/** Pro でないときは、Pro の繰り返しを無料の繰り返しに置き換えて扱う（設定は残す） */
export function useEffectiveHabit() {
  const isPro = useIsPro();
  return useCallback((h: Habit): Habit => ({ ...h, schedule: effectiveSchedule(h.schedule, isPro), endDay: isPro ? h.endDay : null }), [isPro]);
}

/** 並びは手動の順（並べ替え） */
export function useHabitViews(today: Day): HabitView[] {
  const weekStart = useWeekStart();
  const effective = useEffectiveHabit();
  const read = useCallback(() => {
    const map = allEntries();
    const list = listHabits().map(effective);
    return list.map((habit) => {
      const entries = map.get(habit.id) ?? new Map<Day, Entry>();
      return {
        habit,
        entries,
        streaks: computeStreaks(habit, entries, today, weekStart),
        state: todayStateOf(habit, entries, today, weekStart),
      };
    });
  }, [today, weekStart, effective]);
  return useData(read);
}

export function useHabitView(id: string, today: Day): HabitView | null {
  const weekStart = useWeekStart();
  const effective = useEffectiveHabit();
  const read = useCallback(() => {
    const raw = getHabit(id);
    if (!raw) return null;
    const habit = effective(raw);
    const entries = new Map(entriesOf(id).map((e) => [e.day, e]));
    return {
      habit,
      entries,
      streaks: computeStreaks(habit, entries, today, weekStart),
      state: todayStateOf(habit, entries, today, weekStart),
    };
  }, [id, today, weekStart, effective]);
  return useData(read);
}
