import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function StatTile({ value, label }: { value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.surface }]} accessible accessibilityLabel={`${label} ${value}`}>
      <Text style={[styles.value, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: radius.l, padding: spacing.m, gap: 2 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 13 },
});
