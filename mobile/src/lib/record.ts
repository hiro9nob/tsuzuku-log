// 記録したあとの共通の処理（振動、通知の予約し直し、節目のお祝い、レビューのお願い）
import * as Haptics from 'expo-haptics';

import type { Day, WeekStart } from './day';
import { isDone, milestoneKey, type Entry, type Habit } from './habit';
import { addToEntry, earliestEntryDay, entriesOf, getEntry, getHabit, markCelebrated, restoreHabitState, setEntry, totals } from './habits';
import { scheduleReschedule } from './notifications';
import { useSettings } from './settings';
import { computeStreaks, habitOn, MILESTONES, roundAmount, toEntryMap, type Streaks } from './stats';
import { askReviewAfterCompletion, noteCelebrationShown, reviewAskedOn } from './storeReview';

/**
 * レビューのお願いは、記録した日がこの日数になってから（1回だけ）。
 * 最初の1回では、続けられるアプリかどうかまだわからず、記録の直後の操作（取り消し、ひとこと）のじゃまにもなるため
 */
const REVIEW_AFTER_DAYS = 3;

/**
 * 取り消すときに使うもの。戻すのは、その操作で変えたものだけ：
 * - 記録（before に戻す。ただし、あとから同じ日の記録を直していたら取り消さない）
 * - 始まりの日（つくる前の日を記録すると早まる。残っている記録に合わせて戻す）
 * - お祝いを出した節目（この操作で増えたものだけ外す。お祝いを止めているときも記録するため）
 */
export type UndoToken = {
  habitId: string;
  day: Day;
  /** この操作の番号。同じ習慣・同じ日を、あとからまた変えたら取り消せない（同じ値に戻したときも） */
  seq: number;
  before: Omit<Entry, 'day'> | null;
  after: Omit<Entry, 'day'> | null;
  startDay: Day;
  celebrated: string[];
};

type Pending = { habitId: string; day: Day; before: Omit<Entry, 'day'> | null; startDay: Day; celebrated: string[] };

/** 習慣・日ごとの、最後に変えた操作の番号 */
let lastSeq = 0;
const latest = new Map<string, number>();
const keyOf = (habitId: string, day: Day) => `${habitId}|${day}`;

function entryOf(habitId: string, day: Day): Omit<Entry, 'day'> | null {
  const e = getEntry(habitId, day);
  return e ? { status: e.status, value: e.value } : null;
}

/** 記録を変える前に呼ぶ */
function begin(habitId: string, day: Day): Pending | null {
  const habit = getHabit(habitId);
  if (!habit) return null;
  return { habitId, day, before: entryOf(habitId, day), startDay: habit.startDay, celebrated: habit.celebrated };
}

/** 記録を変えたあと（節目を確かめたあと）に呼ぶ */
function finish(p: Pending | null): UndoToken | null {
  const habit = p && getHabit(p.habitId);
  if (!p || !habit) return null;
  const seq = ++lastSeq;
  latest.set(keyOf(p.habitId, p.day), seq);
  return { ...p, seq, after: entryOf(p.habitId, p.day), celebrated: habit.celebrated.filter((m) => !p.celebrated.includes(m)) };
}

function sameEntry(a: Omit<Entry, 'day'> | null, b: Omit<Entry, 'day'> | null): boolean {
  return a === null || b === null ? a === b : a.status === b.status && a.value === b.value;
}

/**
 * 取り消す。あとから同じ日の記録を変えていたら（ウィジェットなどアプリの外で変えたときも）、
 * 何もせず false を返す（新しい記録を消さないため）
 */
export function undoChange(token: UndoToken): boolean {
  const habit = getHabit(token.habitId);
  const key = keyOf(token.habitId, token.day);
  if (!habit || latest.get(key) !== token.seq || !sameEntry(entryOf(token.habitId, token.day), token.after)) return false;
  latest.delete(key);
  setEntry(token.habitId, token.day, token.before);
  // この操作で早まった始まりの日を戻す。ほかの日の記録で早まっていれば、その日まで
  let startDay = habit.startDay;
  if (startDay < token.startDay) {
    const earliest = earliestEntryDay(token.habitId);
    startDay = earliest !== null && earliest < token.startDay ? earliest : token.startDay;
  }
  restoreHabitState(token.habitId, { startDay, celebrated: habit.celebrated.filter((m) => !token.celebrated.includes(m)) });
  scheduleReschedule();
  return true;
}

export type RecordResult = {
  /** 取り消すときに使うもの */
  undo: UndoToken | null;
  /** この記録で節目に届いたら（お祝いを出すなら）、その節目 */
  milestone: number | null;
};

export type TapResult = RecordResult & {
  /** 記録を消した（できた → 取り消し）か */
  cleared: boolean;
};

/**
 * 記録を変えたあとに呼ぶ。節目に届いたら（まだお祝いしていなければ）その節目を返す。
 * 節目でなく askReview なら（習慣を完了したとき）、レビューのお願い（記録した日が REVIEW_AFTER_DAYS 日になってから、1回だけ）を確かめる
 */
