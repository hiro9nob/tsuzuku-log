// 習慣・記録・メモの読み書き（SQLite）
import { and, asc, desc, eq, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { entries, habits, notes, type HabitRow } from '@/db/schema';

import { addDays, isValidDay, type Day } from './day';
import {
  toHabitColorId,
  parseNumberList,
  parseReminders,
  parseSchedule,
  type Entry,
  type Habit,
  type HabitKind,
  type LimitPeriod,
} from './habit';
import { notifyDataChanged } from './revision';
import { newId, nowIso } from './time';

function toKind(v: string): HabitKind {
  return v === 'count' || v === 'limit' ? v : 'check';
}

function toLimitPeriod(v: string): LimitPeriod {
  return v === 'week' || v === 'month' ? v : 'day';
}

export function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    name: r.name,
    icon: r.icon,
    color: toHabitColorId(r.color),
    kind: toKind(r.kind),
    target: r.target,
    step: r.step,
    unit: r.unit,
    limitPeriod: toLimitPeriod(r.limitPeriod),
    schedule: parseSchedule(r.schedule),
    reminders: parseReminders(r.reminders),
    sortOrder: r.sortOrder,
    startDay: r.startDay,
    endDay: r.endDay && isValidDay(r.endDay) ? r.endDay : null,
    archivedDay: r.archivedDay && isValidDay(r.archivedDay) ? r.archivedDay : null,
    celebrated: parseNumberList(r.celebrated),
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

function inputColumns(input: HabitInput) {
  return {
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    kind: input.kind,
    target: input.kind === 'check' ? 1 : input.target,
    step: input.kind === 'check' ? 1 : input.step,
    unit: input.kind === 'check' ? '' : input.unit.trim(),
    limitPeriod: input.limitPeriod,
    schedule: JSON.stringify(input.schedule),
    reminders: JSON.stringify(input.reminders),
    endDay: input.endDay,
  };
}

export function createHabit(input: HabitInput, today: Day): string {
  const id = newId();
  const now = nowIso();
  const max = db.select({ v: sql<number>`coalesce(max(${habits.sortOrder}), -1)` }).from(habits).get()?.v ?? -1;
  db.insert(habits)
    .values({ id, ...inputColumns(input), pinned: 0, sortOrder: max + 1, startDay: today, celebrated: '[]', createdAt: now, updatedAt: now })
    .run();
  notifyDataChanged();
  return id;
}

export function updateHabit(id: string, input: HabitInput): void {
  db.update(habits).set({ ...inputColumns(input), updatedAt: nowIso() }).where(eq(habits.id, id)).run();
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

export function markCelebrated(habit: Habit, milestone: number): void {
  const next = [...new Set([...habit.celebrated, milestone])].sort((a, b) => a - b);
  db.update(habits).set({ celebrated: JSON.stringify(next) }).where(eq(habits.id, habit.id)).run();
  notifyDataChanged();
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

/** その日の記録を置き換える。null なら消す（「記録しない」） */
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
    // 習慣をつくる前の日を記録したら、その日から数える。
    // ただし「何日おき」は始まりの日が予定の基準なので動かさない（動かすと予定の日がずれる）
    const row = db.select({ startDay: habits.startDay, schedule: habits.schedule }).from(habits).where(eq(habits.id, habitId)).get();
    if (row && day < row.startDay && parseSchedule(row.schedule).type !== 'interval') {
      db.update(habits).set({ startDay: day }).where(eq(habits.id, habitId)).run();
    }
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
  const row = db.select({ startDay: habits.startDay, schedule: habits.schedule }).from(habits).where(eq(habits.id, habitId)).get();
  if (row && day < row.startDay && parseSchedule(row.schedule).type !== 'interval') {
    db.update(habits).set({ startDay: day }).where(eq(habits.id, habitId)).run();
  }
  notifyDataChanged();
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
