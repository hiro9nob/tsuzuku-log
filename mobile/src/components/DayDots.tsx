import { StyleSheet, View } from 'react-native';

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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