function celebrateIfDue(habitId: string, today: Day, weekStart: WeekStart, askReview: boolean): number | null {
  const habit = getHabit(habitId);
  if (!habit) return null;
  const hit = dueMilestone(habit, computeStreaks(habit, toEntryMap(entriesOf(habitId)), today, weekStart));
  if (hit !== null) {
    // レビューのお願いと同じ日には重ねない
    if (useSettings.getState().celebrations && !reviewAskedOn(today)) {
      noteCelebrationShown(today);
      return hit;
    }
    return null;
  }
  if (askReview) {
    // 出す直前にも確かめる（待っているあいだに取り消して、日数が足りなくなったときは出さない）
    const eligible = () => totals().activeDays >= REVIEW_AFTER_DAYS;
    if (eligible()) askReviewAfterCompletion(today, eligible);
  }
  return null;
}

/**
 * check：できた ↔ 記録なし を切り替える。count / limit：1回分（step）を足す
 */
export function tapHabit(habit: Habit, today: Day, weekStart: WeekStart): TapResult {
  const pending = begin(habit.id, today);
  const prev = getEntry(habit.id, today);
  const wasDone = isDone(habit, prev ?? undefined);

  let next: Omit<Entry, 'day'> | null;
  if (habit.kind === 'check') {
    next = prev?.status === 'done' ? null : { status: 'done', value: 1 };
    setEntry(habit.id, today, next);
  } else {
    addToEntry(habit.id, today, habit.step);
    next = entryOf(habit.id, today);
  }
  scheduleReschedule();

  const nowDone = isDone(habit, next ? { ...next, day: today } : undefined);
  void Haptics.impactAsync(nowDone && !wasDone ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});

  const milestone = nowDone && !wasDone ? celebrateIfDue(habit.id, today, weekStart, true) : null;
  return { undo: finish(pending), milestone, cleared: next === null };
}

/**
 * まだお祝いしていない節目のうち、いまの連続で届いている一番大きなものを返し、届いているものをすべて祝ったことにする
 * （過去の記録を直して連続が一気に伸びたときも、間の節目を取り逃さない。同じ節目では二度と出さない。
 * お祝いを止めているときも、出したことにする）
 */
function dueMilestone(habit: Habit, streaks: Streaks): number | null {
  const due = MILESTONES[streaks.unit].filter((m) => m <= streaks.current && !habit.celebrated.includes(milestoneKey(streaks.unit, m)));
  if (due.length === 0) return null;
  markCelebrated(habit.id, due.map((m) => milestoneKey(streaks.unit, m)));
  return due[due.length - 1];
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
    const milestone = dueMilestone(habit, computeStreaks(habit, entries, today, weekStart));
    if (milestone === null) continue;
    if (useSettings.getState().celebrations && !reviewAskedOn(today)) {
      noteCelebrationShown(today);
      return { habitId: habit.id, milestone };
    }
  }
  return null;
}

/** 数値・上限型で、1回分（step）を減らす。0 以下になったら記録を消す */
export function decreaseHabit(habit: Habit, day: Day): RecordResult {
  const pending = begin(habit.id, day);
  const prev = getEntry(habit.id, day);
  const value = prev?.status === 'done' ? roundAmount(prev.value - habit.step) : 0;
  setEntry(habit.id, day, value > 0 ? { status: 'done', value } : null);
  scheduleReschedule();
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  return { undo: finish(pending), milestone: null };
}

/**
 * その日の記録を置き換える（きょうのお休み、点から開く「記録を直す」画面）。
 * 連続が節目に届いたら、その節目を返す。できたかどうかは、その日に使っていた決まりで見る。
 * お休みで抜けた日を埋めたときや、上限型の超えた記録を直したときも、連続がつながって節目に届くことがあるので確かめる
 * （レビューのお願いは、習慣を完了したときだけ）
 */
export function saveEntry(habitId: string, day: Day, entry: Omit<Entry, 'day'> | null, today: Day, weekStart: WeekStart): RecordResult {
  const pending = begin(habitId, day);
  const before = getEntry(habitId, day) ?? undefined;
  setEntry(habitId, day, entry);
  scheduleReschedule();
  let milestone: number | null = null;
  const habit = getHabit(habitId);
  if (habit && day <= today) {
    const rule = habitOn(habit, day);
    const completed =
      entry !== null && (rule.kind === 'limit' ? entry.status === 'done' : isDone(rule, { ...entry, day }) && !isDone(rule, before));
    if (completed) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // 連続がつながるのは、できたにしたとき・お休みにしたとき・上限型の記録を直したとき（超えた分を減らしたとき）
    const connects = completed || entry?.status === 'rest' || (entry === null && rule.kind === 'limit');
    if (connects) milestone = celebrateIfDue(habitId, today, weekStart, completed && rule.kind !== 'limit');
  }
  return { undo: finish(pending), milestone };
}

