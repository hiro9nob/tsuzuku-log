// 見本のデータ（開発版だけ）。画面の確かめとスクリーンショットに使う
import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { entries, habits, notes } from '@/db/schema';

import { addDays, weekdayOf, type Day } from './day';
import type { HabitColorId, HabitKind, LimitPeriod, Schedule } from './habit';
import { listHabits, rowToHabit } from './habits';
import { i18n } from './i18n';
import { notifyDataChanged } from './revision';
import { computeStreaks, MILESTONES } from './stats';
import { newId } from './time';

const DAYS = 120;

/** 毎回同じ並びになる乱数（見本の見た目を固定する） */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Spec = {
  name: string;
  icon: string;
  color: HabitColorId;
  kind: HabitKind;
  target: number;
  step: number;
  unit: string;
  limitPeriod: LimitPeriod;
  schedule: Schedule;
  reminders: string[];
  /** 日ごとの記録を決める。null なら記録しない */
  record: (day: Day, i: number, rnd: () => number) => { status: 'done' | 'rest'; value: number } | null;
  note?: (day: Day, i: number) => string | null;
};

function specs(): Spec[] {
  const t = i18n.t.bind(i18n);
  return [
    {
      name: t('suggestions.water'),
      icon: 'water',
      color: 'blue',
      kind: 'count',
      target: 2000,
      step: 250,
      unit: t('units.ml'),
      limitPeriod: 'day',
      schedule: { type: 'daily' },
      reminders: ['10:00'],
      record: (_d, i, rnd) => {
        if (i === 0) return { status: 'done', value: 1250 };
        const v = Math.round((1500 + rnd() * 900) / 250) * 250;
        return rnd() < 0.08 ? null : { status: 'done', value: v };
      },
    },
    {
      name: t('suggestions.read'),
      icon: 'book',
      color: 'amber',
      kind: 'check',
      target: 1,
      step: 1,
      unit: '',
      limitPeriod: 'day',
      schedule: { type: 'daily' },
      reminders: ['21:30'],
      // 直近は連続中（お休みをはさむ）
      record: (_d, i, rnd) => {
        if (i === 0) return null;
        if (i === 5 || i === 33) return { status: 'rest', value: 0 };
        if (i < 40) return { status: 'done', value: 1 };
        return rnd() < 0.75 ? { status: 'done', value: 1 } : null;
      },
      note: (_d, i) => (i === 1 ? '寝る前に30ページ' : i === 6 ? '旅行の日はお休み' : i === 15 ? '1冊読み終えた' : null),
    },
    {
      name: t('suggestions.walk'),
      icon: 'walk',
      color: 'green',
      kind: 'check',
      target: 1,
      step: 1,
      unit: '',
      limitPeriod: 'day',
      schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] },
      reminders: ['07:30'],
      record: (d, i, rnd) => {
        const wd = weekdayOf(d);
        if (wd === 0 || wd === 6) return rnd() < 0.3 ? { status: 'done', value: 1 } : null;
        if (i === 0) return { status: 'done', value: 1 };
        return rnd() < 0.85 ? { status: 'done', value: 1 } : null;
      },
    },
    {
      name: t('suggestions.english'),
      icon: 'language',
      color: 'rose',
      kind: 'check',
      target: 1,
      step: 1,
      unit: '',
      limitPeriod: 'day',
      schedule: { type: 'perWeek', times: 3 },
      reminders: [],
      record: (d, _i, rnd) => ([1, 3, 5].includes(weekdayOf(d)) && rnd() < 0.9 ? { status: 'done', value: 1 } : null),
      note: (_d, i) => (i === 2 ? '単語アプリを20分' : null),
    },
    {
      name: t('suggestions.sleepEarly'),
      icon: 'moon',
      color: 'violet',
      kind: 'check',
      target: 1,
      step: 1,
      unit: '',
      limitPeriod: 'day',
      schedule: { type: 'daily' },
      reminders: ['23:00'],
      record: (_d, i, rnd) => (i === 0 ? null : rnd() < 0.6 ? { status: 'done', value: 1 } : null),
    },
    {
      name: t('suggestions.lessAlcohol'),
      icon: 'wine',
      color: 'gray',
      kind: 'limit',
      target: 3,
      step: 1,
      unit: t('units.drinks'),
      limitPeriod: 'week',
      schedule: { type: 'daily' },
      reminders: [],
      record: (d, _i, rnd) => (weekdayOf(d) === 5 || weekdayOf(d) === 6 ? (rnd() < 0.7 ? { status: 'done', value: 1 } : null) : null),
    },
  ];
}

/** 見本のデータを入れる（今のデータに足す）。お祝いが一度に出ないよう、届いている節目はお祝い済みにする */
export function seedDemoData(today: Day): void {
  const rnd = random(42);
  const start = addDays(today, -(DAYS - 1));
  const base = listHabits().length;
  const created: string[] = [];
  db.transaction((tx) => {
    specs().forEach((s, n) => {
      const id = newId();
      created.push(id);
      const now = new Date().toISOString();
      tx.insert(habits)
        .values({
          id,
          name: s.name,
          icon: s.icon,
          color: s.color,
          kind: s.kind,
          target: s.target,
          step: s.step,
          unit: s.unit,
          limitPeriod: s.limitPeriod,
          schedule: JSON.stringify(s.schedule),
          reminders: JSON.stringify(s.reminders.map((time) => ({ time }))),
          pinned: 0,
          sortOrder: base + n,
          startDay: start,
          endDay: null,
          celebrated: '[]',
          createdAt: now,
          updatedAt: now,
        })
        .run();
      for (let i = DAYS - 1; i >= 0; i--) {
        const day = addDays(today, -i);
        const r = s.record(day, i, rnd);
        if (r) {
          // 記録した時刻は、朝・夜に寄せてばらす（時間帯の分析の見本）
          const hour = [7, 8, 12, 19, 21, 22][Math.floor(rnd() * 6)];
          const at = new Date(`${day}T00:00:00`);
          at.setHours(hour, Math.floor(rnd() * 60));
          tx.insert(entries).values({ habitId: id, day, status: r.status, value: r.value, recordedAt: at.toISOString() }).run();
        }
        const text = s.note?.(day, i);
        if (text) tx.insert(notes).values({ id: newId(), habitId: id, day, text, createdAt: now, updatedAt: now }).run();
      }
    });
  });
  // 届いている節目はお祝い済みにする（今回足した習慣だけ）
  for (const row of db.select().from(habits).all().filter((r) => created.includes(r.id))) {
    const h = rowToHabit(row);
    const map = new Map(
      db
        .select()
        .from(entries)
        .all()
        .filter((e) => e.habitId === h.id)
        .map((e) => [e.day, { day: e.day, status: e.status === 'rest' ? ('rest' as const) : ('done' as const), value: e.value }]),
    );
    const s = computeStreaks(h, map, today, 0);
    const reached = MILESTONES[s.unit].filter((m) => m <= Math.max(s.longest, s.current));
    if (reached.length > 0) {
      db.update(habits)
        .set({ celebrated: JSON.stringify([...new Set([...h.celebrated, ...reached])]) })
        .where(eq(habits.id, h.id))
        .run();
    }
  }
  notifyDataChanged();
}
