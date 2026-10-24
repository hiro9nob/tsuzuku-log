// 習慣・記録・メモの読み書き（SQLite）
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { entries, habits, notes, type HabitRow } from '@/db/schema';

import { addDays, isValidDay, type Day, type WeekStart } from './day';
import {
  toHabitColorId,
  parseCelebrated,
  parseReminders,
  parseRules,
  parseSchedule,
  type Entry,
  type Habit,
  type HabitKind,
  type LimitPeriod,
  type Schedule,
  withAnchor,
} from './habit';
import { notifyDataChanged } from './revision';
import { nextRules, streakUnitOf } from './stats';
import { newId, nowIso } from './time';

function toKind(v: string): HabitKind {
  return v === 'count' || v === 'limit' ? v : 'check';
}

function toLimitPeriod(v: string): LimitPeriod {
  return v === 'week' || v === 'month' ? v : 'day';
}

export function rowToHabit(r: HabitRow): Habit {
  const kind = toKind(r.kind);
  const limitPeriod = toLimitPeriod(r.limitPeriod);
  // 何日おきで数え始める日がない古い値は、始まりの日から数える
  const schedule = withAnchor(parseSchedule(r.schedule), r.startDay);
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: toHabitColorId(r.color),
    kind,
    target: r.target,
    step: r.step,
    unit: r.unit,
    limitPeriod,
    schedule,
    reminders: parseReminders(r.reminders),
    sortOrder: r.sortOrder,
    startDay: r.startDay,
    endDay: r.endDay && isValidDay(r.endDay) ? r.endDay : null,
    archivedDay: r.archivedDay && isValidDay(r.archivedDay) ? r.archivedDay : null,
    // 数だけの古い形は、いまの連続の単位として読む
    celebrated: parseCelebrated(r.celebrated, streakUnitOf({ kind, limitPeriod, schedule, target: r.target, startDay: r.startDay })),
    rules: parseRules(r.rules).map((rule) => ({ ...rule, schedule: withAnchor(rule.schedule, r.startDay) })),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** 使っている習慣（アーカイブしたものは入れない）。並べ替えの順 */
export function listHabits(): Habit[] {
  return listAllHabits().filter((h) => h.archivedDay === null);
}

/** アーカイブしたものも入れた、すべての習慣 */
export function listAllHabits(): Habit[] {
  return db.select().from(habits).orderBy(asc(habits.sortOrder), asc(habits.createdAt)).all().map(rowToHabit);
}

export function listArchivedHabits(): Habit[] {
  return listAllHabits()
    .filter((h) => h.archivedDay !== null)
    .sort((a, b) => (a.archivedDay! < b.archivedDay! ? 1 : -1));
}

/** アーカイブする（消さずにしまう）。きょう・振り返り・通知・ウィジェットから外れる */
export function archiveHabit(id: string, today: Day): void {
  db.update(habits).set({ archivedDay: today, updatedAt: nowIso() }).where(eq(habits.id, id)).run();
  notifyDataChanged();
}

/**
 * アーカイブから戻す。しまっていたあいだ（アーカイブした日〜きのう）の、記録のない日はお休みにする
 * （「休んでも途切れない」：しまっていたあいだに連続が切れないように）
 */
export function unarchiveHabit(id: string, today: Day): void {
  const h = getHabit(id);
  if (!h?.archivedDay) return;
  const archivedDay = h.archivedDay;
  const now = nowIso();
  db.transaction((tx) => {
    for (let d = archivedDay; d < today; d = addDays(d, 1)) {
      if (d < h.startDay) continue;
      tx.insert(entries).values({ habitId: id, day: d, status: 'rest', value: 0, recordedAt: now }).onConflictDoNothing().run();
    }
    tx.update(habits).set({ archivedDay: null, updatedAt: now }).where(eq(habits.id, id)).run();
  });
  notifyDataChanged();
}

/**
 * まとめてお休み（旅行など）。from〜to のあいだ、使っているすべての習慣の、まだ記録のない日をお休みにする。
 * 足した日数を返す
 */
export function restAll(from: Day, to: Day): number {
  const list = listHabits();
  const now = nowIso();
  let added = 0;
  db.transaction((tx) => {
    for (const h of list) {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (d < h.startDay) continue;
        const r = tx.insert(entries).values({ habitId: h.id, day: d, status: 'rest', value: 0, recordedAt: now }).onConflictDoNothing().run();
        added += r.changes;
      }
    }
  });
  notifyDataChanged();
  return added;
}

/** まとめてお休みを取り消す。from〜to のあいだのお休みだけを消す（できた記録はそのまま）。消した数を返す */
export function clearRestAll(from: Day, to: Day): number {
  const r = db
    .delete(entries)
    .where(and(eq(entries.status, 'rest'), sql`${entries.day} >= ${from}`, sql`${entries.day} <= ${to}`))
    .run();
  notifyDataChanged();
  return r.changes;
}

export function getHabit(id: string): Habit | null {
  const row = db.select().from(habits).where(eq(habits.id, id)).get();
  return row ? rowToHabit(row) : null;
}

