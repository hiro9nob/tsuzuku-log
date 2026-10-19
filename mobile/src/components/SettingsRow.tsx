import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function SettingsSection({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: theme.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsRow({
  label,
  value,
  onPress,
  checked,
  first,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  checked?: boolean;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={checked !== undefined ? { selected: checked } : undefined}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider },
        { opacity: pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: theme.textSecondary }]}>{value}</Text> : null}
      {checked ? <Ionicons name="checkmark" size={20} color={theme.accent} /> : null}
      {onPress && checked === undefined ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.s },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginLeft: spacing.m },
  card: { borderRadius: radius.l, overflow: 'hidden' },
  footer: { fontSize: 13, lineHeight: 18, marginHorizontal: spacing.m },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingHorizontal: spacing.m, paddingVertical: spacing.m - 2 },
  label: { flex: 1, fontSize: 16 },
  value: { fontSize: 15 },
});

export function SettingsSwitchRow({
  label,
  detail,
  value,
  onValueChange,
  first,
}: {
  label: string;
  detail?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]}>
      <View style={switchStyles.texts}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {detail ? <Text style={[switchStyles.detail, { color: theme.textSecondary }]}>{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

/** 行の中に部品（チップ、時刻など）を置く */
export function SettingsCustomRow({ label, children, first }: { label: string; children: ReactNode; first?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[switchStyles.custom, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.divider }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {children}
    </View>
  );
}

const switchStyles = StyleSheet.create({
  texts: { flex: 1, gap: 2 },
  detail: { fontSize: 13, lineHeight: 18 },
  custom: { paddingHorizontal: spacing.m, paddingVertical: spacing.m - 2, gap: spacing.s },
});
