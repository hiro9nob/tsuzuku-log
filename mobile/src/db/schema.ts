import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// docs/development.md「データ」

export const habits = sqliteTable('habits', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  kind: text('kind').notNull(),
  target: real('target').notNull().default(1),
  step: real('step').notNull().default(1),
  unit: text('unit').notNull().default(''),
  limitPeriod: text('limit_period').notNull().default('day'),
  /** JSON（lib/habit.ts の Schedule） */
  schedule: text('schedule').notNull(),
  /** JSON（lib/habit.ts の Reminder[]） */
  reminders: text('reminders').notNull().default('[]'),
  /** 使っていない（ピン留めは 2026-10-19 に廃止。並べ替えだけにした） */
  pinned: integer('pinned').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  startDay: text('start_day').notNull(),
  /** Pro の期間限定：この日で終わる */
  endDay: text('end_day'),
  /** アーカイブした日（しまった習慣。消さずに、きょう・通知・ウィジェットから外す）。null ならアーカイブしていない */
  archivedDay: text('archived_day'),
  /** JSON（お祝いを出した節目の数の配列） */
  celebrated: text('celebrated').notNull().default('[]'),
  /** JSON（lib/habit.ts の HabitRule[]。目標や頻度を変える前の判定の決まり） */
  rules: text('rules').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const entries = sqliteTable(
  'entries',
  {
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    /** 'done' | 'rest' */
    status: text('status').notNull(),
    value: real('value').notNull().default(1),
    /** 最後に記録した時刻（時間帯の分析に使う） */
    recordedAt: text('recorded_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.habitId, t.day] }), index('entries_day_idx').on(t.day)],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey().notNull(),
    habitId: text('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    day: text('day').notNull(),
    text: text('text').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => [uniqueIndex('notes_habit_day_idx').on(t.habitId, t.day)],
);

export type HabitRow = typeof habits.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
