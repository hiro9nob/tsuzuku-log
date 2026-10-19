import { parseCsv, parseDateCell, readImportCsv, toCsv } from '../csv';

describe('csv', () => {
  it('round-trips quotes, commas and newlines', () => {
    const rows = [
      ['date', 'habit', 'note'],
      ['2026-10-05', 'Read, "slowly"', 'line1\nline2'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('detects semicolons', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('parses dates in several formats', () => {
    expect(parseDateCell('2026/1/5')).toBe('2026-01-05');
    expect(parseDateCell('2026-10-05T07:00:00Z')).toBe('2026-10-05');
    expect(parseDateCell('05/10/2026')).toBeNull();
    expect(parseDateCell('2026-02-30')).toBeNull();
  });
});

describe('readImportCsv', () => {
  it('reads the long format with values, statuses and notes', () => {
    const csv = 'Date,Habit,Status,Value,Note\n2026-10-01,Water,done,1500,good\n2026-10-02,Water,rest,,\n2026-10-03,Water,0,,\n';
    expect(readImportCsv(csv)).toEqual([
      { habit: 'Water', day: '2026-10-01', status: 'done', value: 1500, note: 'good' },
      { habit: 'Water', day: '2026-10-02', status: 'rest', value: 0, note: '' },
    ]);
  });

  it('reads the wide format', () => {
    const csv = '日付,読書,散歩\n2026/10/01,1,0\n2026/10/02,✓,1\n';
    expect(readImportCsv(csv)).toEqual([
      { habit: '読書', day: '2026-10-01', status: 'done', value: 1, note: '' },
      { habit: '読書', day: '2026-10-02', status: 'done', value: 1, note: '' },
      { habit: '散歩', day: '2026-10-02', status: 'done', value: 1, note: '' },
    ]);
  });

  it('returns null without a date column', () => {
    expect(readImportCsv('foo,bar\n1,2')).toBeNull();
  });
});

describe('readImportCsv value column', () => {
  it('treats zero or empty values as not done when there is no status column', () => {
    const csv = 'date,habit,value\n2026-10-19,Read,0\n2026-10-20,Read,\n2026-10-21,Read,2\n';
    expect(readImportCsv(csv)).toEqual([{ habit: 'Read', day: '2026-10-21', status: 'done', value: 2, note: '' }]);
  });
});

describe('readImportCsv status and value', () => {
  it('a done status with a zero value is not done; an empty value counts once', () => {
    const csv = 'date,habit,status,value\n2026-10-19,Read,done,0\n2026-10-20,Read,done,\n';
    expect(readImportCsv(csv)).toEqual([{ habit: 'Read', day: '2026-10-20', status: 'done', value: 1, note: '' }]);
  });
});
