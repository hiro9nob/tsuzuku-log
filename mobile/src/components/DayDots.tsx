import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Day } from '@/lib/day';
import { formatDay } from '@/lib/format';
import type { DayStatus } from '@/lib/stats';
import { useTheme } from '@/theme';

/**
 * 日ごとの点。できた日は塗りつぶし、お休みは中空の丸（連続は切れない）。
 * できなかった日も目立たせない（責めない見せ方）
 */
export function Dot({ status, color, size = 12 }: { status: DayStatus; color: string; size?: number }) {
  const theme = useTheme();
  const base = { width: size, height: size, borderRadius: size / 2 };
  switch (status) {
    case 'done':
      return <View style={[base, { backgroundColor: color }]} />;
    case 'partial':
      return <View style={[base, { backgroundColor: color, opacity: 0.4 }]} />;
    case 'rest':
      return <View style={[base, { borderWidth: Math.max(1.5, size / 6), borderColor: color }]} />;
    case 'over':
      return <View style={[base, { backgroundColor: theme.textSecondary }]} />;
    case 'open':
      return <View style={[base, { borderWidth: 1.5, borderColor: theme.divider, borderStyle: 'dashed' }]} />;
    default:
      return <View style={[base, { backgroundColor: theme.surfaceAlt }]} />;
  }
}

export function DayDots({ statuses, color, size }: { statuses: DayStatus[]; color: string; size?: number }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {statuses.map((s, i) => (
        <Dot key={i} status={s} color={color} size={size} />
      ))}
    </View>
  );
}

/**
 * 押して直せる点（きょうの一覧）。記録を忘れた日を、その場で直せるようにする。
 * 点は小さいので、押せる場所は点のまわりまで広げ、読み上げでは日付と状態を伝える
 */
export function DayDotButtons({
  days,
  statuses,
  color,
  size,
  onPress,
}: {
  days: Day[];
  statuses: DayStatus[];
  color: string;
  size?: number;
  onPress: (day: Day) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.buttons}>
      {days.map((day, i) => (
        <Pressable
          key={day}
          onPress={() => onPress(day)}
          hitSlop={{ top: 8, bottom: 8 }}
          accessibilityRole="button"
          accessibilityLabel={t('today.dayLabel', {
            date: formatDay(day, { month: 'short', day: 'numeric', weekday: 'short' }),
            status: t(`status.${statuses[i]}`),
          })}
          accessibilityHint={t('today.dayHint')}
          style={({ pressed }) => [styles.cell, { opacity: pressed ? 0.5 : 1 }]}>
          <Dot status={statuses[i]} color={color} size={size} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  // 点のまわり 22pt を押せる場所にする（上下は hitSlop で広げる）
  buttons: { flexDirection: 'row', alignItems: 'center', marginLeft: -6 },
  cell: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
