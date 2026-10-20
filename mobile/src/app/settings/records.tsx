import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { SettingsCustomRow, SettingsRow, SettingsSection, SettingsSwitchRow } from '@/components/SettingsRow';
import { DAY_START_HOURS } from '@/lib/day';
import { formatTimeOfDay } from '@/lib/format';
import { TODAY_HISTORY_RANGES, useSettings, type WeekStartPreference } from '@/lib/settings';
import { spacing } from '@/theme';

/** 記録の設定（きょうの記録の表示、1日の区切り、週の始まり、お休み期間、アーカイブ、節目のお祝い）。きょうの見出しと設定から開く */
export default function RecordSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const s = useSettings();

  return (
    <>
      <Stack.Screen options={{ title: t('settings.recordSettings') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection footer={t('settings.todayHistoryFooter')}>
          <SettingsCustomRow first label={t('settings.todayHistory')}>
            <View style={styles.chips}>
              {TODAY_HISTORY_RANGES.map((r) => (
                <Chip key={r} grow label={t(`settings.todayHistories.${r}`)} selected={s.todayHistory === r} onPress={() => s.set('todayHistory', r)} />
              ))}
            </View>
          </SettingsCustomRow>
        </SettingsSection>
        <SettingsSection footer={t('settings.dayStartFooter')}>
          <SettingsCustomRow first label={t('settings.dayStart')}>
            <View style={styles.chips}>
              {DAY_START_HOURS.map((h) => (
                <Chip key={h} grow compact label={formatTimeOfDay(`${String(h).padStart(2, '0')}:00`)} selected={s.dayStartHour === h} onPress={() => s.set('dayStartHour', h)} />
              ))}
            </View>
          </SettingsCustomRow>
          <SettingsCustomRow label={t('settings.weekStart')}>
            <View style={styles.chips}>
              {(['system', 'sun', 'mon'] as WeekStartPreference[]).map((w) => (
                <Chip key={w} grow label={t(`settings.weekStarts.${w}`)} selected={s.weekStart === w} onPress={() => s.set('weekStart', w)} />
              ))}
            </View>
          </SettingsCustomRow>
          <SettingsRow label={t('vacation.title')} onPress={() => router.push('/settings/vacation')} />
          <SettingsRow label={t('archive.title')} onPress={() => router.push('/settings/archived')} />
          <SettingsSwitchRow
            label={t('settings.celebrations')}
            detail={t('settings.celebrationsDetail')}
            value={s.celebrations}
            onValueChange={(v) => s.set('celebrations', v)}
          />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l, paddingBottom: spacing.xl * 2 },
  chips: { flexDirection: 'row', gap: spacing.xs },
});
