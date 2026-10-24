import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailedStats } from '@/components/DetailedStats';
import { HabitIcon } from '@/components/HabitIcon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatTile } from '@/components/StatTile';
import { useData } from '@/hooks/useData';
import { useHabitViews } from '@/hooks/useHabits';
import { useToday } from '@/hooks/useToday';
import { addMonths, monthEndOf, monthStartOf, weekStartOf } from '@/lib/day';
import { formatPercent } from '@/lib/format';
import { recordedHours } from '@/lib/habits';
import { useIsPro } from '@/lib/pro';
import { useWeekStart } from '@/lib/settings';
import { completionRate, evaluateUnits, weekdayCounts } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

/** 振り返り：週と月の達成率、習慣ごとの達成率（無料）。詳細統計は Pro（案内は控えめに） */
export default function ReviewScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const weekStart = useWeekStart();
  const isPro = useIsPro();
  const views = useHabitViews(today);
  const hours = useData(useCallback(() => recordedHours(), []));

  const perHabit = views.map((v) => ({ view: v, units: evaluateUnits(v.habit, v.entries, today, weekStart) }));
  const allUnits = perHabit.flatMap((p) => p.units);
  const weekFrom = weekStartOf(today, weekStart);
  const monthFrom = monthStartOf(today);
  const lastMonth = addMonths(monthFrom, -1);

  return (
    <View style={styles.flex}>
      <ScreenHeader title={t('review.title')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        {views.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{t('review.empty')}</Text>
        ) : (
          <>
            <View style={styles.tiles}>
              <StatTile value={formatPercent(completionRate(allUnits, weekFrom, today))} label={t('review.week')} />
              <StatTile value={formatPercent(completionRate(allUnits, monthFrom, today))} label={t('review.month')} />
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t('review.byHabit')}</Text>
              {perHabit.map(({ view, units }) => {
                const rate = completionRate(units, monthFrom, today);
                const prev = completionRate(units, lastMonth, monthEndOf(lastMonth));
                return (
                  <Pressable
                    key={view.habit.id}
                    onPress={() => router.push({ pathname: '/habit/[id]', params: { id: view.habit.id } })}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.habitRow, { opacity: pressed ? 0.6 : 1 }]}>
                    <HabitIcon icon={view.habit.icon} color={view.habit.color} size={34} />
                    <View style={styles.habitTexts}>
                      <Text style={[styles.habitName, { color: theme.text }]} numberOfLines={1}>
                        {view.habit.name}
                      </Text>
                      <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
                        <View style={[styles.fill, { width: `${Math.round((rate ?? 0) * 100)}%`, backgroundColor: theme.habit(view.habit.color) }]} />
                      </View>
                    </View>
                    <View style={styles.rates}>
                      <Text style={[styles.rate, { color: theme.text }]}>{formatPercent(rate)}</Text>
                      {isPro ? (
                        <Text style={[styles.prev, { color: theme.textSecondary }]}>
                          {t('review.lastMonth', { rate: formatPercent(prev) })}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => router.push('/notes')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.card, styles.linkCard, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t('notes.title')}</Text>
              <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
            </Pressable>

            <DetailedStats
              units={allUnits}
              hours={hours}
              weekdayDone={views
                .map((v) => weekdayCounts(v.habit, v.entries, addMonths(today, -12), today))
                .reduce((sum, c) => sum.map((n, i) => n + c[i]), Array<number>(7).fill(0))}
              today={today}
              weekStart={weekStart}
              color={theme.accent}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.m, gap: spacing.m },
  empty: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: spacing.xl },
  tiles: { flexDirection: 'row', gap: spacing.s },
  card: { borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  linkCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  chevron: { fontSize: 24 },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  habitTexts: { flex: 1, gap: 6 },
  habitName: { fontSize: 15, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  rates: { alignItems: 'flex-end', minWidth: 56 },
  rate: { fontSize: 17, fontWeight: '800' },
  prev: { fontSize: 11 },
});
