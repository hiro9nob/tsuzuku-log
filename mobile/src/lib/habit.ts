// 習慣の型と、保存する値の読み書き
// このファイルは React Native に依存させない（単体テストのため）

import { isValidDay, type Day } from './day';

/**
 * 習慣の種類
 * - check：できた／できていない
 * - count：数値を積み上げて目標に届いたらできた（水 2000ml など）
 * - limit：上限型。期間の合計が上限以下ならできた（お酒は週3杯まで など）
 */
export type HabitKind = 'check' | 'count' | 'limit';

/** 上限型の期間 */
export type LimitPeriod = 'day' | 'week' | 'month';

/**
 * 繰り返し
 * - daily / weekdays / perWeek は無料
 * - Pro のカスタム繰り返し：interval（何日おき）、perMonth（月に何回）、
 *   monthlyWeekday（第何曜日。weeks は 1〜5 と -1 = 最終）、afterDone（やってから N 日後）
 */
export type Schedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'perWeek'; times: number }
  /** anchor：数え始める日（この日から every 日ごと）。始まりの日とは別に持つ（過去の日を記録して始まりの日が早まっても、予定の日がずれないように） */
  | { type: 'interval'; every: number; anchor?: Day }
  | { type: 'perMonth'; times: number }
  | { type: 'monthlyWeekday'; weeks: number[]; days: number[] }
  | { type: 'afterDone'; days: number };

export type ScheduleType = Schedule['type'];

export const PRO_SCHEDULES: readonly ScheduleType[] = ['interval', 'perMonth', 'monthlyWeekday', 'afterDone'];

/** 第何曜日に選べる週（-1 = 最終） */
export const MONTH_WEEKS = [1, 2, 3, 4, 5, -1] as const;

export function isProSchedule(schedule: Schedule): boolean {
  return PRO_SCHEDULES.includes(schedule.type);
}

/**
 * 通知。time は 'HH:MM'。days を指定すると、その曜日だけ（曜日ごとに違う時刻にするときに使う）。
 * 1つの習慣に1つまでは無料、2つ目からと曜日の指定は Pro
 */
export type Reminder = { time: string; days?: number[] };

export const FREE_REMINDERS = 1;

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: HabitColorId;
  kind: HabitKind;
  /** count：目標の値、limit：上限の値。check では 1 */
  target: number;
  /** 1回のタップで足す値 */
  step: number;
  unit: string;
  limitPeriod: LimitPeriod;
  schedule: Schedule;
  reminders: Reminder[];
  sortOrder: number;
  /** この日から数える */
  startDay: Day;
  /** Pro の期間限定：この日で終わる（null なら終わりなし） */
  endDay: Day | null;
  /** アーカイブした日（null ならアーカイブしていない） */
  archivedDay: Day | null;
  /** お祝いを出した節目（'day:7' のように単位つき。milestoneKey） */
  celebrated: string[];
  /** 前の判定の決まり（古い順）。いまの決まりは kind・target・limitPeriod・schedule */
  rules: HabitRule[];
  createdAt: string;
  updatedAt: string;
};

/**
 * 判定の決まり。目標や頻度を変えたとき、前の決まりを until（この日まで使った）と一緒に残す。
 * 終わった日や期間は、そのとき使っていた決まりで判定する（あとから変えても、過去の結果は変わらない）
 */
export type HabitRule = { until: Day; kind: HabitKind; target: number; limitPeriod: LimitPeriod; schedule: Schedule };

/** その日の記録。status が 'rest' ならお休み。value は count / limit の値（check は 1） */
export type Entry = { day: Day; status: 'done' | 'rest'; value: number };

export type EntryMap = ReadonlyMap<Day, Entry>;

