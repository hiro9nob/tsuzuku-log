import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitRow } from '@/components/HabitRow';
import { NotificationCard } from '@/components/NotificationCard';
import { HeaderIconButton, ScreenHeader } from '@/components/ScreenHeader';
import { Suggestions } from '@/components/Suggestions';
import { UndoBar } from '@/components/UndoBar';
import { useHabitViews, type HabitView } from '@/hooks/useHabits';
import { useToday } from '@/hooks/useToday';
import { showActionSheet } from '@/lib/actionSheet';
import { formatDay } from '@/lib/format';
import { setEntry } from '@/lib/habits';
import { scheduleReschedule } from '@/lib/notifications';
import { usePro } from '@/lib/pro';
import { checkLimitMilestones, tapHabit, undoTap, type TapResult } from '@/lib/record';
import { useWeekStart } from '@/lib/settings';
import { radius, spacing, useTheme } from '@/theme';

type Undo = { habitId: string; day: string; previous: TapResult['previous']; message: string };

const UNDO_MS = 5000;

export default function TodayScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const weekStart = useWeekStart();
  const views = useHabitViews(today);
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showUndo = useCallback((next: Undo | null) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo(next);
    if (next) timer.current = setTimeout(() => setUndo(null), UNDO_MS);
  }, []);

  // 上限型の節目は、きょうの画面を開いたときに確かめる
  // Pro かどうかを確かめ終えてから（期間限定の終わりの日などで、数え方が変わるため）
  const proReady = usePro((s) => s.ready);
  const limitChecked = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!proReady || limitChecked.current === today) return;
      limitChecked.current = today;
      const hit = checkLimitMilestones(views, today, weekStart);
      if (hit) router.push({ pathname: '/share', params: { habitId: hit.habitId, milestone: String(hit.milestone) } });
    }, [proReady, views, today, weekStart, router]),
  );

  const onTap = (view: HabitView) => {
    const result = tapHabit(view.habit, today, weekStart);
    if (result.milestone !== null) {
      showUndo(null);
      router.push({ pathname: '/share', params: { habitId: view.habit.id, milestone: String(result.milestone) } });
      return;
    }
    showUndo({
      habitId: view.habit.id,
      day: today,
      previous: result.previous,
      message: result.cleared ? t('today.cleared', { name: view.habit.name }) : t('today.recorded', { name: view.habit.name }),
    });
  };

  const onLongPress = (view: HabitView) => {
    const entry = view.entries.get(today);
    const resting = entry?.status === 'rest';
    showActionSheet(
      view.habit.name,
      [
        {
          label: resting ? t('today.unrest') : t('today.rest'),
          onPress: () => {
            setEntry(view.habit.id, today, resting ? null : { status: 'rest', value: 0 });
            scheduleReschedule();
          },
        },
        { label: t('today.reorder'), onPress: () => router.push('/reorder') },
      ],
      t('common.cancel'),
    );
  };

  // 期間限定で終わった習慣は、きょうには出さない（振り返りに残る）
  const active = views.filter((v) => v.state !== 'later' && v.state !== 'ended');
  const later = views.filter((v) => v.state === 'later');
  const dueCount = views.filter((v) => v.state === 'due' || v.state === 'done').filter((v) => v.habit.kind !== 'limit').length;
  const doneCount = views.filter((v) => v.state === 'done').length;

  const renderRow = (v: HabitView) => (
    <HabitRow
      key={v.habit.id}
      view={v}
      today={today}
      weekStart={weekStart}
      onTap={() => onTap(v)}
      onOpen={() => router.push({ pathname: '/habit/[id]', params: { id: v.habit.id } })}
      onLongPress={() => onLongPress(v)}
    />
  );

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title={t('today.title')}
        subtitle={formatDay(today, { month: 'long', day: 'numeric', weekday: 'long' })}
        right={
          <>
            {views.length > 1 ? (
              <HeaderIconButton icon="swap-vertical" label={t('today.reorder')} onPress={() => router.push('/reorder')} />
            ) : null}
            <HeaderIconButton icon="options-outline" label={t('settings.recordSettings')} onPress={() => router.push('/settings/records')} />
            <HeaderIconButton icon="add" label={t('today.add')} onPress={() => router.push('/habit/new')} />
          </>
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        {views.length === 0 ? (
          <Suggestions today={today} />
        ) : (
          <>
            {dueCount > 0 ? (
              <View style={[styles.summary, { backgroundColor: theme.surface }]} accessibilityRole="summary">
                <Text style={[styles.summaryNumber, { color: theme.text }]}>
                  {doneCount}
                  <Text style={[styles.summaryOf, { color: theme.textSecondary }]}> / {dueCount}</Text>
                </Text>
                <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('today.summary')}</Text>
                <View style={[styles.progress, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(doneCount / dueCount) * 100}%` }]} />
                </View>
              </View>
            ) : null}
            <NotificationCard />
            <View style={styles.list}>{active.map(renderRow)}</View>
            {later.length > 0 ? (
              <View style={styles.list}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t('today.later')}</Text>
                {later.map(renderRow)}
              </View>
            ) : null}
            <Pressable
              onPress={() => router.push('/habit/new')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.addRow, { borderColor: theme.divider, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.addText, { color: theme.textSecondary }]}>＋ {t('today.add')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
      {undo ? (
        <View style={[styles.undoWrap, { bottom: insets.bottom + 90 }]} pointerEvents="box-none">
          <UndoBar
            message={undo.message}
            onUndo={() => {
              undoTap(undo.habitId, undo.day, undo.previous);
              showUndo(null);
            }}
            onNote={() => {
              showUndo(null);
              router.push({ pathname: '/entry', params: { habitId: undo.habitId, day: undo.day, focus: 'note' } });
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.m, gap: spacing.m },
  summary: { borderRadius: radius.l, padding: spacing.m, gap: spacing.xs },
  summaryNumber: { fontSize: 34, fontWeight: '800' },
  summaryOf: { fontSize: 20, fontWeight: '700' },
  summaryLabel: { fontSize: 14 },
  progress: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: spacing.s },
  progressFill: { height: 6, borderRadius: 3 },
  list: { gap: spacing.s },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginLeft: spacing.s, marginTop: spacing.s },
  addRow: { borderRadius: radius.l, borderWidth: 1.5, borderStyle: 'dashed', padding: spacing.m, alignItems: 'center' },
  addText: { fontSize: 16, fontWeight: '600' },
  undoWrap: { position: 'absolute', left: spacing.m, right: spacing.m },
});
