import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const button = (icon: 'remove' | 'add', next: number, disabled: boolean, a11y: string) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={({ pressed }) => [styles.button, { backgroundColor: theme.surfaceAlt, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={20} color={theme.text} />
    </Pressable>
  );
  return (
    <View style={styles.row} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ now: value, min, max }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment' && value < max) onChange(value + 1);
        if (e.nativeEvent.actionName === 'decrement' && value > min) onChange(value - 1);
      }}>
      {button('remove', value - 1, value <= min, t('common.decrease'))}
      <Text style={[styles.value, { color: theme.text }]}>{label}</Text>
      {button('add', value + 1, value >= max, t('common.increase'))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  button: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 90, textAlign: 'center', fontSize: 17, fontWeight: '700' },
});
