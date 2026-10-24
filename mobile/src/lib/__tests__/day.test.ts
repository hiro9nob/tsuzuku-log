import { addDays, addMonths, dayOf, diffDays, localDateAt, monthEndOf, nextDayBoundary, weekStartOf } from '../day';

describe('dayOf', () => {
  it('uses the calendar day when the boundary is midnight', () => {
    expect(dayOf(new Date(2026, 9, 5, 0, 30), 0)).toBe('2026-10-05');
  });

  it('treats hours before the boundary as the previous day', () => {
    expect(dayOf(new Date(2026, 9, 5, 3, 59), 4)).toBe('2026-10-04');
    expect(dayOf(new Date(2026, 9, 5, 4, 0), 4)).toBe('2026-10-05');
    expect(dayOf(new Date(2026, 0, 1, 1, 0), 2)).toBe('2025-12-31');
  });
});

describe('nextDayBoundary', () => {
  it('returns the next boundary', () => {
    expect(nextDayBoundary(new Date(2026, 9, 5, 3, 0), 4)).toEqual(new Date(2026, 9, 5, 4, 0));
    expect(nextDayBoundary(new Date(2026, 9, 5, 5, 0), 4)).toEqual(new Date(2026, 9, 6, 4, 0));
  });
});

describe('calendar math', () => {
  it('adds days across months and leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-01', '2026-11-01')).toBe(31);
  });

  it('adds months and clamps the day', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(monthEndOf('2028-02-10')).toBe('2028-02-29');
  });

  it('finds the start of the week', () => {
    // 2026-10-07 は水曜
    expect(weekStartOf('2026-10-07', 0)).toBe('2026-10-04');
    expect(weekStartOf('2026-10-07', 1)).toBe('2026-10-05');
    expect(weekStartOf('2026-10-04', 1)).toBe('2026-09-28');
  });

  it('places early-morning times on the next calendar day', () => {
    expect(localDateAt('2026-10-05', 1, 30, 4)).toEqual(new Date(2026, 9, 6, 1, 30));
    expect(localDateAt('2026-10-05', 21, 0, 4)).toEqual(new Date(2026, 9, 5, 21, 0));
  });
});
