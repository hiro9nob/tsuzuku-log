// 記録・取り消し・節目の確かめ（DB は lib/habits.ts をメモリの偽物に差し替える）
import type { Day } from '../day';
import type { Entry, Habit } from '../habit';

type Row = Omit<Entry, 'day'>;

const mockDb = {
  habits: new Map<string, Habit>(),
  entries: new Map<string, Map<Day, Row>>(),
  activeDays: 0,
};

jest.mock('expo-haptics', () => ({
  impactAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));
jest.mock('../notifications', () => ({ scheduleReschedule: () => {} }));
jest.mock('../settings', () => ({ useSettings: { getState: () => ({ celebrations: true }) } }));
jest.mock('../storeReview', () => ({
  askReviewAfterCompletion: jest.fn(),
  noteCelebrationShown: () => {},
  reviewAskedOn: () => false,
}));
jest.mock('../habits', () => {
  const rows = (id: string) => {
    if (!mockDb.entries.has(id)) mockDb.entries.set(id, new Map());
    return mockDb.entries.get(id)!;
  };
  // 本物と同じく、つくる前の日を記録したら始まりの日を早める（何日おきの数え始める日は、いまの値を残す）
  const moveStart = (id: string, day: Day) => {
    const h = mockDb.habits.get(id)!;
    if (day >= h.startDay) return;
    const { withAnchor } = jest.requireActual('../habit');
    mockDb.habits.set(id, { ...h, startDay: day, schedule: withAnchor(h.schedule, h.startDay) });
  };
  return {
    getHabit: (id: string) => mockDb.habits.get(id) ?? null,
    getEntry: (id: string, day: Day) => {
      const r = rows(id).get(day);
      return r ? { day, ...r } : null;
    },
    entriesOf: (id: string) => [...rows(id)].map(([day, r]) => ({ day, ...r })),
    // 本物と同じく、0 以下の「できた」は消す
    setEntry: (id: string, day: Day, e: Row | null) => {
      if (e === null || (e.status === 'done' && e.value <= 0)) rows(id).delete(day);
      else {
        rows(id).set(day, e);
        moveStart(id, day);
      }
    },
    addToEntry: (id: string, day: Day, step: number) => {
      const r = rows(id).get(day);
      rows(id).set(day, { status: 'done', value: r?.status === 'done' ? r.value + step : step });
      moveStart(id, day);
    },
    markCelebrated: (id: string, keys: string[]) => {
      const cur = mockDb.habits.get(id)!;
      mockDb.habits.set(id, { ...cur, celebrated: [...new Set([...cur.celebrated, ...keys])] });
    },
    restoreHabitState: (id: string, s: { startDay: Day; celebrated: string[] }) => {
      mockDb.habits.set(id, { ...mockDb.habits.get(id)!, ...s });
    },
    earliestEntryDay: (id: string) => [...rows(id).keys()].sort()[0] ?? null,
    totals: () => ({ records: 0, activeDays: mockDb.activeDays }),
  };
});

// eslint-disable-next-line import/first
import { saveEntry, tapHabit, undoChange } from '../record';
// eslint-disable-next-line import/first
import { askReviewAfterCompletion } from '../storeReview';

function addHabit(extra: Partial<Habit> = {}): Habit {
  const h: Habit = {
    id: 'h',
    name: 'h',
    icon: 'book',
    color: 'mono',
    kind: 'check',
    target: 1,
    step: 1,
    unit: '',
    limitPeriod: 'day',
    schedule: { type: 'daily' },
    reminders: [],
    sortOrder: 0,
    startDay: '2026-10-15',
    endDay: null,
    archivedDay: null,
    celebrated: [],
    rules: [],
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
  mockDb.habits.set(h.id, h);
  return h;
}

const done = { status: 'done', value: 1 } as const;

beforeEach(() => {
  mockDb.habits.clear();
  mockDb.entries.clear();
  mockDb.activeDays = 0;
  jest.mocked(askReviewAfterCompletion).mockClear();
});

describe('undo', () => {
  it('restores the start day and the celebration added by the change', () => {
    addHabit();
    for (const d of ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']) saveEntry('h', d, done, '2026-10-20', 0);
    const r = saveEntry('h', '2026-10-14', done, '2026-10-20', 0);
    expect(r.milestone).toBe(7);
    expect(mockDb.habits.get('h')!.startDay).toBe('2026-10-14');
    expect(undoChange(r.undo!)).toBe(true);
    expect(mockDb.habits.get('h')!.startDay).toBe('2026-10-15');
    expect(mockDb.habits.get('h')!.celebrated).toEqual([]);
  });

  it('a stale undo keeps records made after it on other days', () => {
    addHabit();
    for (const d of ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']) saveEntry('h', d, done, '2026-10-20', 0);
    const first = saveEntry('h', '2026-10-14', done, '2026-10-20', 0);
    saveEntry('h', '2026-10-13', done, '2026-10-20', 0);
    expect(undoChange(first.undo!)).toBe(true);
    // 10-13 の記録が残っているので、始まりは 10-13。7 の節目は最初の操作で増えたので外れる
    expect(mockDb.habits.get('h')!.startDay).toBe('2026-10-13');
    expect(mockDb.habits.get('h')!.celebrated).toEqual([]);
  });

  it('does nothing when the same day was changed again, even back to the same value', () => {
    addHabit();
    const first = saveEntry('h', '2026-10-15', done, '2026-10-15', 0);
    saveEntry('h', '2026-10-15', { status: 'rest', value: 0 }, '2026-10-15', 0);
    saveEntry('h', '2026-10-15', done, '2026-10-15', 0);
    expect(undoChange(first.undo!)).toBe(false);
    expect(mockDb.entries.get('h')!.get('2026-10-15')).toEqual(done);
  });

  it('does nothing when the same day was changed again after the change', () => {
    addHabit({ kind: 'count', target: 10, step: 1 });
    const first = saveEntry('h', '2026-10-15', { status: 'done', value: 5 }, '2026-10-15', 0);
    saveEntry('h', '2026-10-15', { status: 'done', value: 8 }, '2026-10-15', 0);
    expect(undoChange(first.undo!)).toBe(false);
    expect(mockDb.entries.get('h')!.get('2026-10-15')).toEqual({ status: 'done', value: 8 });
  });

  it('undoing a tap that reached a milestone lets it be celebrated again', () => {
    addHabit({ startDay: '2026-10-14' });
    for (const d of ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19']) saveEntry('h', d, done, '2026-10-20', 0);
    const r = tapHabit(mockDb.habits.get('h')!, '2026-10-20', 0);
    expect(r.milestone).toBe(7);
    undoChange(r.undo!);
    expect(tapHabit(mockDb.habits.get('h')!, '2026-10-20', 0).milestone).toBe(7);
  });
});

describe('milestones after fixing the past', () => {
  it('celebrates the largest milestone reached when the streak jumps', () => {
    addHabit({ startDay: '2026-10-01' });
    for (let i = 1; i <= 31; i++) {
      const d = `2026-10-${String(i).padStart(2, '0')}`;
      if (d !== '2026-10-10') mockDb.entries.set('h', (mockDb.entries.get('h') ?? new Map()).set(d, done));
    }
    expect(saveEntry('h', '2026-10-10', done, '2026-10-31', 0).milestone).toBe(30);
    expect(mockDb.habits.get('h')!.celebrated).toEqual(['day:7', 'day:30']);
  });

  it('a rest day that fills a gap can reach a milestone, without asking for a review', () => {
    mockDb.activeDays = 10;
    // お休みの日は連続に数えないが、切りもしない。できた日 7 日がつながる
    addHabit({ startDay: '2026-10-13' });
    for (const d of ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']) {
      mockDb.entries.set('h', (mockDb.entries.get('h') ?? new Map()).set(d, done));
    }
    expect(saveEntry('h', '2026-10-16', { status: 'rest', value: 0 }, '2026-10-20', 0).milestone).toBe(7);
    saveEntry('h', '2026-10-21', { status: 'rest', value: 0 }, '2026-10-21', 0);
    expect(askReviewAfterCompletion).not.toHaveBeenCalled();
  });

  it('fixing an over-limit day can reach a milestone (days with no record count as within the limit)', () => {
    addHabit({ kind: 'limit', target: 1, startDay: '2026-10-01' });
    mockDb.entries.set('h', new Map([['2026-10-04', { status: 'done', value: 3 }]]));
    expect(saveEntry('h', '2026-10-04', { status: 'done', value: 1 }, '2026-10-08', 0).milestone).toBe(7);
  });

  it('deleting an over-limit record on a day that used the limit rule can reach a milestone', () => {
    // 10-01〜10-07 は1日の上限型、10-08 からチェック型。10-04 だけ上限を超えていた
    addHabit({
      startDay: '2026-10-01',
      rules: [{ until: '2026-10-07', kind: 'limit', target: 1, limitPeriod: 'day', schedule: { type: 'daily' } }],
    });
    mockDb.entries.set('h', new Map([['2026-10-04', { status: 'done', value: 3 }], ['2026-10-08', done]]));
    expect(saveEntry('h', '2026-10-04', null, '2026-10-09', 0).milestone).toBe(7);
  });

  it('a 0 is not kept', () => {
    addHabit({ kind: 'limit', target: 3 });
    saveEntry('h', '2026-10-15', { status: 'done', value: 0 }, '2026-10-15', 0);
    expect(mockDb.entries.get('h')!.has('2026-10-15')).toBe(false);
  });
});

describe('milestones have units', () => {
  it('a 12-week milestone does not block a 12-month milestone', () => {
    // 週に何回で 12 週を祝ったあと、月に何回に変えた習慣
    addHabit({ startDay: '2025-10-01', schedule: { type: 'perMonth', times: 1 }, celebrated: ['week:4', 'week:12'] });
    for (let m = 0; m < 11; m++) {
      const d = new Date(Date.UTC(2025, 9 + m, 10)).toISOString().slice(0, 10);
      mockDb.entries.set('h', (mockDb.entries.get('h') ?? new Map()).set(d, done));
    }
    // 12 か月目（2026-09）を記録して 12 か月連続（2026-10 はまだ途中なので数えない）
    const r = saveEntry('h', '2026-09-10', done, '2026-10-05', 0);
    expect(r.milestone).toBe(12);
    expect(mockDb.habits.get('h')!.celebrated).toContain('month:12');
  });
});

describe('every N days keeps its own start', () => {
  it('recording a day before the start does not shift an every-2-days schedule', () => {
    addHabit({ startDay: '2026-10-02', schedule: { type: 'interval', every: 2 } });
    saveEntry('h', '2026-10-01', done, '2026-10-05', 0);
    const h = mockDb.habits.get('h')!;
    expect(h.startDay).toBe('2026-10-01');
    expect(h.schedule).toEqual({ type: 'interval', every: 2, anchor: '2026-10-02' });
  });
});
