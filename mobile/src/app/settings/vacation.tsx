import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DateField } from '@/components/DateField';
import { SettingsCustomRow, SettingsSection } from '@/components/SettingsRow';
import { useToday } from '@/hooks/useToday';
import { addDays } from '@/lib/day';
import { formatDay } from '@/lib/format';
import { clearRestAll, restAll } from '@/lib/habits';
import { scheduleReschedule } from '@/lib/notifications';
import { radius, spacing, useTheme } from '@/theme';

/**
 * まとめてお休み（旅行や体調不良のとき）。期間を選んで、すべての習慣をお休みにする。
 * できた記録は変えない。お休みなので、連続は途切れない
 */
export default function VacationScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const today = useToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => addDays(today, 6));
  const valid = from <= to;
  const range = `${formatDay(from, { month: 'short', day: 'numeric' })} – ${formatDay(to, { month: 'short', day: 'numeric' })}`;

  const apply = () => {
    if (!valid) return;
    const n = restAll(from, to);
    scheduleReschedule();
    Alert.alert(n > 0 ? t('vacation.done', { range }) : t('vacation.nothing'));
  };

  const clear = () => {
    if (!valid) return;
    Alert.alert(t('vacation.clearTitle', { range }), t('vacation.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('vacation.clear'),
        onPress: () => {
          const n = clearRestAll(from, to);
          scheduleReschedule();
          Alert.alert(n > 0 ? t('vacation.cleared') : t('vacation.nothingToClear'));
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('vacation.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.lead, { color: theme.textSecondary }]}>{t('vacation.lead')}</Text>
        <SettingsSection>
          <SettingsCustomRow first label={t('vacation.from')}>
            <DateField value={from} label={t('vacation.from')} onChange={(d) => setFrom(d)} />
          </SettingsCustomRow>
          <SettingsCustomRow label={t('vacation.to')}>
            <DateField value={to} minimum={from} label={t('vacation.to')} onChange={(d) => setTo(d)} />
          </SettingsCustomRow>
        </SettingsSection>
        <Pressable
          onPress={apply}
          disabled={!valid}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: !valid ? 0.4 : pressed ? 0.8 : 1 }]}>
          <Text style={[styles.primaryText, { color: theme.accentText }]}>{t('vacation.apply')}</Text>
        </Pressable>
        <Pressable onPress={clear} disabled={!valid} accessibilityRole="button" style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: theme.text }]}>{t('vacation.clear')}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l },
  lead: { fontSize: 15, lineHeight: 22, marginHorizontal: spacing.s },
  primary: { borderRadius: radius.full, paddingVertical: spacing.m, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '800' },
  secondary: { alignItems: 'center', paddingVertical: spacing.s },
  secondaryText: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
});
