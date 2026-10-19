import { dayToUtcDate, type Day } from './day';
import { formatAmount, type Habit } from './habit';
import { currentLocale } from './i18n';

export function formatDay(day: Day, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', weekday: 'short' }): string {
  return new Intl.DateTimeFormat(currentLocale(), { ...options, timeZone: 'UTC' }).format(dayToUtcDate(day));
}

export function formatMonth(day: Day): string {
  return new Intl.DateTimeFormat(currentLocale(), { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(dayToUtcDate(day));
}

/** 曜日の短い名前（0 = 日曜） */
export function weekdayName(weekday: number, width: 'narrow' | 'short' = 'short'): string {
  // 2026-10-04 は日曜
  const d = new Date(Date.UTC(2026, 9, 4 + weekday, 12));
  return new Intl.DateTimeFormat(currentLocale(), { weekday: width, timeZone: 'UTC' }).format(d);
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return '–';
  return new Intl.NumberFormat(currentLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(rate);
}

export function formatValue(habit: Pick<Habit, 'unit'>, value: number): string {
  const n = formatAmount(value, currentLocale());
  return habit.unit ? `${n} ${habit.unit}` : n;
}

export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(2026, 0, 1, h, m);
  return new Intl.DateTimeFormat(currentLocale(), { hour: 'numeric', minute: '2-digit' }).format(d);
}
