import { useCallback } from 'react';

import type { Day } from '@/lib/day';
import type { Entry, Habit } from '@/lib/habit';
import { allEntries, entriesOf, getHabit, listHabits } from '@/lib/habits';
import { useWeekStart } from '@/lib/settings';
import { computeStreaks, todayStateOf, type Streaks, type TodayState } from '@/lib/stats';

import { useData } from './useData';

export type HabitView = {
  habit: Habit;
  entries: ReadonlyMap<Day, Entry>;
  streaks: Streaks;
  state: TodayState;
};

// Pro をやめても、すでに使っているカスタム繰り返しと期間限定はそのまま動かす（過去の判定も、これからの予定も変えない）。
// Pro が要るのは、新しく使うときと変えるときだけ（components/HabitForm.tsx）

/** 並びは手動の順（並べ替え） */
export function useHabitViews(today: Day): HabitView[] {
  const weekStart = useWeekStart();
  const read = useCallback(() => {
    const map = allEntries();
    const list = listHabits();
    return list.map((habit) => {
      const entries = map.get(habit.id) ?? new Map<Day, Entry>();
      return {
        habit,
        entries,
        streaks: computeStreaks(habit, entries, today, weekStart),
        state: todayStateOf(habit, entries, today, weekStart),
      };
    });
  }, [today, weekStart]);
  return useData(read);
}

export function useHabitView(id: string, today: Day): HabitView | null {
  const weekStart = useWeekStart();
  const read = useCallback(() => {
    const habit = getHabit(id);
    if (!habit) return null;
    const entries = new Map(entriesOf(id).map((e) => [e.day, e]));
    return {
      habit,
      entries,
      streaks: computeStreaks(habit, entries, today, weekStart),
      state: todayStateOf(habit, entries, today, weekStart),
    };
  }, [id, today, weekStart]);
  return useData(read);
}
