import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { addDays, orderedWeekdays, parseDay, weekStartOf, type Day, type WeekStart } from '@/lib/day';
import { currentLocale } from '@/lib/i18n';
import { weekdayName } from '@/lib/format';
import type { DayStatus } from '@/lib/stats';
import { spacing, useTheme, type Theme } from '@/theme';

const CELL = 14;
const GAP = 3;
/** 1年分（右端がきょう）。入りきらない分は左へスクロールして見る */
const WEEKS = 53;
const LABEL_WIDTH = 22;

/**
 * これまでの記録の一覧。列が週、行が曜日。上に月、左に曜日の目盛りを付ける。
 * 塗りつぶしはできた日、中空のマスはお休みの日。始める前の日とこれからの日は、記録のない日と区別して薄くする
 */
export function Heatmap({
  statusOf,
  today,
  weekStart,
  startDay,
  color,
}: {
  statusOf: (day: Day) => DayStatus;
  today: Day;
  weekStart: WeekStart;
  startDay: Day;
  color: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);

  const first = addDays(weekStartOf(today, weekStart), -7 * (WEEKS - 1));
  const rows = orderedWeekdays(weekStart);
  const monthFmt = new Intl.DateTimeFormat(currentLocale(), { month: 'short', timeZone: 'UTC' });

  const columns = Array.from({ length: WEEKS }, (_, w) => {
    const days = rows.map((_, r) => addDays(first, w * 7 + r));
    // その週に1日がある列に、月の名前を出す
    const monthStart = days.find((d) => parseDay(d)?.date === 1);
    return { days, month: monthStart ? monthFmt.format(new Date(`${monthStart}T12:00:00Z`)) : null };
  });

  const cellStyle = (day: Day) => heatmapCellStyle(day > today || day < startDay ? null : statusOf(day), color, theme, 2);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View accessible accessibilityLabel={t('detail.heatmap')}>
      <View style={styles.wrap} onLayout={onLayout}>
        {/* 曜日の目盛り（1行おき） */}
        <View style={[styles.weekdays, { width: LABEL_WIDTH }]}>
          <View style={styles.monthRow} />
          {rows.map((wd, i) => (
            <Text key={wd} style={[styles.weekdayLabel, { color: theme.textSecondary }]}>
              {i % 2 === 1 ? weekdayName(wd, 'narrow') : ''}
            </Text>
          ))}
        </View>
        {width > 0 ? (
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: width - LABEL_WIDTH }}
            // 右端（きょう）から見せる。contentOffset はレイアウトの前だと効かないことがあるので、大きさが決まってから動かす
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            <View style={styles.grid}>
              {columns.map((col, w) => (
                <View key={w} style={styles.column}>
                  <View style={styles.monthRow}>
                    {col.month ? (
                      <Text style={[styles.monthLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                        {col.month}
                      </Text>
                    ) : null}
                  </View>
                  {col.days.map((day) => (
                    <View key={day} style={[styles.cell, cellStyle(day), day === today && { borderWidth: 1.5, borderColor: theme.text }]} />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>
      <View style={styles.legend}>
        <Legend label={t('status.done')} style={{ backgroundColor: color }} />
        <Legend label={t('status.rest')} style={{ borderWidth: 2, borderColor: color }} />
        <Legend label={t('status.none')} style={{ backgroundColor: theme.surfaceAlt }} />
      </View>
    </View>
  );
}

/** マスの見た目。null は始める前の日とこれからの日（記録のない日と区別して薄くする） */
export function heatmapCellStyle(status: DayStatus | null, color: string, theme: Theme, restBorder: number) {
  if (status === null) return { backgroundColor: theme.surfaceAlt, opacity: 0.35 };
  switch (status) {
    case 'done':
      return { backgroundColor: color };
    case 'partial':
      return { backgroundColor: color, opacity: 0.45 };
    case 'rest':
      return { borderWidth: restBorder, borderColor: color };
    case 'over':
      return { backgroundColor: theme.textSecondary };
    default:
      return { backgroundColor: theme.surfaceAlt };
  }
}

function Legend({ label, style }: { label: string; style: object }) {
  const theme = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.cell, style]} />
      <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  weekdays: { gap: GAP },
  weekdayLabel: { height: CELL, fontSize: 10, lineHeight: CELL },
  grid: { flexDirection: 'row', gap: GAP },
  column: { gap: GAP, width: CELL },
  monthRow: { height: 14 },
  // 月の名前は列の幅をはみ出してよい（次の月の列までは数週ある）
  monthLabel: { position: 'absolute', left: 0, width: CELL * 4, fontSize: 10 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.s, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11 },
});
