// Android のウィジェットで使うデータ。ウィジェットの処理は、アプリを開いていないときにも動くので、
// DB の作り替え（マイグレーション）、設定、言語の準備をここで行う
import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import { db } from '@/db/client';
import { dayOf, type Day, type WeekStart } from '@/lib/day';
import { isDone, type Entry, type Habit } from '@/lib/habit';
import { addToEntry, allEntries, getEntry, getHabit, listHabits, setEntry } from '@/lib/habits';
import { initI18n } from '@/lib/i18n';
import { rescheduleNotifications } from '@/lib/notifications';
import { CACHED_PRO_KEY } from '@/lib/pro';
import { resolveWeekStart, useSettings } from '@/lib/settings';
import { dayStatus, todayStateOf, type DayStatus, type TodayState } from '@/lib/stats';
import { resolveTheme, type Palette } from '@/lib/themeColors';

import migrations from '../../../drizzle/migrations';

let preparing: Promise<void> | null = null;

export function prepare(): Promise<void> {
  preparing ??= (async () => {
    await migrate(db, migrations);
    await useSettings.getState().hydrate();
    await initI18n(useSettings.getState().language);
  })();
  return preparing;
}

export type WidgetHabit = { habit: Habit; entries: ReadonlyMap<Day, Entry>; state: TodayState };

export type WidgetData = {
  today: Day;
  weekStart: WeekStart;
  isPro: boolean;
  light: Palette;
  dark: Palette;
  habits: WidgetHabit[];
};

/** Pro かどうか。ウィジェットの処理では課金の SDK を動かさないので、アプリが最後に確かめた結果を使う */
async function cachedIsPro(): Promise<boolean> {
  return (await AsyncStorage.getItem(CACHED_PRO_KEY).catch(() => null)) === '1';
}

export async function loadWidgetData(): Promise<WidgetData> {
  await prepare();
  const settings = useSettings.getState();
  const isPro = await cachedIsPro();
  const theme = resolveTheme(settings.theme, isPro);
  const today = dayOf(new Date(), settings.dayStartHour);
  const weekStart = resolveWeekStart(settings.weekStart);
  const map = allEntries();
  const habits = listHabits().map((habit) => {
    const entries = map.get(habit.id) ?? new Map<Day, Entry>();
    return { habit, entries, state: todayStateOf(habit, entries, today, weekStart) };
  });
  return { today, weekStart, isPro, light: theme.light, dark: theme.dark, habits };
}

/** その習慣の、きょうまでの日ごとの状態（マス目） */
export function statusesOf(h: WidgetHabit, data: WidgetData, days: Day[]): DayStatus[] {
  return days.map((d) => dayStatus(h.habit, h.entries, d, data.today, data.weekStart));
}

/** ウィジェットの丸を押したとき：「できた」はできた ↔ 記録なし、数値・上限は1回分を足す（きょうの画面と同じ） */
export async function recordFromWidget(habitId: string): Promise<void> {
  await prepare();
  const habit = getHabit(habitId);
  if (!habit || habit.archivedDay) return;
  const today = dayOf(new Date(), useSettings.getState().dayStartHour);
  if (habit.kind === 'check') {
    const done = isDone(habit, getEntry(habitId, today) ?? undefined);
    setEntry(habitId, today, done ? null : { status: 'done', value: 1 });
  } else {
    addToEntry(habitId, today, habit.step);
  }
  await rescheduleNotifications();
}
