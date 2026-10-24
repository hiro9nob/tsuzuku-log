import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { dayOf, dayToUtcDate, type Day } from '@/lib/day';
import { formatDay } from '@/lib/format';
import { radius, spacing, useTheme } from '@/theme';

/** 日付の入力（'YYYY-MM-DD'）。iOS は小さなピッカー、Android はタップでダイアログ */
export function DateField({ value, onChange, minimum, label }: { value: Day; onChange: (v: Day) => void; minimum?: Day; label: string }) {
  const theme = useTheme();
  // ピッカーは現地時刻で扱うので、正午の Date を渡す
  const toLocal = (d: Day) => {
    const u = dayToUtcDate(d);
    return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate(), 12);
  };
  const apply = (d?: Date) => {
    if (d) onChange(dayOf(d));
  };

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={toLocal(value)}
        mode="date"
        display="compact"
        minimumDate={minimum ? toLocal(minimum) : undefined}
        accessibilityLabel={label}
        themeVariant={theme.isDark ? 'dark' : 'light'}
        onChange={(_, d) => apply(d)}
      />
    );
  }
  return (
    <Pressable
      onPress={() =>
        DateTimePickerAndroid.open({ value: toLocal(value), mode: 'date', minimumDate: minimum ? toLocal(minimum) : undefined, onChange: (_, d) => apply(d) })
      }
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.field, { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}>
      <Text style={[styles.text, { color: theme.text }]}>{formatDay(value, { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { borderRadius: radius.full, paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  text: { fontSize: 17, fontWeight: '600' },
});
