import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HabitRow, useStreakLabel } from '@/components/HabitRow';
import { NotificationCard } from '@/components/NotificationCard';
import { HeaderIconButton, ScreenHeader } from '@/components/ScreenHeader';
import { Suggestions } from '@/components/Suggestions';
import { UndoBar } from '@/components/UndoBar';
import { useHabitViews, type HabitView } from '@/hooks/useHabits';
import { useToday } from '@/hooks/useToday';
import { showActionSheet, type SheetOption } from '@/lib/actionSheet';
import { usePendingCelebration } from '@/lib/celebration';
import { addDays, type Day } from '@/lib/day';
import { formatDay, formatValue } from '@/lib/format';
import { getHabit } from '@/lib/habits';
import { usePro } from '@/lib/pro';
import { checkLimitMilestones, decreaseHabit, saveEntry, tapHabit, undoChange, type UndoToken } from '@/lib/record';
import { useWeekStart } from '@/lib/settings';
import { streakUnitOf } from '@/lib/stats';
import { radius, spacing, useTheme } from '@/theme';

/**
 * 記録した直後の帯。undo があれば取り消せる（記録・始まりの日・お祝いを、操作の前に戻す）。
 * milestone があれば節目のお祝い（帯で控えめに祝い、シェアは帯から選ぶ。画面は切り替えない）
 */
type Undo = { habitId: string; day: Day; undo: UndoToken | null; message: string; milestone: number | null };

const UNDO_MS = 5000;
/** お祝いの帯は、少し長く出す */
const CELEBRATION_MS = 8000;

export default function TodayScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const weekStart = useWeekStart();
  const views = useHabitViews(today);
  const streakLabel = useStreakLabel();
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const showUndo = useCallback((next: Undo | null) => {
    if (timer.current) clearTimeout(timer.current);
    setUndo(next);
    if (next) timer.current = setTimeout(() => setUndo(null), next.milestone !== null ? CELEBRATION_MS : UNDO_MS);
  }, []);

  /** 節目のお祝いの帯を出す。取り消せるときは undo を渡す */
  const celebrate = useCallback(
    (habitId: string, milestone: number, day: Day, undo: UndoToken | null) => {
      // アーカイブした習慣（詳細から過去を直したとき）は一覧にないので、DB から読む
      const habit = views.find((v) => v.habit.id === habitId)?.habit ?? getHabit(habitId);
      if (!habit) return;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showUndo({
        habitId,
        day,
        undo,
        message: t('today.milestone', { name: habit.name, streak: streakLabel(milestone, streakUnitOf(habit)) }),
        milestone,
      });
    },
    [views, showUndo, t, streakLabel],
  );

  /** 記録した直後の帯（取り消す・ひとこと）を出す */
  const recorded = (habitId: string, day: Day, undo: UndoToken | null, message: string) =>
    showUndo({ habitId, day, undo, message, milestone: null });

  // ほかの画面（記録を直す画面）で節目に届いたら、戻ってきたこの画面で祝う
  useFocusEffect(
    useCallback(() => {
      const pending = usePendingCelebration.getState().value;
      if (!pending) return;
      usePendingCelebration.getState().set(null);
      celebrate(pending.habitId, pending.milestone, pending.undo?.day ?? today, pending.undo);
    }, [celebrate, today]),
  );

  // 上限型の節目は、きょうの画面を開いたときに確かめる
  // Pro かどうかを確かめ終えてから（期間限定の終わりの日などで、数え方が変わるため）
  const proReady = usePro((s) => s.ready);
  const limitChecked = useRef<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!proReady || limitChecked.current === today) return;
      limitChecked.current = today;
      const hit = checkLimitMilestones(views, today, weekStart);
      if (hit) celebrate(hit.habitId, hit.milestone, today, null);
    }, [proReady, views, today, weekStart, celebrate]),
  );

  const openEntry = (habitId: string, day: Day, focus?: 'note') =>
    router.push({ pathname: '/entry', params: { habitId, day, ...(focus ? { focus } : {}) } });

  const onTap = (view: HabitView) => {
    const result = tapHabit(view.habit, today, weekStart);
    if (result.milestone !== null) {
      celebrate(view.habit.id, result.milestone, today, result.undo);
      return;
    }
    recorded(view.habit.id, today, result.undo, result.cleared ? t('today.cleared', { name: view.habit.name }) : t('today.recorded', { name: view.habit.name }));
  };

  // 行の「…」と長押し：お休み、きのうを直す、きょうの記録とひとこと、並べ替え
  const onMenu = (view: HabitView) => {
    const { habit } = view;
    const entry = view.entries.get(today);
    const resting = entry?.status === 'rest';
    const options: SheetOption[] = [
      {
        label: resting ? t('today.unrest') : t('today.rest'),
        onPress: () => {
          // お休みで週の必要な回数が減って、連続が節目に届くこともある
          const result = saveEntry(habit.id, today, resting ? null : { status: 'rest', value: 0 }, today, weekStart);
          if (result.milestone !== null) celebrate(habit.id, result.milestone, today, result.undo);
          else if (!resting) recorded(habit.id, today, result.undo, t('today.rested', { name: habit.name }));
        },
      },
      { label: t('today.fixYesterday'), onPress: () => openEntry(habit.id, addDays(today, -1)) },
      { label: t('today.editToday'), onPress: () => openEntry(habit.id, today, 'note') },
    ];
    if (views.length > 1) options.push({ label: t('today.reorder'), onPress: () => router.push('/reorder') });
    showActionSheet(habit.name, options, t('common.cancel'));
  };

  // 記録の丸の長押し：数値・上限型は減らす・量を入れる。チェック型はメニューと同じ
  const onLongPressRecord = (view: HabitView) => {
    const { habit } = view;
    if (habit.kind === 'check') {
      onMenu(view);
      return;
    }
    const entry = view.entries.get(today);
    const value = entry?.status === 'done' ? entry.value : 0;
    const options: SheetOption[] = [];
    if (value > 0) {
      options.push({
        label: t('today.decrease', { step: formatValue(habit, habit.step) }),
        onPress: () => {
          const result = decreaseHabit(habit, today);
          recorded(habit.id, today, result.undo, t('today.recorded', { name: habit.name }));
        },
      });
    }
    options.push({ label: t('today.enterAmount'), onPress: () => openEntry(habit.id, today) });
    showActionSheet(habit.name, options, t('common.cancel'));
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
      onMenu={() => onMenu(v)}
      onLongPressRecord={() => onLongPressRecord(v)}
      onPressDay={(day) => openEntry(v.habit.id, day)}
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
            onUndo={
              undo.undo
                ? () => {
                    if (undo.undo) undoChange(undo.undo);
                    showUndo(null);
                  }
                : undefined
            }
            onNote={
              undo.milestone === null
                ? () => {
                    showUndo(null);
                    openEntry(undo.habitId, undo.day, 'note');
                  }
                : undefined
            }
            onShare={
              undo.milestone !== null
                ? () => {
                    const milestone = undo.milestone;
                    showUndo(null);
                    router.push({ pathname: '/share', params: { habitId: undo.habitId, milestone: String(milestone) } });
                  }
                : undefined
            }
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