export type HabitInput = Pick<
  Habit,
  'name' | 'icon' | 'color' | 'kind' | 'target' | 'step' | 'unit' | 'limitPeriod' | 'schedule' | 'reminders' | 'endDay'
>;

function inputColumns(input: HabitInput, schedule: Schedule) {
  return {
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    kind: input.kind,
    target: input.kind === 'check' ? 1 : input.target,
    step: input.kind === 'check' ? 1 : input.step,
    unit: input.kind === 'check' ? '' : input.unit.trim(),
    limitPeriod: input.limitPeriod,
    schedule: JSON.stringify(schedule),
    reminders: JSON.stringify(input.reminders),
    endDay: input.endDay,
  };
}

export function createHabit(input: HabitInput, today: Day): string {
  const id = newId();
  const now = nowIso();
  const max = db.select({ v: sql<number>`coalesce(max(${habits.sortOrder}), -1)` }).from(habits).get()?.v ?? -1;
  db.insert(habits)
    // 何日おきは、つくった日から数える
    .values({ id, ...inputColumns(input, withAnchor(input.schedule, today)), pinned: 0, sortOrder: max + 1, startDay: today, celebrated: '[]', createdAt: now, updatedAt: now })
    .run();
  notifyDataChanged();
  return id;
}

/**
 * 習慣を直す。記録のしかた・目標・頻度を変えたときは、前の決まりを残す
 * （終わった日・期間の判定を変えないため。stats.ts の nextRules）
 */
export function updateHabit(id: string, input: HabitInput, today: Day, weekStart: WeekStart): void {
  const current = getHabit(id);
  // 何日おきの数え始める日：同じ間隔のままなら前の日を引き継ぎ、新しく選んだり間隔を変えたりしたら、きょうから数える
  const prev = current?.schedule;
  const schedule =
    input.schedule.type === 'interval' && !input.schedule.anchor && prev?.type === 'interval' && prev.every === input.schedule.every
      ? { ...input.schedule, anchor: prev.anchor }
      : withAnchor(input.schedule, today);
  const columns = inputColumns(input, schedule);
  const rules = current ? nextRules(current, { kind: input.kind, target: columns.target, limitPeriod: input.limitPeriod, schedule }, today, weekStart) : [];
  db.update(habits)
    .set({ ...columns, rules: JSON.stringify(rules), updatedAt: nowIso() })
    .where(eq(habits.id, id))
    .run();
  notifyDataChanged();
}

export function deleteHabit(id: string): void {
  db.delete(habits).where(eq(habits.id, id)).run();
  notifyDataChanged();
}

/** 手動の並べ替え。ids の順に並べる */
export function reorderHabits(ids: readonly string[]): void {
  db.transaction((tx) => {
    ids.forEach((id, i) => tx.update(habits).set({ sortOrder: i }).where(eq(habits.id, id)).run());
  });
  notifyDataChanged();
}

/**
 * 始まりの日とお祝いを出した節目を、前の値に戻す（記録を取り消したとき。lib/record.ts の undoChange）。
 * 習慣をつくる前の日を記録すると始まりの日が早まり、節目に届くとお祝いの記録が増えるため
 */
export function restoreHabitState(habitId: string, state: { startDay: Day; celebrated: string[] }): void {
  db.update(habits)
    .set({ startDay: state.startDay, celebrated: JSON.stringify(state.celebrated) })
    .where(eq(habits.id, habitId))
    .run();
  notifyDataChanged();
}

/** お祝いを出した節目を足す（keys は milestoneKey。DB のいまの値に足す） */
export function markCelebrated(habitId: string, keys: string[]): void {
  const h = getHabit(habitId);
  if (!h) return;
  const next = [...new Set([...h.celebrated, ...keys])];
  db.update(habits).set({ celebrated: JSON.stringify(next) }).where(eq(habits.id, habitId)).run();
  notifyDataChanged();
}

/**
 * 習慣をつくる前の日（day）を記録したら、その日から数える。
 * 何日おきの数え始める日は、いまの値をはっきり保存してから動かす（始まりの日と一緒にずれないように。前の決まりも同じ）
 */
function moveStartDay(habitId: string, day: Day): void {
  const h = getHabit(habitId);
  if (!h || day >= h.startDay) return;
  db.update(habits)
    .set({ startDay: day, schedule: JSON.stringify(h.schedule), rules: JSON.stringify(h.rules) })
    .where(eq(habits.id, habitId))
    .run();
}

// ---- 記録 ----

export function entriesOf(habitId: string): Entry[] {
  return db
    .select({ day: entries.day, status: entries.status, value: entries.value })
    .from(entries)
    .where(eq(entries.habitId, habitId))
    .all()
    .map((r) => ({ day: r.day, status: r.status === 'rest' ? 'rest' : 'done', value: r.value }));
}

/** すべての習慣の記録（習慣の ID ごと） */
export function allEntries(): Map<string, Map<Day, Entry>> {
  const out = new Map<string, Map<Day, Entry>>();
  for (const r of db.select().from(entries).all()) {
    let m = out.get(r.habitId);
    if (!m) out.set(r.habitId, (m = new Map()));
    m.set(r.day, { day: r.day, status: r.status === 'rest' ? 'rest' : 'done', value: r.value });
  }
  return out;
}

