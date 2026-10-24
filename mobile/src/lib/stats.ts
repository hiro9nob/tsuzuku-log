// 連続記録・達成率・日ごとの状態の計算
// 「休んでも途切れない」：お休みの日と、予定のない日は連続を切らない。まだ終わっていない日（期間）も切らない
// 「過去は変わらない」：目標や頻度を変えても、終わった日（期間）は、そのとき使っていた決まりで判定する（habit.rules）
// このファイルは React Native に依存させない（単体テストのため）

import {
  addDays,
  addMonths,
  dayRange,
  diffDays,
  monthEndOf,
  monthStartOf,
  weekdayOf,
  weekStartOf,
  type Day,
  type WeekStart,
} from './day';
import { isDone, milestoneKey, type Entry, type EntryMap, type Habit, type HabitRule, type Schedule } from './habit';

export type StreakUnit = 'day' | 'week' | 'month';

/** 値は小数第2位まで扱う（habit.ts の入力の検証と合わせる） */
export function roundAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

export type UnitState = 'success' | 'fail' | 'skip' | 'pending';

/** 連続を数える単位（日、週、月）と、その結果 */
export type Unit = { start: Day; end: Day; unit: StreakUnit; state: UnitState };

export type HabitLike = Pick<Habit, 'kind' | 'target' | 'limitPeriod' | 'startDay'> & {
  schedule: Schedule;
  endDay?: Day | null;
  /** 前の判定の決まり（古い順）。なければ、はじめからいまの決まり */
  rules?: readonly HabitRule[];
};

/** 判定の決まりが同じあいだ。habit はその決まりを当てたもの、from〜until がその決まりを使った日（until が null ならいままで） */
type Segment = { habit: HabitLike; from: Day; until: Day | null };

function segmentsOf(habit: HabitLike): Segment[] {
  const rules = habit.rules ?? [];
  if (rules.length === 0) return [{ habit, from: habit.startDay, until: null }];
  const out: Segment[] = [];
  let from = habit.startDay;
  for (const rule of rules) {
    if (rule.until < from) continue;
    const { kind, target, limitPeriod, schedule } = rule;
    out.push({ habit: { ...habit, kind, target, limitPeriod, schedule, rules: [] }, from, until: rule.until });
    from = addDays(rule.until, 1);
  }
  out.push({ habit: { ...habit, rules: [] }, from, until: null });
  return out;
}

/** その日に使っていた決まり */
function segmentOn(habit: HabitLike, day: Day): Segment {
  const segments = segmentsOf(habit);
  return segments.find((s) => s.until === null || day <= s.until) ?? segments[segments.length - 1];
}

/** その日に使っていた決まりを当てた習慣（過去の日の記録を直すときは、この決まりで扱う） */
export function habitOn<H extends HabitLike>(habit: H, day: Day): H {
  const rule = segmentOn(habit, day).habit;
  return rule === habit ? habit : { ...habit, kind: rule.kind, target: rule.target, limitPeriod: rule.limitPeriod, schedule: rule.schedule };
}

/** いまの決まりを使い始めた日 */
function currentFrom(habit: HabitLike): Day {
  const segments = segmentsOf(habit);
  return segments[segments.length - 1].from;
}

/** 期間限定の習慣で、終わりの日を過ぎたか */
export function hasEnded(habit: HabitLike, today: Day): boolean {
  return !!habit.endDay && habit.endDay < today;
}

function lastDayOf(habit: HabitLike, today: Day): Day {
  return habit.endDay && habit.endDay < today ? habit.endDay : today;
}

type Period = 'day' | 'week' | 'month';

function periodOf(habit: HabitLike): Period {
  if (habit.kind === 'limit') return habit.limitPeriod;
  if (habit.schedule.type === 'perWeek') return 'week';
  if (habit.schedule.type === 'perMonth') return 'month';
  return 'day';
}

export function streakUnitOf(habit: HabitLike): StreakUnit {
  return periodOf(habit);
}

function periodStart(day: Day, period: Period, weekStart: WeekStart): Day {
  if (period === 'week') return weekStartOf(day, weekStart);
  if (period === 'month') return monthStartOf(day);
  return day;
}

function periodEnd(start: Day, period: Period): Day {
  if (period === 'week') return addDays(start, 6);
  if (period === 'month') return monthEndOf(start);
  return start;
}

function nextPeriod(start: Day, period: Period): Day {
  if (period === 'week') return addDays(start, 7);
  if (period === 'month') return addMonths(start, 1);
  return addDays(start, 1);
}

/** 第何週か（1〜5） */
function weekOfMonth(day: Day): number {
  return Math.ceil(Number(day.slice(8, 10)) / 7);
}

