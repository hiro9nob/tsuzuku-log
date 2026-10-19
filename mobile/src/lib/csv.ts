// CSV の書き出しと、他のアプリからの取り込み（CSV）の読み取り
// このファイルは React Native に依存させない（単体テストのため）

import { isValidDay, type Day } from './day';

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  // 区切りは「,」が基本。「;」や タブ の書き出しもある
  const firstLine = src.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [',', ';', '\t'].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}

export function toCsv(rows: readonly (readonly (string | number)[])[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Excel で文字化けしないよう BOM を付ける
  return '﻿' + rows.map((r) => r.map(escape).join(',')).join('\r\n') + '\r\n';
}

/** 日付の読み取り：2026-10-05、2026/10/5、2026-10-05T07:00:00 など。読めなければ null */
export function parseDateCell(value: string): Day | null {
  const m = /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(value);
  if (!m) return null;
  const day = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return isValidDay(day) ? day : null;
}

export type ImportedRecord = { habit: string; day: Day; status: 'done' | 'rest'; value: number; note: string };

const DATE_HEADERS = ['date', 'day', 'datetime', 'timestamp', '日付', '日時', '日期', '날짜', 'fecha', 'datum', 'data'];
const HABIT_HEADERS = ['habit', 'habit name', 'habitname', 'name', 'title', '習慣', '習慣名', '名前', '习惯', '習慣', '습관', 'hábito', 'gewohnheit'];
const VALUE_HEADERS = ['value', 'count', 'amount', 'quantity', '値', '数値', '回数', '数量'];
const STATUS_HEADERS = ['status', 'state', 'completed', 'done', '状態', 'ステータス'];
const NOTE_HEADERS = ['note', 'notes', 'memo', 'comment', 'メモ', 'ひとこと', '备注', '메모'];
const SKIP_HEADERS = ['unit', '単位', 'id', 'time', '時刻'];

const REST_WORDS = ['rest', 'skip', 'skipped', 'お休み', '休み', 'スキップ'];
const NOT_DONE_WORDS = ['', '0', 'false', 'no', 'x', 'fail', 'failed', 'missed', 'none', '未完了', 'できなかった', 'いいえ'];

function findColumn(headers: string[], names: readonly string[]): number {
  return headers.findIndex((h) => names.includes(h));
}

function cellStatus(raw: string): { status: 'done' | 'rest'; value: number } | null {
  const v = raw.trim().toLowerCase();
  if (REST_WORDS.includes(v)) return { status: 'rest', value: 0 };
  if (NOT_DONE_WORDS.includes(v)) return null;
  const n = Number(v.replace(',', '.'));
  if (Number.isFinite(n)) return n > 0 ? { status: 'done', value: n } : null;
  return { status: 'done', value: 1 };
}

/**
 * 他のアプリの CSV を読む。2つの形に対応する
 * - 縦長：日付・習慣の名前（・値・状態・メモ）の列がある（このアプリの書き出しもこの形）
 * - 横長：日付の列と、習慣ごとの列（1／0、✓ など）
 */
export function readImportCsv(text: string): ImportedRecord[] | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const dateCol = findColumn(headers, DATE_HEADERS);
  if (dateCol < 0) return null;
  const habitCol = findColumn(headers, HABIT_HEADERS);
  const out: ImportedRecord[] = [];

  if (habitCol >= 0) {
    const valueCol = findColumn(headers, VALUE_HEADERS);
    const statusCol = findColumn(headers, STATUS_HEADERS);
    const noteCol = findColumn(headers, NOTE_HEADERS);
    for (const r of rows.slice(1)) {
      const day = parseDateCell(r[dateCol] ?? '');
      const habit = (r[habitCol] ?? '').trim();
      if (!day || !habit) continue;
      const note = noteCol >= 0 ? (r[noteCol] ?? '').trim() : '';
      let st: { status: 'done' | 'rest'; value: number } | null = { status: 'done', value: 1 };
      if (statusCol >= 0) st = cellStatus(r[statusCol] ?? '');
      else if (valueCol >= 0) st = cellStatus(r[valueCol] ?? '');
      if (st?.status === 'done' && valueCol >= 0) {
        const raw = (r[valueCol] ?? '').trim();
        const n = Number(raw.replace(',', '.'));
        // 値が空欄なら 1 回として扱い、0 ならできていない
        if (raw !== '' && Number.isFinite(n)) st = n > 0 ? { status: 'done', value: n } : null;
      }
      if (st) out.push({ habit, day, ...st, note });
      else if (note) out.push({ habit, day, status: 'done', value: 0, note });
    }
    return out;
  }

  const habitCols = headers
    .map((h, i) => ({ h, i, name: rows[0][i].trim() }))
    .filter(({ h, i, name }) => i !== dateCol && name !== '' && !SKIP_HEADERS.includes(h) && !NOTE_HEADERS.includes(h));
  for (const r of rows.slice(1)) {
    const day = parseDateCell(r[dateCol] ?? '');
    if (!day) continue;
    for (const { i, name } of habitCols) {
      const raw = (r[i] ?? '').trim();
      const st = ['✓', '✔', '○', '◯', '●'].includes(raw) ? { status: 'done' as const, value: 1 } : cellStatus(raw);
      if (st) out.push({ habit: name, day, ...st, note: '' });
    }
  }
  return out;
}
