import type { Entry, Schedule } from '../habit';
import {
  completionRate,
  computeStreaks,
  dayStatus,
  evaluateUnits,
  isScheduledOn,
  reachedMilestone,
  todayStateOf,
  toEntryMap,
  weekdayRates,
  type HabitLike,
} from '../stats';

function habit(schedule: Schedule, extra: Partial<HabitLike> = {}): HabitLike {
  return { kind: 'check', target: 1, limitPeriod: 'day', startDay: '2026-10-01', schedule, ...extra };
}

const done = (day: string, value = 1): Entry => ({ day, status: 'done', value });
const rest = (day: string): Entry => ({ day, status: 'rest', value: 0 });

describe('daily streaks', () => {
  const h = habit({ type: 'daily' });

  it('counts consecutive done days and keeps today open', () => {
    const entries = toEntryMap([done('2026-10-01'), done('2026-10-02'), done('2026-10-03')]);
    expect(computeStreaks(h, entries, '2026-10-04', 0)).toEqual({ current: 3, longest: 3, unit: 'day' });
  });

  it('rest days do not break the streak', () => {
    const entries = toEntryMap([done('2026-10-01'), rest('2026-10-02'), done('2026-10-03')]);
    expect(computeStreaks(h, entries, '2026-10-03', 0).current).toBe(2);
  });

  it('a missed past day breaks the streak', () => {
    const entries = toEntryMap([done('2026-10-01'), done('2026-10-03'), done('2026-10-04')]);
    expect(computeStreaks(h, entries, '2026-10-04', 0)).toEqual({ current: 2, longest: 2, unit: 'day' });
  });

  it('nothing before the start day', () => {
    expect(evaluateUnits(h, new Map(), '2026-09-30', 0)).toEqual([]);
  });
});

describe('weekday schedules', () => {
  // 2026-10-05 は月曜
  const h = habit({ type: 'weekdays', days: [1, 3, 5] }, { startDay: '2026-10-05' });

  it('unscheduled days are skipped', () => {
    const entries = toEntryMap([done('2026-10-05'), done('2026-10-07'), done('2026-10-09')]);
    expect(computeStreaks(h, entries, '2026-10-11', 0).current).toBe(3);
  });

  it('done on an unscheduled day counts as a bonus', () => {
    const entries = toEntryMap([done('2026-10-05'), done('2026-10-06'), done('2026-10-07')]);
    expect(computeStreaks(h, entries, '2026-10-07', 0).current).toBe(3);
  });
});

describe('interval schedules', () => {
  const h = habit({ type: 'interval', every: 3 });

  it('only every third day is required', () => {
    const entries = toEntryMap([done('2026-10-01'), done('2026-10-04'), done('2026-10-07')]);
    expect(computeStreaks(h, entries, '2026-10-09', 0).current).toBe(3);
  });
});

describe('per-week schedules', () => {
  // 2026-10-04 は日曜。週の始まりは日曜
  const h = habit({ type: 'perWeek', times: 2 }, { startDay: '2026-10-04' });

  it('counts weeks that reached the target', () => {
    const entries = toEntryMap([done('2026-10-05'), done('2026-10-06'), done('2026-10-12'), done('2026-10-15')]);
    expect(computeStreaks(h, entries, '2026-10-19', 0)).toEqual({ current: 2, longest: 2, unit: 'week' });
  });

  it('a week that missed the target breaks the streak', () => {
    const entries = toEntryMap([done('2026-10-05'), done('2026-10-06'), done('2026-10-12'), done('2026-10-19'), done('2026-10-20')]);
    expect(computeStreaks(h, entries, '2026-10-20', 0)).toEqual({ current: 1, longest: 1, unit: 'week' });
  });

  it('rest days reduce the required count', () => {
    const entries = toEntryMap([done('2026-10-05'), rest('2026-10-06')]);
    expect(evaluateUnits(h, entries, '2026-10-11', 0)[0].state).toBe('success');
  });

  it('a partial first week does not fail', () => {
    const late = habit({ type: 'perWeek', times: 3 }, { startDay: '2026-10-09' });
    const entries = toEntryMap([done('2026-10-09'), done('2026-10-12'), done('2026-10-13'), done('2026-10-14')]);
    expect(computeStreaks(late, entries, '2026-10-18', 0).current).toBe(1);
  });

  it('respects Monday as the start of the week', () => {
    const units = evaluateUnits(h, new Map(), '2026-10-06', 1);
    expect(units[0].start).toBe('2026-09-28');
  });

  it('later once the week target is reached', () => {
    const entries = toEntryMap([done('2026-10-05'), done('2026-10-06')]);
    expect(todayStateOf(h, entries, '2026-10-07', 0)).toBe('later');
  });
});

