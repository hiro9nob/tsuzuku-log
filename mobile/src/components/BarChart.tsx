import { StyleSheet, Text, View } from 'react-native';

import { spacing, useTheme } from '@/theme';

/** 縦の棒グラフ。値は 0〜1（null は記録なし） */
export function BarChart({ values, labels, color, height = 96, accessibilityLabel }: { values: (number | null)[]; labels: string[]; color: string; height?: number; accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.wrap}>
      <View style={[styles.bars, { height }]}>
        {values.map((v, i) => (
          <View key={i} style={styles.slot}>
            <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
              <View style={[styles.bar, { height: `${Math.round((v ?? 0) * 100)}%`, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  bars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  slot: { flex: 1, height: '100%' },
  track: { flex: 1, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4 },
  labels: { flexDirection: 'row', gap: 4 },
  label: { flex: 1, textAlign: 'center', fontSize: 10 },
});
