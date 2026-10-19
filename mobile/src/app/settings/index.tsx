import Constants from 'expo-constants';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';

import { NotificationCard } from '@/components/NotificationCard';
import { SettingsCustomRow, SettingsRow, SettingsSection, SettingsSwitchRow } from '@/components/SettingsRow';
import { TimeField } from '@/components/TimeField';
import { authenticate, lockAvailable } from '@/lib/appLock';
import { exportCsv, exportJson, pickImport } from '@/lib/backup';
import { currentLocale } from '@/lib/i18n';
import { backupToICloud, iCloudAvailable, iCloudSupported } from '@/lib/icloud';
import { LANGUAGES } from '@/lib/i18n/languages';
import { legalUrl } from '@/lib/links';
import { scheduleReschedule } from '@/lib/notifications';
import { useIsPro } from '@/lib/pro';
import { useSettings } from '@/lib/settings';
import { nowIso } from '@/lib/time';
import { spacing } from '@/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const s = useSettings();
  const isPro = useIsPro();
  const languageLabel = s.language === 'system' ? t('settings.languageSystem') : LANGUAGES.find((l) => l.code === s.language)?.nativeName;

  const onExport = async (kind: 'json' | 'csv') => {
    try {
      await (kind === 'json' ? exportJson() : exportCsv());
      await s.set('lastExportAt', nowIso());
    } catch (e) {
      console.error(e);
      Alert.alert(t('export.failed'));
    }
  };

  const onImport = async () => {
    let prepared;
    try {
      prepared = await pickImport();
    } catch (e) {
      console.error(e);
      Alert.alert(t('import.invalid'));
      return;
    }
    if (prepared.kind === 'canceled') return;
    if (prepared.kind === 'invalid') {
      Alert.alert(t('import.invalid'), t('import.formatHint'));
      return;
    }
    const { summary, apply } = prepared;
    const lines = [
      summary.habitsAdded > 0 ? t('import.habits', { count: summary.habitsAdded }) : null,
      summary.records > 0 ? t('import.records', { count: summary.records }) : null,
      summary.notes > 0 ? t('import.notes', { count: summary.notes }) : null,
    ].filter(Boolean);
    Alert.alert(t('import.confirmTitle'), [lines.join('\n'), t('import.mergeNote')].join('\n\n'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('import.run'),
        onPress: () => {
          try {
            apply();
            scheduleReschedule();
            Alert.alert(t('import.done'));
          } catch (e) {
            console.error(e);
            Alert.alert(t('import.failed'));
          }
        },
      },
    ]);
  };

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  // オンにするときもオフにするときも、本人か確かめる
  const onToggleLock = async (on: boolean) => {
    if (on && !(await lockAvailable())) {
      Alert.alert(t('lock.unavailable'));
      return;
    }
    if (!(await authenticate(on ? t('lock.promptOn') : t('lock.promptOff')))) return;
    await s.set('appLock', on);
    // 通知のボタンで記録するときにも、端末のロックを解いてもらう
    scheduleReschedule();
  };

  const onBackupNow = async () => {
    if (!(await iCloudAvailable())) {
      Alert.alert(t('icloud.unavailable'));
      return;
    }
    try {
      Alert.alert((await backupToICloud()) ? t('icloud.done') : t('icloud.emptySkipped'));
    } catch (e) {
      console.error(e);
      Alert.alert(t('icloud.failed'));
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('settings.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection>
          <SettingsRow first label={t('settings.recordSettings')} onPress={() => router.push('/settings/records')} />
        </SettingsSection>

        <SettingsSection title={t('settings.notifications')}>
          <SettingsSwitchRow
            first
            label={t('settings.summary')}
            detail={t('settings.summaryDetail')}
            value={s.summaryEnabled}
            onValueChange={(v) => s.set('summaryEnabled', v)}
          />
          {s.summaryEnabled ? (
            <SettingsCustomRow label={t('settings.summaryTime')}>
              <TimeField value={s.summaryTime} label={t('settings.summaryTime')} onChange={(v) => s.set('summaryTime', v)} />
            </SettingsCustomRow>
          ) : null}
        </SettingsSection>
        <NotificationCard force />

        <SettingsSection title={t('settings.display')}>
          <SettingsRow first label={t('settings.language')} value={languageLabel} onPress={() => router.push('/settings/language')} />
          <SettingsRow label={t('appearance.title')} value={t(`appearance.modes.${s.appearance}`)} onPress={() => router.push('/settings/appearance')} />
          <SettingsRow label={t('today.reorder')} onPress={() => router.push('/reorder')} />
        </SettingsSection>

        <SettingsSection title={t('lock.section')} footer={t('lock.footer')}>
          <SettingsSwitchRow first label={t('lock.setting')} detail={t('lock.settingDetail')} value={s.appLock} onValueChange={onToggleLock} />
        </SettingsSection>

        {iCloudSupported() ? (
          <SettingsSection title="iCloud" footer={t('icloud.footer')}>
            <SettingsSwitchRow
              first
              label={t('icloud.auto')}
              detail={
                s.lastICloudBackupAt
                  ? t('icloud.last', { date: new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s.lastICloudBackupAt)) })
                  : t('icloud.never')
              }
              value={s.iCloudBackup}
              onValueChange={(v) => s.set('iCloudBackup', v)}
            />
            <SettingsRow label={t('icloud.now')} onPress={onBackupNow} />
            <SettingsRow label={t('icloud.restoreTitle')} onPress={() => router.push('/settings/icloud')} />
          </SettingsSection>
        ) : null}

        <SettingsSection title={t('settings.data')} footer={t('settings.storageNote')}>
          <SettingsRow first label={t('settings.exportJson')} onPress={() => onExport('json')} />
          <SettingsRow label={t('settings.exportCsv')} onPress={() => onExport('csv')} />
          <SettingsRow label={t('settings.import')} onPress={onImport} />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow first label={t('settings.pro')} value={isPro ? t('settings.proActive') : undefined} onPress={() => router.push('/pro')} />
        </SettingsSection>

        <SettingsSection title={t('settings.about')}>
          <SettingsRow first label={t('settings.support')} onPress={() => open(legalUrl('support', i18n.language))} />
          <SettingsRow label={t('pro.terms')} onPress={() => open(legalUrl('terms', i18n.language))} />
          <SettingsRow label={t('pro.privacy')} onPress={() => open(legalUrl('privacy', i18n.language))} />
          <SettingsRow label={t('settings.version')} value={Constants.expoConfig?.version ?? '-'} />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l, paddingBottom: spacing.xl * 2 },
});