export function getEntry(habitId: string, day: Day): Entry | null {
  const r = db
    .select()
    .from(entries)
    .where(and(eq(entries.habitId, habitId), eq(entries.day, day)))
    .get();
  return r ? { day: r.day, status: r.status === 'rest' ? 'rest' : 'done', value: r.value } : null;
}

/** その日の記録を置き換える。null なら消す（「記録しない」）。0 以下の「できた」も消す */
export function setEntry(habitId: string, day: Day, entry: Omit<Entry, 'day'> | null): void {
  if (entry === null || (entry.status === 'done' && entry.value <= 0)) {
    db.delete(entries).where(and(eq(entries.habitId, habitId), eq(entries.day, day))).run();
  } else {
    const recordedAt = nowIso();
    db.insert(entries)
      .values({ habitId, day, status: entry.status, value: entry.value, recordedAt })
      .onConflictDoUpdate({
        target: [entries.habitId, entries.day],
        set: { status: entry.status, value: entry.value, recordedAt },
      })
      .run();
    moveStartDay(habitId, day);
  }
  notifyDataChanged();
}

/**
 * 1回分（step）を足す。ウィジェットと同時に足しても消えないよう、読み取りと書き込みを1つの SQL にする
 * （targets/widget/Store.swift の record と同じ）。お休みの日なら、できたにして step から始める
 */
export function addToEntry(habitId: string, day: Day, step: number): void {
  const recordedAt = nowIso();
  db.run(
    sql`INSERT INTO entries (habit_id, day, status, value, recorded_at) VALUES (${habitId}, ${day}, 'done', round(${step}, 2), ${recordedAt})
      ON CONFLICT(habit_id, day) DO UPDATE SET
        value = CASE WHEN entries.status = 'done' THEN round(entries.value + excluded.value, 2) ELSE excluded.value END,
        status = 'done', recorded_at = excluded.recorded_at`,
  );
  moveStartDay(habitId, day);
  notifyDataChanged();
}

/** いちばん古い記録の日（記録がなければ null） */
export function earliestEntryDay(habitId: string): Day | null {
  return db.select({ v: sql<string | null>`min(${entries.day})` }).from(entries).where(eq(entries.habitId, habitId)).get()?.v ?? null;
}

/** 記録した時刻（現地時刻の時）。時間帯の分析に使う */
export function recordedHours(habitId?: string): number[] {
  const rows = db
    .select({ at: entries.recordedAt })
    .from(entries)
    .where(habitId ? and(eq(entries.habitId, habitId), eq(entries.status, 'done')) : eq(entries.status, 'done'))
    .all();
  return rows.map((r) => new Date(r.at).getHours()).filter((h) => Number.isFinite(h));
}

// ---- メモ ----

export type Note = { id: string; habitId: string; day: Day; text: string; updatedAt: string };

export function noteOf(habitId: string, day: Day): Note | null {
  return (
    db
      .select({ id: notes.id, habitId: notes.habitId, day: notes.day, text: notes.text, updatedAt: notes.updatedAt })
      .from(notes)
      .where(and(eq(notes.habitId, habitId), eq(notes.day, day)))
      .get() ?? null
  );
}

/** その日のメモを保存する。空なら消す */
export function setNote(habitId: string, day: Day, text: string): void {
  const trimmed = text.trim();
  if (trimmed === '') {
    db.delete(notes).where(and(eq(notes.habitId, habitId), eq(notes.day, day))).run();
  } else {
    const now = nowIso();
    db.insert(notes)
      .values({ id: newId(), habitId, day, text: trimmed, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: [notes.habitId, notes.day], set: { text: trimmed, updatedAt: now } })
      .run();
  }
  notifyDataChanged();
}

function escapeLike(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** メモの一覧（新しい日から）。query があれば本文で絞る（Pro のメモの検索） */
export function listNotes({ habitId, query }: { habitId?: string; query?: string } = {}): Note[] {
  const conditions = [
    habitId ? eq(notes.habitId, habitId) : undefined,
    query && query.trim() !== '' ? sql`${notes.text} LIKE ${`%${escapeLike(query.trim())}%`} ESCAPE '\\'` : undefined,
  ].filter((c) => c !== undefined);
  const base = db
    .select({ id: notes.id, habitId: notes.habitId, day: notes.day, text: notes.text, updatedAt: notes.updatedAt })
    .from(notes);
  const filtered = conditions.length > 0 ? base.where(and(...conditions)) : base;
  return filtered.orderBy(desc(notes.day)).all();
}

// ---- マイページの数字 ----

export function totals(): { records: number; activeDays: number } {
  const r = db
    .select({
      records: sql<number>`count(*)`,
      activeDays: sql<number>`count(distinct ${entries.day})`,
    })
    .from(entries)
    .where(eq(entries.status, 'done'))
    .get();
  return { records: r?.records ?? 0, activeDays: r?.activeDays ?? 0 };
}
