import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStreakLabel } from '@/components/HabitRow';
import { HeaderIconButton, ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { useData } from '@/hooks/useData';
import { useHabitViews } from '@/hooks/useHabits';
import { useToday } from '@/hooks/useToday';
import { totals } from '@/lib/habits';
import { iCloudSupported } from '@/lib/icloud';
import { useIsPro } from '@/lib/pro';
import { useSettings } from '@/lib/settings';
import { currentLocale } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

/** マイページ：いまのプラン、これまでの数字、バックアップの状態 */
export default function MeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const isPro = useIsPro();
  const views = useHabitViews(today);
  const streakLabel = useStreakLabel();
  const lastExportAt = useSettings((s) => s.lastExportAt);
  const lastICloudBackupAt = useSettings((s) => s.lastICloudBackupAt);
  const iCloudOn = useSettings((s) => s.iCloudBackup) && iCloudSupported();
  const sum = useData(useCallback(() => totals(), []));
  const best = views.reduce<{ n: number; unit: 'day' | 'week' | 'month' } | null>(
    (b, v) => (v.streaks.unit === 'day' && v.streaks.longest > (b?.n ?? 0) ? { n: v.streaks.longest, unit: 'day' } : b),
    null,
  );
  const fmt = new Intl.NumberFormat(currentLocale());

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={t('me.title')}
        right={<HeaderIconButton icon="settings-outline" label={t('settings.title')} onPress={() => router.push('/settings')} />}
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Pressable
          onPress={() => router.push('/pro')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.plan, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}>
          <View style={styles.planTexts}>
            <Text style={[styles.planLabel, { color: theme.textSecondary }]}>{t('me.plan')}</Text>
            <Text style={[styles.planName, { color: theme.text }]}>{isPro ? t('me.pro') : t('me.free')}</Text>
            <Text style={[styles.planBody, { color: theme.textSecondary }]}>{isPro ? t('me.proBody') : t('me.freeBody')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.tiles}>
          <StatTile value={fmt.format(sum.records)} label={t('me.records')} />
          <StatTile value={fmt.format(sum.activeDays)} label={t('me.activeDays')} />
        </View>
        <View style={styles.tiles}>
          <StatTile value={best ? streakLabel(best.n, best.unit) : '–'} label={t('me.longest')} />
          <StatTile value={fmt.format(views.length)} label={t('me.habits')} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.row}>
            <Ionicons name={iCloudOn ? 'cloud-done-outline' : 'phone-portrait-outline'} size={20} color={theme.text} />
            <Text style={[styles.rowText, { color: theme.text }]}>{iCloudOn ? t('me.icloudOn') : t('me.storage')}</Text>
          </View>
          <Text style={[styles.planBody, { color: theme.textSecondary }]}>
            {iCloudOn && lastICloudBackupAt
              ? t('icloud.last', { date: new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastICloudBackupAt)) })
              : lastExportAt
              ? t('me.lastExport', {
                  date: new Intl.DateTimeFormat(currentLocale(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lastExportAt)),
                })
              : t('me.noExport')}
          </Text>
          <Pressable onPress={() => router.push('/settings')} accessibilityRole="button">
            <Text style={[styles.link, { color: theme.text }]}>{t('me.backupSettings')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.m, gap: spacing.m },
  plan: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  planTexts: { flex: 1, gap: 2 },
  planLabel: { fontSize: 13, fontWeight: '600' },
  planName: { fontSize: 22, fontWeight: '800' },
  planBody: { fontSize: 14, lineHeight: 20 },
  tiles: { flexDirection: 'row', gap: spacing.s },
  card: { borderRadius: radius.l, padding: spacing.m, gap: spacing.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  rowText: { fontSize: 16, fontWeight: '700' },
  link: { fontSize: 15, fontWeight: '700', marginTop: spacing.xs },
});