/**
 * その日が予定の日か（日ごとの繰り返しだけ。週に何回・月に何回は、どの日でもよい）。
 * 「やってから N 日後」は、前にできた日から N 日たった日から予定になる（できるまで続く）
 */
export function isScheduledOn(habit: HabitLike, entries: EntryMap, day: Day): boolean {
  const { schedule, startDay } = habit;
  switch (schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return schedule.days.includes(weekdayOf(day));
    case 'interval': {
      // 数え始める日から every 日ごと（その日より前も同じ間隔で数える）
      const diff = diffDays(schedule.anchor ?? startDay, day);
      return ((diff % schedule.every) + schedule.every) % schedule.every === 0;
    }
    case 'monthlyWeekday': {
      if (!schedule.days.includes(weekdayOf(day))) return false;
      if (schedule.weeks.includes(weekOfMonth(day))) return true;
      // 最終：7日後が次の月なら、その月の最後のその曜日
      return schedule.weeks.includes(-1) && monthStartOf(addDays(day, 7)) !== monthStartOf(day);
    }
    case 'afterDone': {
      for (let i = 1; i < schedule.days; i++) {
        const before = addDays(day, -i);
        if (before < startDay) break;
        if (isDone(habit, entries.get(before))) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

function sumValues(entries: EntryMap, from: Day, to: Day): number {
  let total = 0;
  for (const day of dayRange(from, to)) {
    const e = entries.get(day);
    if (e?.status === 'done') total += e.value;
  }
  // 0.1 + 0.2 のような小数の誤差で上限を超えたことにならないよう、丸めてから比べる
  return roundAmount(total);
}

/** 習慣の始まりから today までの単位を、古い順に返す。決まりを変えたときは、決まりごとに区切って判定する */
export function evaluateUnits(habit: HabitLike, entries: EntryMap, today: Day, weekStart: WeekStart): Unit[] {
  if (habit.startDay > today) return [];
  const units: Unit[] = [];
  // 期間限定の習慣は、終わりの日までで数える
  const last = lastDayOf(habit, today);

  for (const segment of segmentsOf(habit)) {
    if (segment.from > last) break;
    // 決まりを変えて終わった区切り。最後の期間は途中で終わる
    const cut = segment.until !== null && segment.until < last;
    const segmentLast = cut ? segment.until! : last;
    const period = periodOf(segment.habit);
    for (let start = periodStart(segment.from, period, weekStart); start <= segmentLast; start = nextPeriod(start, period)) {
      const end = periodEnd(start, period);
      const from = start < segment.from ? segment.from : start;
      const to = end > segmentLast ? segmentLast : end;
      // 期間限定で終わった習慣は、最後の期間も終わったものとして決める
      const isCurrent = !cut && end >= today && last === today;
      const partial = start < segment.from || (cut && end > segmentLast);
      units.push({ start, end, unit: period, state: unitState(segment.habit, entries, from, to, isCurrent, partial) });
    }
  }
  return units;
}

function unitState(
  habit: HabitLike,
  entries: EntryMap,
  from: Day,
  to: Day,
  isCurrent: boolean,
  isPartial: boolean,
): UnitState {
  // 上限型：期間の合計が上限を超えたら切れる。終わった期間で超えていなければできた
  // （何も記録していない期間も、上限内としてできたにする。やらなかったことが成功なので、記録の手間をかけさせない）
  if (habit.kind === 'limit') {
    if (from === to && entries.get(from)?.status === 'rest') return 'skip';
    if (sumValues(entries, from, to) > habit.target) return 'fail';
    return isCurrent ? 'pending' : 'success';
  }

  const schedule = habit.schedule;
  if (schedule.type === 'perWeek' || schedule.type === 'perMonth') {
    let done = 0;
    let rest = 0;
    for (const day of dayRange(from, to)) {
      const e = entries.get(day);
      if (e?.status === 'rest') rest += 1;
      else if (isDone(habit, e)) done += 1;
    }
    // お休みの日は、必要な回数から引く
    const needed = schedule.times - rest;
    if (needed <= 0) return done > 0 ? 'success' : 'skip';
    if (done >= needed) return 'success';
    if (isCurrent) return 'pending';
    // 途中から始めた（決まりを変えて途中で終わった）期間は、届かなくても切らない
    return isPartial ? 'skip' : 'fail';
  }

  // 日ごと
  const entry = entries.get(from);
  if (isDone(habit, entry)) return 'success';
  if (entry?.status === 'rest') return 'skip';
  if (!isScheduledOn(habit, entries, from)) return 'skip';
  return isCurrent ? 'pending' : 'fail';
}

export type Streaks = { current: number; longest: number; unit: StreakUnit };

/** 連続はいまの単位で数える。単位を変える前の別の単位は、切れたときだけ連続を切る（足さない） */
export function streaksFromUnits(units: readonly Unit[], unit: StreakUnit): Streaks {
  let run = 0;
  let longest = 0;
  for (const u of units) {
    if (u.unit !== unit) {
      if (u.state === 'fail') run = 0;
    } else if (u.state === 'success') {
      run += 1;
      if (run > longest) longest = run;
    } else if (u.state === 'fail') {
      run = 0;
    }
  }
  return { current: run, longest, unit };
}

export function computeStreaks(habit: HabitLike, entries: EntryMap, today: Day, weekStart: WeekStart): Streaks {
  return streaksFromUnits(evaluateUnits(habit, entries, today, weekStart), streakUnitOf(habit));
}

/** 達成率（0〜1）。from〜to に重なる単位のうち、終わったものとできたもので数える。数えるものがなければ null */
export function completionRate(units: readonly Unit[], from: Day, to: Day): number | null {
  let success = 0;
  let total = 0;
  for (const u of units) {
    if (u.end < from || u.start > to) continue;
    if (u.state === 'success') {
      success += 1;
      total += 1;
    } else if (u.state === 'fail') {
      total += 1;
    }
  }
  return total === 0 ? null : success / total;
}

/** 点・カレンダー・ヒートマップに出す、日ごとの状態 */
export type DayStatus = 'done' | 'rest' | 'partial' | 'over' | 'missed' | 'open' | 'off' | 'none';

export function dayStatus(habit: HabitLike, entries: EntryMap, day: Day, today: Day, weekStart: WeekStart): DayStatus {
  if (day < habit.startDay || day > today || (habit.endDay && day > habit.endDay)) return 'none';
  const entry = entries.get(day);
  if (entry?.status === 'rest') return 'rest';
  // その日に使っていた決まりで見せる
  const segment = segmentOn(habit, day);
  habit = segment.habit;

  if (habit.kind === 'limit') {
    const period = habit.limitPeriod;
    const start = periodStart(day, period, weekStart);
    const from = start < segment.from ? segment.from : start;
    if (sumValues(entries, from, day) > habit.target) return 'over';
    return day === today ? 'open' : 'done';
  }

  if (isDone(habit, entry)) return 'done';
  if (habit.kind === 'count' && entry?.status === 'done' && entry.value > 0) return 'partial';
  if (!isScheduledOn(habit, entries, day)) return 'off';
  if (day === today) return 'open';
  // 週に何回・月に何回は、やらなかった日を「できなかった」とは見せない
  if (habit.schedule.type === 'perWeek' || habit.schedule.type === 'perMonth') return 'off';
  return 'missed';
}

/** きょうの一覧での扱い：due（きょうやる）、done（きょうできた）、later（きょうは予定がない・期間の回数は届いた） */
export type TodayState = 'due' | 'done' | 'rest' | 'later' | 'ended';

export function todayStateOf(habit: HabitLike, entries: EntryMap, today: Day, weekStart: WeekStart): TodayState {
  if (hasEnded(habit, today)) return 'ended';
  const entry = entries.get(today);
  if (entry?.status === 'rest') return 'rest';
  if (habit.kind === 'limit') return 'due';
  if (isDone(habit, entry)) return 'done';
  const schedule = habit.schedule;
  if (schedule.type === 'perWeek' || schedule.type === 'perMonth') {
    const units = evaluateUnits(habit, entries, today, weekStart);
    const current = units[units.length - 1];
    return current?.state === 'success' ? 'later' : 'due';
  }
  return isScheduledOn(habit, entries, today) ? 'due' : 'later';
}

/** 期間の合計（上限型の表示に使う） */
export function periodTotal(habit: HabitLike, entries: EntryMap, today: Day, weekStart: WeekStart): number {
  const period = habit.kind === 'limit' ? habit.limitPeriod : 'day';
  const start = periodStart(today, period, weekStart);
  const from = currentFrom(habit);
  return sumValues(entries, start < from ? from : start, today);
}

/**
 * 週に何回・月に何回の、いまの期間の進み具合。お休みの日は必要な回数から引く（unitState と同じ）。
 * それ以外の習慣は null
 */
export function periodProgress(
  habit: HabitLike,
  entries: EntryMap,
  today: Day,
  weekStart: WeekStart,
): { done: number; rest: number; times: number; needed: number } | null {
  const schedule = habit.schedule;
  if (habit.kind === 'limit' || (schedule.type !== 'perWeek' && schedule.type !== 'perMonth')) return null;
  const start = periodStart(today, periodOf(habit), weekStart);
  const from = currentFrom(habit);
  let done = 0;
  let rest = 0;
  for (const day of dayRange(start < from ? from : start, today)) {
    const e = entries.get(day);
    if (e?.status === 'rest') rest += 1;
    else if (isDone(habit, e)) done += 1;
  }
  return { done, rest, times: schedule.times, needed: Math.max(schedule.times - rest, 0) };
}

type RuleFields = Pick<HabitRule, 'kind' | 'target' | 'limitPeriod' | 'schedule'>;

function sameRule(a: RuleFields, b: RuleFields): boolean {
  const target = (r: RuleFields) => (r.kind === 'check' ? 1 : r.target);
  return a.kind === b.kind && target(a) === target(b) && a.limitPeriod === b.limitPeriod && JSON.stringify(a.schedule) === JSON.stringify(b.schedule);
}

/** 週（月）に何回の回数だけ、または上限型の上限だけを変えたか（いまの期間から新しい決まりにしてよい変更） */
function onlyPeriodGoalChanged(a: RuleFields, b: RuleFields): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'limit') return a.limitPeriod === b.limitPeriod;
  const s = a.schedule;
  const t = b.schedule;
  return a.target === b.target && (s.type === 'perWeek' || s.type === 'perMonth') && s.type === t.type;
}

/**
 * 判定の決まりを変えるときの、新しい「前の決まり」の一覧。終わった日・期間の判定が変わらないよう、いまの決まりを残す。
 * 週（月）に何回の回数だけ、または上限型の上限だけを変えたときは、いまの週（月）から新しい決まりにする（まだ決まっていない期間なので）。
 * それ以外は、きょうから新しい決まりにする（きのうまでの日の見え方を変えない）
 */
export function nextRules(current: HabitLike & RuleFields, next: RuleFields, today: Day, weekStart: WeekStart): HabitRule[] {
  const rules = [...(current.rules ?? [])];
  if (sameRule(current, next)) return rules;
  const period = periodOf(current);
  const until = period !== 'day' && onlyPeriodGoalChanged(current, next) ? addDays(periodStart(today, period, weekStart), -1) : addDays(today, -1);
  // いまの決まりを1日も使っていなければ、残さない（同じ日に何度も直したときなど）
  if (until < currentFrom(current)) return rules;
  const { kind, target, limitPeriod, schedule } = current;
  return [...rules, { until, kind, target, limitPeriod, schedule }];
}

// 節目のお祝い（連続の単位ごと）
export const MILESTONES: Record<StreakUnit, readonly number[]> = {
  day: [7, 30, 100, 365, 500, 1000],
  week: [4, 12, 26, 52, 104],
  month: [3, 6, 12, 24],
};

/** いまの連続が、まだお祝いしていない節目に届いたら、その節目を返す */
export function reachedMilestone(streaks: Streaks, celebrated: readonly string[]): number | null {
  const hit = MILESTONES[streaks.unit].includes(streaks.current) ? streaks.current : null;
  if (hit === null) return null;
  return celebrated.includes(milestoneKey(streaks.unit, hit)) ? null : hit;
}

// ---- 詳細統計（Pro） ----

/** 月ごとの達成率（古い順に months か月） */
export function monthlyRates(units: readonly Unit[], today: Day, months: number): { month: Day; rate: number | null }[] {
  const out: { month: Day; rate: number | null }[] = [];
  const thisMonth = monthStartOf(today);
  for (let i = months - 1; i >= 0; i--) {
    const start = addMonths(thisMonth, -i);
    out.push({ month: start, rate: completionRate(units, start, monthEndOf(start)) });
  }
  return out;
}

/** 曜日ごとの達成率（日ごとの習慣だけ。週に何回などは、できた日の割合） */
export function weekdayRates(units: readonly Unit[], from: Day, to: Day): (number | null)[] {
  const success = Array<number>(7).fill(0);
  const total = Array<number>(7).fill(0);
  for (const u of units) {
    if (u.start !== u.end || u.start < from || u.start > to) continue;
    const w = weekdayOf(u.start);
    if (u.state === 'success') {
      success[w] += 1;
      total[w] += 1;
    } else if (u.state === 'fail') {
      total[w] += 1;
    }
  }
  return total.map((t, i) => (t === 0 ? null : success[i] / t));
}

/** できた日の、曜日ごとの回数（週に何回などの習慣で使う） */
export function weekdayCounts(habit: HabitLike, entries: EntryMap, from: Day, to: Day): number[] {
  const counts = Array<number>(7).fill(0);
  for (const [day, e] of entries) {
    if (day < from || day > to) continue;
    if (isDone(segmentOn(habit, day).habit, e)) counts[weekdayOf(day)] += 1;
  }
  return counts;
}

/** 記録した時刻（0〜23時）の分布 */
export function hourCounts(recordedHours: readonly number[]): number[] {
  const counts = Array<number>(24).fill(0);
  for (const h of recordedHours) if (h >= 0 && h < 24) counts[h] += 1;
  return counts;
}

export function toEntryMap(entries: readonly Entry[]): Map<Day, Entry> {
  return new Map(entries.map((e) => [e.day, e]));
}
