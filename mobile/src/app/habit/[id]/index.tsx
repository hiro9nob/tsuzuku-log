import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DetailedStats } from '@/components/DetailedStats';
import { HabitIcon } from '@/components/HabitIcon';
import { useStreakLabel } from '@/components/HabitRow';
import { Heatmap } from '@/components/Heatmap';
import { MonthCalendar } from '@/components/MonthCalendar';
import { StatTile } from '@/components/StatTile';
import { useData } from '@/hooks/useData';
import { useHabitView } from '@/hooks/useHabits';
import { useToday } from '@/hooks/useToday';
import { addMonths, monthStartOf, weekStartOf } from '@/lib/day';
import { formatDay, formatPercent } from '@/lib/format';
import { listNotes, recordedHours, unarchiveHabit } from '@/lib/habits';
import { scheduleReschedule } from '@/lib/notifications';
import { useScheduleLabel } from '@/lib/scheduleLabel';
import { useWeekStart } from '@/lib/settings';
import { completionRate, dayStatus, evaluateUnits, weekdayCounts } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

const NOTES_PREVIEW = 5;

export default function HabitDetailScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const weekStart = useWeekStart();
  const view = useHabitView(id, today);
  const streakLabel = useStreakLabel();
  const scheduleLabel = useScheduleLabel();
  const [month, setMonth] = useState(() => monthStartOf(today));
  const notes = useData(useCallback(() => listNotes({ habitId: id }), [id]));
  const hours = useData(useCallback(() => recordedHours(id), [id]));

  if (!view) return null;
  const { habit, entries, streaks } = view;
  const archivedDay = habit.archivedDay;
  const color = theme.habit(habit.color);
  const units = evaluateUnits(habit, entries, today, weekStart);
  const weekRate = completionRate(units, weekStartOf(today, weekStart), today);
  const monthRate = completionRate(units, monthStartOf(today), today);
  const noteDays = new Set(notes.map((n) => n.day));
  const statusOf = (day: string) => dayStatus(habit, entries, day, today, weekStart);
  const openDay = (day: string) => router.push({ pathname: '/entry', params: { habitId: id, day } });

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push({ pathname: '/share', params: { habitId: id } })}
                accessibilityRole="button"
                accessibilityLabel={t('share.button')}
                hitSlop={8}>
                <Ionicons name="share-outline" size={23} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => router.push({ pathname: '/habit/[id]/edit', params: { id } })}
                accessibilityRole="button"
                accessibilityLabel={t('detail.edit')}
                hitSlop={8}>
                <Ionicons name="create-outline" size={23} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {archivedDay ? (
          <View style={[styles.archived, { backgroundColor: theme.accentSoft }]}>
            <Text style={[styles.archivedText, { color: theme.text }]}>
              {t('archive.banner', { date: formatDay(archivedDay, { month: 'short', day: 'numeric' }) })}
            </Text>
            <Pressable
              onPress={() => {
                unarchiveHabit(id, today);
                scheduleReschedule();
              }}
              accessibilityRole="button"
              hitSlop={8}>
              <Text style={[styles.link, { color: theme.text }]}>{t('archive.restore')}</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.hero}>
          <HabitIcon icon={habit.icon} color={habit.color} size={64} />
          <Text style={[styles.name, { color: theme.text }]} accessibilityRole="header">
            {habit.name}
          </Text>
          <Text style={[styles.schedule, { color: theme.textSecondary }]}>{scheduleLabel(habit)}</Text>
        </View>

        <View style={styles.tiles}>
          <StatTile value={streakLabel(streaks.current, streaks.unit)} label={t('detail.current')} />
          <StatTile value={streakLabel(streaks.longest, streaks.unit)} label={t('detail.longest')} />
        </View>
        <View style={styles.tiles}>
          <StatTile value={formatPercent(weekRate)} label={t('detail.weekRate')} />
          <StatTile value={formatPercent(monthRate)} label={t('detail.monthRate')} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{t('detail.history')}</Text>
          <Heatmap statusOf={statusOf} today={today} weekStart={weekStart} startDay={habit.startDay} color={color} />
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <MonthCalendar
            month={month}
            onMonthChange={setMonth}
            today={today}
            weekStart={weekStart}
            color={color}
            statusOf={statusOf}
            hasNote={(d) => noteDays.has(d)}
            onPressDay={openDay}
          />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{t('detail.editHint')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('detail.notes')}</Text>
            <Pressable onPress={() => openDay(today)} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.link, { color: theme.text }]}>＋ {t('detail.addNote')}</Text>
            </Pressable>
          </View>
          {notes.length === 0 ? (
            <Text style={[styles.hint, { color: theme.textSecondary }]}>{t('detail.noNotes')}</Text>
          ) : (
            notes.slice(0, NOTES_PREVIEW).map((n) => (
              <Pressable key={n.id} onPress={() => openDay(n.day)} accessibilityRole="button" style={styles.note}>
                <Text style={[styles.noteDay, { color: theme.textSecondary }]}>{formatDay(n.day)}</Text>
                <Text style={[styles.noteText, { color: theme.text }]}>{n.text}</Text>
              </Pressable>
            ))
          )}
          {notes.length > NOTES_PREVIEW ? (
            <Pressable onPress={() => router.push({ pathname: '/notes', params: { habitId: id } })} accessibilityRole="button">
              <Text style={[styles.link, { color: theme.text }]}>{t('detail.allNotes', { count: notes.length })}</Text>
            </Pressable>
          ) : null}
        </View>

        <DetailedStats
          units={units}
          hours={hours}
          weekdayDone={weekdayCounts(habit, entries, addMonths(today, -12), today)}
          today={today}
          weekStart={weekStart}
          color={color}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.m, paddingBottom: spacing.xl * 2 },
  headerActions: { flexDirection: 'row', gap: spacing.l, paddingHorizontal: spacing.xs },
  hero: { alignItems: 'center', gap: spacing.s, marginBottom: spacing.s },
  archived: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, borderRadius: radius.l, padding: spacing.m },
  archivedText: { flex: 1, fontSize: 14, lineHeight: 20 },
  name: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
  schedule: { fontSize: 15 },
  tiles: { flexDirection: 'row', gap: spacing.s },
  card: { borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 18 },
  link: { fontSize: 15, fontWeight: '700' },
  note: { gap: 2 },
  noteDay: { fontSize: 12, fontWeight: '600' },
  noteText: { fontSize: 15, lineHeight: 21 },
});
