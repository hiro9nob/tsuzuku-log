import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, addMonths, monthEndOf, monthStartOf, orderedWeekdays, parseDay, weekStartOf, type Day, type WeekStart } from '@/lib/day';
import { formatDay, formatMonth, weekdayName } from '@/lib/format';
import type { DayStatus } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

import { Dot } from './DayDots';

type Props = {
  month: Day;
  onMonthChange: (month: Day) => void;
  today: Day;
  weekStart: WeekStart;
  color: string;
  statusOf: (day: Day) => DayStatus;
  hasNote: (day: Day) => boolean;
  onPressDay: (day: Day) => void;
  minDay?: Day;
};

/** 月のカレンダー。日をタップして記録を直す。メモがある日には印を付ける */
export function MonthCalendar({ month, onMonthChange, today, weekStart, color, statusOf, hasNote, onPressDay }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const start = monthStartOf(month);
  const end = monthEndOf(month);
  const gridStart = weekStartOf(start, weekStart);
  const cells: Day[] = [];
  for (let d = gridStart; d <= end || cells.length % 7 !== 0; d = addDays(d, 1)) cells.push(d);
  const canNext = monthStartOf(addMonths(start, 1)) <= today;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => onMonthChange(addMonths(start, -1))} accessibilityRole="button" accessibilityLabel={t('detail.prevMonth')} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.month, { color: theme.text }]} accessibilityRole="header">
          {formatMonth(start)}
        </Text>
        <Pressable
          onPress={() => canNext && onMonthChange(addMonths(start, 1))}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel={t('detail.nextMonth')}
          hitSlop={10}
          style={{ opacity: canNext ? 1 : 0.25 }}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {orderedWeekdays(weekStart).map((w) => (
          <Text key={w} style={[styles.weekday, { color: theme.textSecondary }]}>
            {weekdayName(w, 'narrow')}
          </Text>
        ))}
      </View>
      <View style={styles.cells}>
        {cells.map((day) => {
          const inMonth = day >= start && day <= end;
          if (!inMonth) return <View key={day} style={styles.cell} />;
          const future = day > today;
          const status = statusOf(day);
          const note = hasNote(day);
          return (
            <Pressable
              key={day}
              onPress={() => onPressDay(day)}
              disabled={future}
              accessibilityRole="button"
              accessibilityLabel={`${formatDay(day)} ${t(`status.${status}`)}${note ? ` ${t('detail.hasNote')}` : ''}`}
              style={({ pressed }) => [styles.cell, { opacity: future ? 0.3 : pressed ? 0.5 : 1 }]}>
              <View style={[styles.dayCircle, day === today && { borderColor: theme.text, borderWidth: 1.5 }]}>
                <Text style={[styles.dayText, { color: theme.text }]}>{parseDay(day)?.date}</Text>
              </View>
              <View style={styles.marks}>
                <Dot status={status} color={color} size={7} />
                {note ? <View style={[styles.noteMark, { backgroundColor: theme.text }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.s },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  cells: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, gap: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15 },
  marks: { flexDirection: 'row', gap: 3, height: 7, alignItems: 'center' },
  noteMark: { width: 4, height: 4, borderRadius: 2 },
});