// 習慣の色。無料は「テーマの色」（mono：画面ではテーマのアクセントの色。無料ならアイコンと同じ緑）だけで、6色は Pro。
// ライト用とダーク用の2組（mono の値は、テーマを使えないところ（ウィジェットの見本など）で使う）
// 6色の1つ目は青緑（teal）。デフォルトのテーマの緑（mono）と並ばないように、緑から替えた（2026-10-19）
export type HabitColorId = 'mono' | 'teal' | 'blue' | 'amber' | 'rose' | 'violet' | 'gray';

/** 無料の色。Pro でなくなったときも、この色で表示する（選んだ色は残す） */
export const FREE_HABIT_COLOR: HabitColorId = 'mono';

export const HABIT_COLORS: readonly { id: HabitColorId; light: string; dark: string }[] = [
  { id: 'mono', light: '#44734F', dark: '#8DBF9C' },
  { id: 'teal', light: '#2F7A78', dark: '#86C7C2' },
  { id: 'blue', light: '#3E6E9E', dark: '#8DB4DB' },
  { id: 'amber', light: '#8C6110', dark: '#E2B85C' },
  { id: 'rose', light: '#A94F6A', dark: '#E6A1B5' },
  { id: 'violet', light: '#6F5A9E', dark: '#B9A7E0' },
  { id: 'gray', light: '#5C5F66', dark: '#B4B7BD' },
];

/** 保存した色を読む。前の緑（green）は青緑にし、知らない値は無料の色にする */
export function toHabitColorId(value: unknown): HabitColorId {
  if (value === 'green') return 'teal';
  const found = HABIT_COLORS.find((c) => c.id === value);
  return found ? found.id : FREE_HABIT_COLOR;
}

/** 実際に表示する色 */
export function effectiveHabitColor(id: HabitColorId, isPro: boolean): HabitColorId {
  return isPro ? id : FREE_HABIT_COLOR;
}

export function habitColor(id: HabitColorId, dark: boolean): string {
  const c = HABIT_COLORS.find((x) => x.id === id) ?? HABIT_COLORS[0];
  return dark ? c.dark : c.light;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function parseTime(time: string): { hour: number; minute: number } {
  const m = TIME_PATTERN.exec(time);
  if (!m) return { hour: 9, minute: 0 };
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function isWeekdayList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** 保存された JSON から繰り返しを読む。読めなければ毎日 */
export function parseSchedule(raw: string | null | undefined): Schedule {
  try {
    const v = JSON.parse(raw ?? '') as Record<string, unknown>;
    switch (v?.type) {
      case 'daily':
        return { type: 'daily' };
      case 'weekdays': {
        const days = isWeekdayList(v.days) ? [...new Set(v.days)].sort() : [];
        return days.length > 0 ? { type: 'weekdays', days } : { type: 'daily' };
      }
      case 'perWeek':
        return { type: 'perWeek', times: clampInt(v.times, 1, 7, 3) };
      case 'interval': {
        const every = clampInt(v.every, 2, 30, 2);
        return isValidDay(v.anchor) ? { type: 'interval', every, anchor: v.anchor } : { type: 'interval', every };
      }
      case 'perMonth':
        return { type: 'perMonth', times: clampInt(v.times, 1, 31, 4) };
      case 'monthlyWeekday': {
        const weeks = Array.isArray(v.weeks) ? v.weeks.filter((w): w is number => (MONTH_WEEKS as readonly unknown[]).includes(w)) : [];
        const days = isWeekdayList(v.days) ? [...new Set(v.days)].sort() : [];
        return weeks.length > 0 && days.length > 0 ? { type: 'monthlyWeekday', weeks: [...new Set(weeks)].sort(), days } : { type: 'daily' };
      }
      case 'afterDone':
        return { type: 'afterDone', days: clampInt(v.days, 1, 60, 3) };
    }
  } catch {
    // 下で毎日にする
  }
  return { type: 'daily' };
}

export function parseReminders(raw: string | null | undefined): Reminder[] {
  try {
    const v: unknown = JSON.parse(raw ?? '');
    if (!Array.isArray(v)) return [];
    return v.flatMap((r: unknown) => {
      if (typeof r !== 'object' || r === null) return [];
      const { time, days } = r as Record<string, unknown>;
      if (!isValidTime(time)) return [];
      return isWeekdayList(days) && days.length > 0 ? [{ time, days: [...new Set(days)].sort() }] : [{ time }];
    });
  } catch {
    return [];
  }
}

/** 何日おきで、数え始める日がなければ fallback（始まりの日）を入れる */
export function withAnchor(schedule: Schedule, fallback: Day): Schedule {
  return schedule.type === 'interval' && !schedule.anchor ? { ...schedule, anchor: fallback } : schedule;
}

/** 節目の単位（連続を数える単位と同じ） */
export type MilestoneUnit = 'day' | 'week' | 'month';

/** お祝いを出した節目の記録。単位ごとに分ける（12週と12か月を別の節目にする） */
export function milestoneKey(unit: MilestoneUnit, n: number): string {
  return `${unit}:${n}`;
}

const MILESTONE_KEY = /^(day|week|month):\d+$/;

/** 保存された JSON からお祝いを出した節目を読む。数だけの古い形は fallback の単位で読む */
export function parseCelebrated(raw: string | null | undefined, fallback: MilestoneUnit): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? '');
    if (!Array.isArray(v)) return [];
    const keys = v.flatMap((x: unknown) => {
      if (typeof x === 'string' && MILESTONE_KEY.test(x)) return [x];
      if (typeof x === 'number' && Number.isInteger(x) && x > 0) return [milestoneKey(fallback, x)];
      return [];
    });
    return [...new Set(keys)];
  } catch {
    return [];
  }
}

