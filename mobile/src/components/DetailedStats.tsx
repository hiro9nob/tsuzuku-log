import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useProGate } from '@/hooks/useProGate';
import { addMonths, monthEndOf, monthStartOf, orderedWeekdays, type Day, type WeekStart } from '@/lib/day';
import { formatPercent, weekdayName } from '@/lib/format';
import { useIsPro } from '@/lib/pro';
import { completionRate, hourCounts, monthlyRates, weekdayRates, type Unit } from '@/lib/stats';
import { currentLocale } from '@/lib/i18n';
import { radius, spacing, useTheme } from '@/theme';

import { BarChart } from './BarChart';
import { ProBadge } from './ProBadge';

type Props = {
  units: Unit[];
  hours: number[];
  /** できた日の曜日ごとの回数（週・月単位の習慣で、曜日ごとの達成率が出せないときに使う） */
  weekdayDone: number[];
  today: Day;
  weekStart: WeekStart;
  color: string;
};

const HOUR_BUCKETS = [
  [5, 9],
  [9, 12],
  [12, 17],
  [17, 21],
  [21, 24],
  [0, 5],
] as const;

/** 詳細統計（Pro）：1年の推移、曜日ごと、時間帯ごと、去年との比較 */
export function DetailedStats({ units, hours, weekdayDone, today, weekStart, color }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPro = useIsPro();
  const gate = useProGate();

  if (!isPro) {
    return (
      <Pressable
        onPress={() => gate(t('pro.features.stats'))}
        accessibilityRole="button"
        style={({ pressed }) => [styles.locked, { backgroundColor: theme.surface, opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>{t('stats.detailed')}</Text>
          <ProBadge />
        </View>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{t('stats.detailedHint')}</Text>
      </Pressable>
    );
  }

  const months = monthlyRates(units, today, 12);
  const monthFmt = new Intl.DateTimeFormat(currentLocale(), { month: 'narrow', timeZone: 'UTC' });
  const yearAgo = addMonths(today, -12);
  const rates = weekdayRates(units, addMonths(today, -12), today);
  const maxDone = Math.max(1, ...weekdayDone);
  // 日ごとの単位がない（週・月単位だけの）ときは、できた日の多さで見せる
  const byCount = rates.every((r) => r === null);
  const weekdays = byCount ? weekdayDone.map((n) => n / maxDone) : rates;
  const order = orderedWeekdays(weekStart);
  const counts = hourCounts(hours);
  const bucketCounts = HOUR_BUCKETS.map(([from, to]) => counts.slice(from, to).reduce((a, b) => a + b, 0));
  const maxBucket = Math.max(1, ...bucketCounts);
  const thisMonth = completionRate(units, monthStartOf(today), today);
  const lastYear = completionRate(units, monthStartOf(yearAgo), monthEndOf(yearAgo));

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{t('stats.detailed')}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.subtitle, { color: theme.text }]}>{t('stats.year')}</Text>
        <BarChart
          values={months.map((m) => m.rate)}
          labels={months.map((m) => monthFmt.format(new Date(`${m.month}T12:00:00Z`)))}
          color={color}
          accessibilityLabel={months.map((m) => `${m.month.slice(0, 7)} ${formatPercent(m.rate)}`).join(', ')}
        />
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.subtitle, { color: theme.text }]}>{byCount ? t('stats.weekdayCounts') : t('stats.weekdays')}</Text>
        <BarChart
          values={order.map((w) => weekdays[w])}
          labels={order.map((w) => weekdayName(w, 'narrow'))}
          color={color}
          accessibilityLabel={order.map((w) => `${weekdayName(w)} ${byCount ? weekdayDone[w] : formatPercent(weekdays[w])}`).join(', ')}
        />
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.subtitle, { color: theme.text }]}>{t('stats.hours')}</Text>
        <BarChart
          values={bucketCounts.map((c) => c / maxBucket)}
          labels={HOUR_BUCKETS.map(([from]) => t(`stats.hourBuckets.h${from}`))}
          color={color}
          accessibilityLabel={HOUR_BUCKETS.map(([from], i) => `${t(`stats.hourBuckets.h${from}`)} ${bucketCounts[i]}`).join(', ')}
        />
      </View>
      <View style={[styles.card, styles.compare, { backgroundColor: theme.surface }]}>
        <View style={styles.compareItem}>
          <Text style={[styles.compareValue, { color: theme.text }]}>{formatPercent(thisMonth)}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t('stats.thisMonth')}</Text>
        </View>
        <View style={styles.compareItem}>
          <Text style={[styles.compareValue, { color: theme.text }]}>{formatPercent(lastYear)}</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{t('stats.sameMonthLastYear')}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.s },
  locked: { borderRadius: radius.l, padding: spacing.m, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  title: { fontSize: 17, fontWeight: '800' },
  subtitle: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  card: { borderRadius: radius.l, padding: spacing.m, gap: spacing.s },
  compare: { flexDirection: 'row' },
  compareItem: { flex: 1, gap: 2 },
  compareValue: { fontSize: 24, fontWeight: '800' },
});
