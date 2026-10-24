// 日付の計算。1日の区切り（0時／2時／4時／6時）は設定で選べる
// このファイルは React Native に依存させない（単体テストのため）

/** 'YYYY-MM-DD'（グレゴリオ暦） */
export type Day = string;

/** 1日の区切りに選べる時刻 */
export const DAY_START_HOURS = [0, 2, 4, 6] as const;
export type DayStartHour = (typeof DAY_START_HOURS)[number];

/** 週の始まり（0 = 日曜、1 = 月曜） */
export type WeekStart = 0 | 1;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

function formatYmd(year: number, month: number, date: number): Day {
  return `${pad(year, 4)}-${pad(month)}-${pad(date)}`;
}

export function isDayStartHour(value: unknown): value is DayStartHour {
  return typeof value === 'number' && (DAY_START_HOURS as readonly number[]).includes(value);
}

/**
 * 端末の現地時刻から、その瞬間がどの日に属するかを返す。
 * 区切りの時刻より前は、前の暦日として扱う（時間を引くのではなく暦の上で1日戻す。夏時間でずれないように）
 */
export function dayOf(now: Date, startHour: number = 0): Day {
  const day = formatYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return now.getHours() < startHour ? addDays(day, -1) : day;
}

/** 次に「きょう」が切り替わる時刻 */
export function nextDayBoundary(now: Date, startHour: number = 0): Date {
  // 夏時間で時刻が補正されても次の日に持ち越さないよう、暦日ごとに Date を作り直す
  const boundary = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour);
  if (boundary.getTime() > now.getTime()) return boundary;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, startHour);
}

export function parseDay(day: Day): { year: number; month: number; date: number } | null {
  const m = DAY_PATTERN.exec(day);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const date = Number(m[3]);
  if (year < MIN_YEAR) return null;
  if (month < 1 || month > 12 || date < 1) return null;
  if (date > daysInMonth(year, month)) return null;
  return { year, month, date };
}

export function isValidDay(day: unknown): day is Day {
  return typeof day === 'string' && parseDay(day) !== null;
}

function mustParse(day: Day) {
  const p = parseDay(day);
  if (!p) throw new Error(`Invalid day: ${day}`);
  return p;
}

/** 暦の上で n 日ずらす（タイムゾーンの影響を受けないよう UTC で計算する） */
export function addDays(day: Day, n: number): Day {
  const p = mustParse(day);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.date + n));
  return formatYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** b - a（日数） */
export function diffDays(a: Day, b: Day): number {
  const pa = mustParse(a);
  const pb = mustParse(b);
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.date) - Date.UTC(pa.year, pa.month - 1, pa.date)) / 86_400_000);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 曜日（0 = 日曜） */
export function weekdayOf(day: Day): number {
  const p = mustParse(day);
  return new Date(Date.UTC(p.year, p.month - 1, p.date)).getUTCDay();
}

/** その日を含む週の最初の日 */
export function weekStartOf(day: Day, weekStart: WeekStart): Day {
  const offset = (weekdayOf(day) - weekStart + 7) % 7;
  return addDays(day, -offset);
}

/** その日を含む月の1日 */
export function monthStartOf(day: Day): Day {
  return `${day.slice(0, 8)}01`;
}

/** その日を含む月の最後の日 */
export function monthEndOf(day: Day): Day {
  const p = mustParse(day);
  return formatYmd(p.year, p.month, daysInMonth(p.year, p.month));
}

export function addMonths(day: Day, n: number): Day {
  const p = mustParse(day);
  const d = new Date(Date.UTC(p.year, p.month - 1 + n, 1));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return formatYmd(y, m, Math.min(p.date, daysInMonth(y, m)));
}

/** from から to まで（両端を含む）の日の列。from > to なら空 */
export function dayRange(from: Day, to: Day): Day[] {
  const out: Day[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 曜日を週の始まりから並べる（0 = 日曜） */
export function orderedWeekdays(weekStart: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}

/** 表示用に Date を作る。年月日だけを使う表示（Intl.DateTimeFormat に timeZone: 'UTC' を渡す）向け */
export function dayToUtcDate(day: Day): Date {
  const p = mustParse(day);
  return new Date(Date.UTC(p.year, p.month - 1, p.date, 12));
}

/** 現地時刻で、その日の hh:mm（1日の区切りより前の時刻は、暦の上で次の日になる） */
export function localDateAt(day: Day, hour: number, minute: number, startHour: number = 0): Date {
  const p = mustParse(day);
  return new Date(p.year, p.month - 1, p.date + (hour < startHour ? 1 : 0), hour, minute);
}