export function parseNumberList(raw: string | null | undefined): number[] {
  try {
    const v: unknown = JSON.parse(raw ?? '');
    return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

/** Pro でないときに実際に使う通知（設定は残し、使うのは無料の範囲だけ） */
export function effectiveReminders(reminders: Reminder[], isPro: boolean): Reminder[] {
  if (isPro) return reminders;
  return reminders.slice(0, FREE_REMINDERS).map((r) => ({ time: r.time }));
}

/** 保存された JSON から前の判定の決まりを読む。読めないものは捨て、古い順に並べる */
export function parseRules(raw: string | null | undefined): HabitRule[] {
  try {
    const v: unknown = JSON.parse(raw ?? '');
    if (!Array.isArray(v)) return [];
    return v
      .flatMap((r: unknown): HabitRule[] => {
        if (typeof r !== 'object' || r === null) return [];
        const { until, kind, target, limitPeriod, schedule } = r as Record<string, unknown>;
        if (!isValidDay(until)) return [];
        if (kind !== 'check' && kind !== 'count' && kind !== 'limit') return [];
        if (typeof target !== 'number' || !Number.isFinite(target)) return [];
        const period: LimitPeriod = limitPeriod === 'week' || limitPeriod === 'month' ? limitPeriod : 'day';
        return [{ until, kind, target, limitPeriod: period, schedule: parseSchedule(JSON.stringify(schedule)) }];
      })
      .sort((a, b) => (a.until < b.until ? -1 : a.until > b.until ? 1 : 0));
  } catch {
    return [];
  }
}

/** 値として使えるか（0.01 以上、小数第2位まで） */
export function isAmount(n: number): boolean {
  return Number.isFinite(n) && n >= 0.01 && n <= 1_000_000 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;
}

/** その日の記録が「できた」か（limit はこの関数では見ない） */
export function isDone(habit: Pick<Habit, 'kind' | 'target'>, entry: Entry | undefined): boolean {
  if (!entry || entry.status !== 'done') return false;
  if (habit.kind === 'count') return Math.round(entry.value * 100) >= Math.round(habit.target * 100);
  return habit.kind === 'check';
}

/** 数値の表示（2,5 のような地域の書き方は Intl に任せる） */
export function formatAmount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
}
