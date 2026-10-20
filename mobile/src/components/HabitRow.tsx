import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { HabitView } from '@/hooks/useHabits';
import { addDays, type Day, type WeekStart } from '@/lib/day';
import { formatValue } from '@/lib/format';
import { useSettings, type TodayHistoryRange } from '@/lib/settings';
import { dayStatus, doneInCurrentPeriod, periodTotal } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

import { DayDots } from './DayDots';
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
  onLongPress?: () => void;
};

export function useStreakLabel() {
  const { t } = useTranslation();
  return (count: number, unit: 'day' | 'week' | 'month') => t(`streak.${unit}`, { count });
}

export function HabitRow({ view, today, weekStart, onTap, onOpen, onLongPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const streakLabel = useStreakLabel();
  const { habit, entries, streaks, state } = view;
  const entry = entries.get(today);
  const value = entry?.status === 'done' ? entry.value : 0;
  const range = useSettings((s) => s.todayHistory);
  const statusOf = useCallback((day: Day) => dayStatus(habit, entries, day, today, weekStart), [habit, entries, today, weekStart]);
  const statuses = range === 'week' ? Array.from({ length: 7 }, (_, i) => statusOf(addDays(today, i - 6))) : [];
  const isLimit = habit.kind === 'limit';
  const total = isLimit ? periodTotal(habit, entries, today, weekStart) : 0;
  const over = isLimit && total > habit.target;

  let detail: string | null = null;
  if (habit.kind === 'count') detail = `${formatValue(habit, value)} / ${formatValue(habit, habit.target)}`;
  else if (isLimit) detail = t(`limit.${habit.limitPeriod}`, { value: formatValue(habit, total), max: formatValue(habit, habit.target) });
  else if (habit.schedule.type === 'perWeek' || habit.schedule.type === 'perMonth') {
    detail = t(`period.${habit.schedule.type}`, { done: doneInCurrentPeriod(habit, entries, today, weekStart), times: habit.schedule.times });
  }

  const streakText = streaks.current > 0 ? streakLabel(streaks.current, streaks.unit) : null;
  const done = state === 'done';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.top}>
        <Pressable
          onPress={onOpen}
          onLongPress={onLongPress}
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
            {range === 'week' ? <DayDots statuses={statuses} color={theme.habit(habit.color)} size={10} /> : null}
          </View>
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
        />
      </View>
      {range !== 'week' ? (
        <Pressable onPress={onOpen} onLongPress={onLongPress} accessible={false}>
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
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  texts: { flex: 1, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
});
