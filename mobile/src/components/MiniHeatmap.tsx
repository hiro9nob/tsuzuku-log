import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { addDays, weekStartOf, type Day, type WeekStart } from '@/lib/day';
import type { DayStatus } from '@/lib/stats';
import { useTheme } from '@/theme';

import { heatmapCellStyle } from './Heatmap';

const MAX_CELL = 14;

/**
 * きょうの一覧に出す、目盛りのない小さなヒートマップ。列が週、行が曜日で、右端がきょうの週。
 * スクロールさせず、カードの幅いっぱいに広げる。週が少ないとき（3か月）は、高さを抑えてマスを横長にする
 */
export function MiniHeatmap({
  weeks,
  statusOf,
  today,
  weekStart,
  startDay,
  color,
}: {
  weeks: number;
  statusOf: (day: Day) => DayStatus;
  today: Day;
  weekStart: WeekStart;
  startDay: Day;
  color: string;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const gap = weeks > 30 ? 1 : 2;
  const cellWidth = width > 0 ? (width - gap * (weeks - 1)) / weeks : 0;
  const cellHeight = Math.min(MAX_CELL, cellWidth);

  const columns = useMemo(() => {
    const first = addDays(weekStartOf(today, weekStart), -7 * (weeks - 1));
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, r) => {
        const day = addDays(first, w * 7 + r);
        return { day, status: day > today || day < startDay ? null : statusOf(day) };
      }),
    );
  }, [weeks, statusOf, today, weekStart, startDay]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {cellWidth > 0 ? (
        <View style={[styles.grid, { gap }]}>
          {columns.map((col, w) => (
            <View key={w} style={{ gap }}>
              {col.map(({ day, status }) => (
                <View
                  key={day}
                  style={[
                    { width: cellWidth, height: cellHeight, borderRadius: Math.min(3, cellHeight / 3) },
                    heatmapCellStyle(status, color, theme, Math.max(1, cellHeight / 6)),
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row' },
});
