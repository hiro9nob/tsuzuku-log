import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { SettingsRow, SettingsSection } from '@/components/SettingsRow';
import { currentLocale } from '@/lib/i18n';
import { listICloudBackups, prepareICloudRestore } from '@/lib/icloud';
import { scheduleReschedule } from '@/lib/notifications';
import { spacing, useTheme } from '@/theme';

import type { ICloudFile } from '../../../modules/ongo-icloud';

/** iCloud のバックアップから戻す（今の記録に足す） */
export default function ICloudRestoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [files, setFiles] = useState<ICloudFile[] | null>(null);

  useEffect(() => {
    listICloudBackups().then(setFiles);
  }, []);

  const restore = async (file: ICloudFile) => {
    let prepared;
    try {
      prepared = await prepareICloudRestore(file.name);
    } catch (e) {
      console.error(e);
      Alert.alert(t('icloud.readFailed'));
      return;
    }
    if (prepared.kind !== 'ready') {
      Alert.alert(t('import.invalid'));
      return;
    }
    const { summary, apply } = prepared;
    const lines = [
      summary.habitsAdded > 0 ? t('import.habits', { count: summary.habitsAdded }) : null,
      summary.records > 0 ? t('import.records', { count: summary.records }) : null,
      summary.notes > 0 ? t('import.notes', { count: summary.notes }) : null,
    ].filter(Boolean);
    Alert.alert(t('icloud.confirmTitle'), [lines.join('\n'), t('import.mergeNote')].join('\n\n'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('icloud.restore'),
        onPress: () => {
          try {
            apply();
            scheduleReschedule();
            Alert.alert(t('icloud.restored'));
          } catch (e) {
            console.error(e);
            Alert.alert(t('import.failed'));
          }
        },
      },
    ]);
  };

  const fmt = new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <>
      <Stack.Screen options={{ title: t('icloud.restoreTitle') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {files === null ? (
          <ActivityIndicator color={theme.text} />
        ) : files.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{t('icloud.none')}</Text>
        ) : (
          <SettingsSection footer={t('icloud.restoreFooter')}>
            {files.map((f, i) => (
              <SettingsRow key={f.name} first={i === 0} label={fmt.format(new Date(f.modifiedAt))} onPress={() => restore(f)} />
            ))}
          </SettingsSection>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l },
  empty: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
});
