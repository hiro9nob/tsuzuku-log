import { useTranslation } from 'react-i18next';

import { formatDay, formatValue, weekdayName } from './format';
import type { Habit } from './habit';
import { orderedWeekdays } from './day';
import { useWeekStart } from './settings';

/** 頻度の説明（「毎日」「月・水・金」「週に3回」など） */
export function useScheduleLabel() {
  const { t } = useTranslation();
  const weekStart = useWeekStart();
  return (habit: Pick<Habit, 'kind' | 'schedule' | 'target' | 'unit' | 'limitPeriod' | 'endDay'>): string => {
    if (habit.kind === 'limit') {
      const limit = t(`limitSummary.${habit.limitPeriod}`, { max: formatValue(habit, habit.target) });
      return habit.endDay ? `${limit} · ${t('schedule.until', { date: formatDay(habit.endDay, { month: 'short', day: 'numeric' }) })}` : limit;
    }
    const s = habit.schedule;
    let base: string;
    switch (s.type) {
      case 'daily':
        base = t('schedule.daily');
        break;
      case 'weekdays':
        base = orderedWeekdays(weekStart)
          .filter((d) => s.days.includes(d))
          .map((d) => weekdayName(d))
          .join(t('schedule.separator'));
        break;
      case 'perWeek':
        base = t('schedule.timesPerWeek', { count: s.times });
        break;
      case 'interval':
        base = t('schedule.everyNDays', { count: s.every });
        break;
      case 'perMonth':
        base = t('schedule.timesPerMonth', { count: s.times });
        break;
      case 'monthlyWeekday':
        base = t('schedule.monthlyWeekdayLabel', {
          weeks: s.weeks.map((w) => (w === -1 ? t('schedule.lastWeek') : t('schedule.nthWeek', { n: w }))).join(t('schedule.separator')),
          days: orderedWeekdays(weekStart)
            .filter((d) => s.days.includes(d))
            .map((d) => weekdayName(d))
            .join(t('schedule.separator')),
        });
        break;
      case 'afterDone':
        base = t('schedule.afterDoneDays', { count: s.days });
        break;
    }
    const parts = [base];
    if (habit.kind === 'count') parts.push(t('schedule.goal', { value: formatValue(habit, habit.target) }));
    if (habit.endDay) parts.push(t('schedule.until', { date: formatDay(habit.endDay, { month: 'short', day: 'numeric' }) }));
    return parts.join(' · ');
  };
}
