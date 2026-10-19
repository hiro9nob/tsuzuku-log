import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { formatTimeOfDay } from '@/lib/format';
import { formatTime, parseTime } from '@/lib/habit';
import { radius, spacing, useTheme } from '@/theme';

/** 時刻の入力（'HH:MM'）。iOS は小さなピッカー、Android はタップでダイアログ */
export function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const theme = useTheme();
  const { hour, minute } = parseTime(value);
  const date = new Date(2026, 0, 1, hour, minute);
  const apply = (d?: Date) => {
    if (d) onChange(formatTime(d.getHours(), d.getMinutes()));
  };

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={date}
        mode="time"
        display="compact"
        accessibilityLabel={label}
        themeVariant={theme.isDark ? 'dark' : 'light'}
        onChange={(_, d) => apply(d)}
      />
    );
  }
  return (
    <Pressable
      onPress={() => DateTimePickerAndroid.open({ value: date, mode: 'time', onChange: (_, d) => apply(d) })}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.field, { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.text, { color: theme.text }]}>{formatTimeOfDay(value)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { borderRadius: radius.full, paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  text: { fontSize: 17, fontWeight: '600' },
});
