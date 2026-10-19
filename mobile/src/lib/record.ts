// 記録したあとの共通の処理（振動、通知の予約し直し、節目のお祝い、レビューのお願い）
import * as Haptics from 'expo-haptics';

import type { Day, WeekStart } from './day';
import { isDone, type Entry, type Habit } from './habit';
import { addToEntry, entriesOf, getEntry, markCelebrated, setEntry } from './habits';
import { scheduleReschedule } from './notifications';
import { useSettings } from './settings';
import { computeStreaks, MILESTONES, reachedMilestone } from './stats';
import { askReviewAfterFirstCompletion, noteCelebrationShown, reviewAskedOn } from './storeReview';

export type TapResult = {
  /** 取り消すときに戻す記録（null なら記録がなかった） */
  previous: Omit<Entry, 'day'> | null;
  /** この記録で節目に届いたら、その節目 */
  milestone: number | null;
  /** 記録を消した（できた → 取り消し）か */
  cleared: boolean;
};

/**
 * きょうの習慣ができたあとに呼ぶ。節目に届いたら（まだお祝いしていなければ）その節目を返す。
 * 節目でなければ、レビューのお願い（1回だけ）を確かめる。
 * habit は Pro でないときの置き換えを済ませたもの（useEffectiveHabit）を渡す
 */
export function afterCompletion(habit: Habit, today: Day, weekStart: WeekStart): number | null {
  const map = new Map(entriesOf(habit.id).map((e) => [e.day, e]));
  const hit = reachedMilestone(computeStreaks(habit, map, today, weekStart), habit.celebrated);
  if (hit !== null) {
    // 同じ節目では二度と出さない。お祝いを止めているときも、出したことにする
    markCelebrated(habit, hit);
    // レビューのお願いと同じ日には重ねない
    if (useSettings.getState().celebrations && !reviewAskedOn(today)) {
      noteCelebrationShown(today);
      return hit;
    }
    return null;
  }
  askReviewAfterFirstCompletion(today);
  return null;
}

/**
 * check：できた ↔ 記録なし を切り替える。count / limit：1回分（step）を足す。
 * habit は Pro でないときの置き換えを済ませたもの（useEffectiveHabit）を渡す
 */
export function tapHabit(habit: Habit, today: Day, weekStart: WeekStart): TapResult {
  const prev = getEntry(habit.id, today);
  const previous = prev ? { status: prev.status, value: prev.value } : null;
  const wasDone = isDone(habit, prev ?? undefined);

  let next: Omit<Entry, 'day'> | null;
  if (habit.kind === 'check') {
    next = prev?.status === 'done' ? null : { status: 'done', value: 1 };
    setEntry(habit.id, today, next);
  } else {
    addToEntry(habit.id, today, habit.step);
    const after = getEntry(habit.id, today);
    next = after ? { status: after.status, value: after.value } : null;
  }
  scheduleReschedule();

  const nowDone = isDone(habit, next ? { ...next, day: today } : undefined);
  void Haptics.impactAsync(nowDone && !wasDone ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const milestone = nowDone && !wasDone ? afterCompletion(habit, today, weekStart) : null;
  return { previous, milestone, cleared: next === null };
}

/**
 * 上限型の節目。上限型は期間が終わってはじめて「できた」が決まるので、記録したときではなく、
 * きょうの画面を開いたときに確かめる。開かなかった日に節目を過ぎていても、まだお祝いしていない一番大きな節目を1回だけ出す
 */
export function checkLimitMilestones(
  views: readonly { habit: Habit; entries: ReadonlyMap<Day, Entry> }[],
  today: Day,
  weekStart: WeekStart,
): { habitId: string; milestone: number } | null {
  for (const { habit, entries } of views) {
    if (habit.kind !== 'limit') continue;
    const streaks = computeStreaks(habit, entries, today, weekStart);
    const due = MILESTONES[streaks.unit].filter((m) => m <= streaks.current && !habit.celebrated.includes(m));
    if (due.length === 0) continue;
    for (const m of due) markCelebrated({ ...habit, celebrated: [...habit.celebrated, ...due.filter((x) => x < m)] }, m);
    const milestone = due[due.length - 1];
    if (useSettings.getState().celebrations && !reviewAskedOn(today)) {
      noteCelebrationShown(today);
      return { habitId: habit.id, milestone };
    }
  }
  return null;
}

export function undoTap(habitId: string, day: Day, previous: TapResult['previous']): void {
  setEntry(habitId, day, previous);
  scheduleReschedule();
}