describe('count habits', () => {
  const h = habit({ type: 'daily' }, { kind: 'count', target: 2000 });

  it('is done only when the target is reached', () => {
    const entries = toEntryMap([done('2026-10-01', 2000), done('2026-10-02', 500)]);
    expect(dayStatus(h, entries, '2026-10-01', '2026-10-03', 0)).toBe('done');
    expect(dayStatus(h, entries, '2026-10-02', '2026-10-03', 0)).toBe('partial');
    expect(computeStreaks(h, entries, '2026-10-03', 0).current).toBe(0);
  });
});

describe('limit habits', () => {
  it('weekly limit fails when the total goes over', () => {
    const h = habit({ type: 'daily' }, { kind: 'limit', target: 3, limitPeriod: 'week', startDay: '2026-10-04' });
    const entries = toEntryMap([done('2026-10-05', 2), done('2026-10-12', 2), done('2026-10-13', 2)]);
    const units = evaluateUnits(h, entries, '2026-10-20', 0);
    expect(units.map((u) => u.state)).toEqual(['success', 'fail', 'pending']);
    expect(dayStatus(h, entries, '2026-10-13', '2026-10-20', 0)).toBe('over');
    expect(dayStatus(h, entries, '2026-10-12', '2026-10-20', 0)).toBe('done');
  });

  it('daily limit counts days within the limit', () => {
    const h = habit({ type: 'daily' }, { kind: 'limit', target: 1, limitPeriod: 'day' });
    const entries = toEntryMap([done('2026-10-02', 1)]);
    expect(computeStreaks(h, entries, '2026-10-04', 0).current).toBe(3);
  });
});

describe('rates', () => {
  it('ignores pending and skipped units', () => {
    const h = habit({ type: 'daily' });
    const entries = toEntryMap([done('2026-10-01'), rest('2026-10-02'), done('2026-10-04')]);
    const units = evaluateUnits(h, entries, '2026-10-05', 0);
    // 10/1 できた、10/2 お休み、10/3 できなかった、10/4 できた、10/5 まだ
    expect(completionRate(units, '2026-10-01', '2026-10-31')).toBeCloseTo(2 / 3);
    expect(completionRate(units, '2026-11-01', '2026-11-30')).toBeNull();
  });

  it('weekday rates', () => {
    const h = habit({ type: 'daily' }, { startDay: '2026-10-04' });
    const entries = toEntryMap([done('2026-10-04'), done('2026-10-05')]);
    const units = evaluateUnits(h, entries, '2026-10-12', 0);
    const rates = weekdayRates(units, '2026-10-01', '2026-10-31');
    expect(rates[0]).toBe(0.5);
    expect(rates[1]).toBe(1);
    expect(rates[2]).toBe(0);
  });
});

describe('milestones', () => {
  it('fires once per milestone', () => {
    expect(reachedMilestone({ current: 7, longest: 7, unit: 'day' }, [])).toBe(7);
    expect(reachedMilestone({ current: 7, longest: 7, unit: 'day' }, [7])).toBeNull();
    expect(reachedMilestone({ current: 8, longest: 8, unit: 'day' }, [])).toBeNull();
    expect(reachedMilestone({ current: 4, longest: 4, unit: 'week' }, [])).toBe(4);
  });
});

