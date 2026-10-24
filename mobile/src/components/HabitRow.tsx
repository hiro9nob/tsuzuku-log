import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HabitView } from '@/hooks/useHabits';
import { addDays, type Day, type WeekStart } from '@/lib/day';
import { formatValue } from '@/lib/format';
import { useSettings, type TodayHistoryRange } from '@/lib/settings';
import { dayStatus, periodProgress, periodTotal } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

import { DayDotButtons } from './DayDots';
import { HabitIcon } from './HabitIcon';
import { MiniHeatmap } from './MiniHeatmap';
import { RecordButton } from './RecordButton';

/** グラフで見せる期間の週の数（1週間は点で見せる） */
const HISTORY_WEEKS: Record<Exclude<TodayHistoryRange, 'week'>, number> = { '3m': 13, '6m': 26, '1y': 53 };

type Props = {
  view: HabitView;
  today: Day;
  weekStart: WeekStart;
  onTap: () => void;
  onOpen: () => void;
  /** お休み・記録を直す・ひとことなどのメニュー（行の「…」と長押し） */
  onMenu: () => void;
  /** 記録の丸の長押し（数値・上限型：減らす、量を入れる） */
  onLongPressRecord: () => void;
  /** 直近の点を押したとき（その日の記録を直す） */
  onPressDay: (day: Day) => void;
};

export function useStreakLabel() {
  const { t } = useTranslation();
  return (count: number, unit: 'day' | 'week' | 'month') => t(`streak.${unit}`, { count });
}

export function HabitRow({ view, today, weekStart, onTap, onOpen, onMenu, onLongPressRecord, onPressDay }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const streakLabel = useStreakLabel();
  const { habit, entries, streaks, state } = view;
  const entry = entries.get(today);
  const value = entry?.status === 'done' ? entry.value : 0;
  const range = useSettings((s) => s.todayHistory);
  const statusOf = useCallback((day: Day) => dayStatus(habit, entries, day, today, weekStart), [habit, entries, today, weekStart]);
  const days = range === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)) : [];
  const statuses = days.map(statusOf);
  const isLimit = habit.kind === 'limit';
  const total = isLimit ? periodTotal(habit, entries, today, weekStart) : 0;
  const over = isLimit && total > habit.target;

  let detail: string | null = null;
  if (habit.kind === 'count') detail = `${formatValue(habit, value)} / ${formatValue(habit, habit.target)}`;
  else if (isLimit) detail = t(`limit.${habit.limitPeriod}`, { value: formatValue(habit, total), max: formatValue(habit, habit.target) });
  else if (habit.schedule.type === 'perWeek' || habit.schedule.type === 'perMonth') {
    // お休みの日は必要な回数から引く。引いたときは、そのことも見せる（「今週 2 / 2（お休み 1日）」）
    const p = periodProgress(habit, entries, today, weekStart);
    if (p) {
      detail =
        p.rest > 0
          ? t(`period.${habit.schedule.type}Rest`, { done: p.done, times: p.needed, rest: p.rest })
          : t(`period.${habit.schedule.type}`, { done: p.done, times: p.times });
    }
  }

  const streakText = streaks.current > 0 ? streakLabel(streaks.current, streaks.unit) : null;
  const done = state === 'done';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.top}>
        <Pressable
          onPress={onOpen}
          onLongPress={onMenu}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={[habit.name, state === 'rest' ? t('today.resting') : null, streakText, detail].filter(Boolean).join(', ')}
          accessibilityHint={t('today.openHint')}>
          <HabitIcon icon={habit.icon} color={habit.color} />
          <View style={styles.texts}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
                {habit.name}
              </Text>
            </View>
            {detail || streakText || state === 'rest' ? (
              // 上限型は「今週 0 杯 / 3 杯 · 17週連続」のように長く、英語などでは1行に入らないので2行まで
              <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={2}>
                {[state === 'rest' ? t('today.resting') : null, detail, streakText].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
            {range === 'week' ? (
              <DayDotButtons days={days} statuses={statuses} color={theme.habit(habit.color)} size={10} onPress={onPressDay} />
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={onMenu}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('today.menu', { name: habit.name })}
          style={({ pressed }) => [styles.menu, { opacity: pressed ? 0.5 : 1 }]}>
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
        </Pressable>
        <RecordButton
          habit={habit}
          value={value}
          done={done}
          over={over}
          rest={state === 'rest'}
          label={
            state === 'rest'
              ? `${t('today.resting')}, ${habit.kind === 'check' ? t('today.recordLabel', { name: habit.name }) : t('today.addLabel', { name: habit.name, step: formatValue(habit, habit.step) })}`
              : habit.kind === 'check'
              ? done
                ? t('today.undoLabel', { name: habit.name })
                : t('today.recordLabel', { name: habit.name })
              : t('today.addLabel', { name: habit.name, step: formatValue(habit, habit.step) })
          }
          onPress={onTap}
          onLongPress={onLongPressRecord}
        />
      </View>
      {range !== 'week' ? (
        <Pressable onPress={onOpen} onLongPress={onMenu} accessible={false}>
          <MiniHeatmap
            weeks={HISTORY_WEEKS[range]}
            statusOf={statusOf}
            today={today}
            weekStart={weekStart}
            startDay={habit.startDay}
            color={theme.habit(habit.color)}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.m,
    borderRadius: radius.l,
    paddingVertical: spacing.m,
    paddingLeft: spacing.m,
    paddingRight: spacing.m,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  texts: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  menu: { width: 32, height: 44, alignItems: 'center', justifyContent: 'center' },
});