describe('decimal amounts', () => {
  it('0.1 + 0.2 does not go over a 0.3 limit', () => {
    const h = habit({ type: 'daily' }, { kind: 'limit', target: 0.3, limitPeriod: 'week', startDay: '2026-10-04' });
    const entries = toEntryMap([done('2026-10-05', 0.1), done('2026-10-06', 0.2)]);
    expect(evaluateUnits(h, entries, '2026-10-12', 0)[0].state).toBe('success');
  });
});

describe('nth weekday of the month', () => {
  // 2026-10 の日曜は 4, 11, 18, 25 日
  const h = habit({ type: 'monthlyWeekday', weeks: [2, -1], days: [0] });

  it('is scheduled on the 2nd and last Sunday only', () => {
    const map = new Map();
    expect(isScheduledOn(h, map, '2026-10-11')).toBe(true);
    expect(isScheduledOn(h, map, '2026-10-25')).toBe(true);
    expect(isScheduledOn(h, map, '2026-10-18')).toBe(false);
    expect(isScheduledOn(h, map, '2026-10-04')).toBe(false);
  });

  it('counts only those days in the streak', () => {
    const entries = toEntryMap([done('2026-10-11'), done('2026-10-25')]);
    expect(computeStreaks(h, entries, '2026-10-31', 0).current).toBe(2);
  });
});

describe('N days after done', () => {
  const h = habit({ type: 'afterDone', days: 3 });

  it('is not due again until N days after the last done day', () => {
    const entries = toEntryMap([done('2026-10-01')]);
    expect(isScheduledOn(h, entries, '2026-10-02')).toBe(false);
    expect(isScheduledOn(h, entries, '2026-10-03')).toBe(false);
    expect(isScheduledOn(h, entries, '2026-10-04')).toBe(true);
  });

  it('keeps the streak when done on time and breaks when overdue', () => {
    const onTime = toEntryMap([done('2026-10-01'), done('2026-10-04'), done('2026-10-07')]);
    expect(computeStreaks(h, onTime, '2026-10-08', 0).current).toBe(3);
    const late = toEntryMap([done('2026-10-01'), done('2026-10-05')]);
    expect(computeStreaks(h, late, '2026-10-06', 0).current).toBe(1);
  });
});

describe('limited period', () => {
  const h = { ...habit({ type: 'daily' }), endDay: '2026-10-03' };

  it('stops counting after the end day and reports ended', () => {
    const entries = toEntryMap([done('2026-10-01'), done('2026-10-02'), done('2026-10-03')]);
    expect(computeStreaks(h, entries, '2026-10-10', 0)).toEqual({ current: 3, longest: 3, unit: 'day' });
    expect(todayStateOf(h, entries, '2026-10-10', 0)).toBe('ended');
    expect(dayStatus(h, entries, '2026-10-05', '2026-10-10', 0)).toBe('none');
  });
});

describe('limited period with weekly units', () => {
  it('decides the last week on the end day, not at the end of the week', () => {
    // 2026-10-19 は月曜。週の始まりは月曜
    const h = { ...habit({ type: 'daily' }, { kind: 'limit', target: 3, limitPeriod: 'week', startDay: '2026-10-19' }), endDay: '2026-10-21' };
    const units = evaluateUnits(h, toEntryMap([done('2026-10-20', 1)]), '2026-10-22', 1);
    expect(units.map((u) => u.state)).toEqual(['success']);
  });

  it('supports the 5th weekday of the month', () => {
    // 2026-10 の木曜は 1, 8, 15, 22, 29 日
    const h = habit({ type: 'monthlyWeekday', weeks: [5], days: [4] });
    expect(isScheduledOn(h, new Map(), '2026-10-29')).toBe(true);
    expect(isScheduledOn(h, new Map(), '2026-10-22')).toBe(false);
  });
});
