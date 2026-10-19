// 書き出し（JSON・CSV、無料）と取り込み（このアプリの JSON、他のアプリの CSV）
import { eq } from 'drizzle-orm';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { entries, habits, notes, type EntryRow, type HabitRow, type NoteRow } from '@/db/schema';

import { readImportCsv, toCsv, type ImportedRecord } from './csv';
import { isValidDay, type Day } from './day';
import { isHabitColorId, parseNumberList } from './habit';
import { notifyDataChanged } from './revision';
import { newId, nowIso } from './time';

export const BACKUP_SCHEMA_VERSION = 1;

type BackupFile = {
  app: 'ongo';
  schemaVersion: number;
  exportedAt: string;
  habits: HabitRow[];
  entries: EntryRow[];
  notes: NoteRow[];
};

function stamp(iso: string): string {
  return iso.replace(/\.\d{3}Z$/, '').replace(/[-:]/g, '').replace('T', '-');
}

async function share(name: string, content: string, mimeType: string, uti: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, UTI: uti });
}

/** バックアップの JSON（書き出しと iCloud バックアップで同じ形） */
export function buildBackupJson(now: string = nowIso()): string {
  const backup: BackupFile = {
    app: 'ongo',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now,
    habits: db.select().from(habits).all(),
    entries: db.select().from(entries).all(),
    notes: db.select().from(notes).all(),
  };
  return JSON.stringify(backup, null, 2);
}

export async function exportJson(): Promise<void> {
  const now = nowIso();
  await share(`ongo-${stamp(now)}.json`, buildBackupJson(now), 'application/json', 'public.json');
}

/** CSV：1行が1日の記録。メモも含める */
export async function exportCsv(): Promise<void> {
  const now = nowIso();
  const habitRows = db.select().from(habits).all();
  const names = new Map(habitRows.map((h) => [h.id, h]));
  const noteMap = new Map(db.select().from(notes).all().map((n) => [`${n.habitId}|${n.day}`, n.text]));
  const rows: (string | number)[][] = [['date', 'habit', 'status', 'value', 'unit', 'note']];
  const seen = new Set<string>();
  const entryRows = db.select().from(entries).all().sort((a, b) => (a.day === b.day ? 0 : a.day < b.day ? -1 : 1));
  for (const e of entryRows) {
    const h = names.get(e.habitId);
    if (!h) continue;
    const key = `${e.habitId}|${e.day}`;
    seen.add(key);
    rows.push([e.day, h.name, e.status, e.status === 'rest' ? '' : e.value, h.unit, noteMap.get(key) ?? '']);
  }
  // 記録のない日のメモも残す
  for (const [key, text] of noteMap) {
    if (seen.has(key)) continue;
    const [habitId, day] = key.split('|');
    const h = names.get(habitId);
    if (h) rows.push([day, h.name, '', '', h.unit, text]);
  }
  await share(`ongo-${stamp(now)}.csv`, toCsv(rows), 'text/csv', 'public.comma-separated-values-text');
}

export type ImportSummary = { habitsAdded: number; records: number; notes: number };

export type PreparedImport =
  | { kind: 'canceled' }
  | { kind: 'invalid' }
  | { kind: 'ready'; summary: ImportSummary; apply: () => void };

export async function pickImport(): Promise<PreparedImport> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return { kind: 'canceled' };
  const text = await new File(result.assets[0].uri).text();
  const trimmed = text.replace(/^﻿/, '').trimStart();
  if (trimmed.startsWith('{')) return prepareJson(trimmed);
  const records = readImportCsv(text);
  if (!records || records.length === 0) return { kind: 'invalid' };
  return prepareCsv(records);
}

export function prepareJson(text: string): PreparedImport {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text) as Partial<BackupFile>;
  } catch {
    return { kind: 'invalid' };
  }
  if (data.app !== 'ongo' || typeof data.schemaVersion !== 'number' || data.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return { kind: 'invalid' };
  }
  const hs = (data.habits ?? []).filter((h) => typeof h?.id === 'string' && typeof h.name === 'string' && isValidDay(h.startDay));
  const ids = new Set(hs.map((h) => h.id));
  const es = (data.entries ?? []).filter((e) => ids.has(e?.habitId) && isValidDay(e.day) && (e.status === 'done' || e.status === 'rest'));
  const ns = (data.notes ?? []).filter((n) => ids.has(n?.habitId) && isValidDay(n.day) && typeof n.text === 'string');
  const existing = new Set(db.select({ id: habits.id }).from(habits).all().map((h) => h.id));
  return {
    kind: 'ready',
    summary: { habitsAdded: hs.filter((h) => !existing.has(h.id)).length, records: es.length, notes: ns.length },
    apply: () => {
      db.transaction((tx) => {
        for (const h of hs) {
          const row = { ...h, color: isHabitColorId(h.color) ? h.color : 'mono' };
          const current = tx.select().from(habits).where(eq(habits.id, h.id)).get();
          if (current) {
            // お祝い済みの節目は合わせる（同じ節目で二度出さない）。始まりは早いほう
            const celebrated = [...new Set([...parseNumberList(current.celebrated), ...parseNumberList(h.celebrated)])].sort((a, b) => a - b);
            row.celebrated = JSON.stringify(celebrated);
            row.startDay = current.startDay < h.startDay ? current.startDay : h.startDay;
          }
          tx.insert(habits).values(row).onConflictDoUpdate({ target: habits.id, set: row }).run();
        }
        for (const e of es) {
          tx.insert(entries)
            .values(e)
            .onConflictDoUpdate({ target: [entries.habitId, entries.day], set: { status: e.status, value: e.value, recordedAt: e.recordedAt } })
            .run();
        }
        for (const n of ns) {
          tx.insert(notes)
            .values(n)
            .onConflictDoUpdate({ target: [notes.habitId, notes.day], set: { text: n.text, updatedAt: n.updatedAt } })
            .run();
        }
      });
      notifyDataChanged();
    },
  };
}

/** 他のアプリの CSV：習慣は名前で合わせ、なければ作る（値が1より大きければ数値の習慣にする） */
function prepareCsv(records: ImportedRecord[]): PreparedImport {
  const existing = db.select().from(habits).all();
  const key = (name: string) => name.trim().toLowerCase();
  const byName = new Map(existing.map((h) => [key(h.name), h.id]));
  // 大文字・小文字や前後の空白だけが違う名前は、同じ習慣にする（最初に出てきた書き方を使う）
  const firstSpelling = new Map<string, string>();
  for (const r of records) if (!firstSpelling.has(key(r.habit))) firstSpelling.set(key(r.habit), r.habit.trim());
  const newKeys = [...firstSpelling.keys()].filter((k) => !byName.has(k));
  return {
    kind: 'ready',
    summary: {
      habitsAdded: newKeys.length,
      records: records.filter((r) => r.status === 'rest' || r.value > 0).length,
      notes: records.filter((r) => r.note).length,
    },
    apply: () => {
      const now = nowIso();
      db.transaction((tx) => {
        let order = existing.reduce((m, h) => Math.max(m, h.sortOrder), -1);
        for (const k of newKeys) {
          const name = firstSpelling.get(k) ?? k;
          const mine = records.filter((r) => key(r.habit) === k);
          const first = mine.reduce<Day>((m, r) => (r.day < m ? r.day : m), mine[0].day);
          const isCount = mine.some((r) => r.value > 1);
          const target = isCount ? Math.max(...mine.map((r) => r.value)) : 1;
          const id = newId();
          tx.insert(habits)
            .values({
              id,
              name,
              icon: 'checkmark-circle',
              color: 'mono',
              kind: isCount ? 'count' : 'check',
              target,
              step: isCount ? Math.max(1, Math.round(target / 4)) : 1,
              unit: '',
              limitPeriod: 'day',
              schedule: JSON.stringify({ type: 'daily' }),
              reminders: '[]',
              pinned: 0,
              sortOrder: ++order,
              startDay: first,
              celebrated: '[]',
              createdAt: now,
              updatedAt: now,
            })
            .run();
          byName.set(k, id);
        }
        for (const r of records) {
          const habitId = byName.get(key(r.habit));
          if (!habitId) continue;
          if (r.status === 'rest' || r.value > 0) {
            tx.insert(entries)
              .values({ habitId, day: r.day, status: r.status, value: r.value, recordedAt: now })
              .onConflictDoUpdate({ target: [entries.habitId, entries.day], set: { status: r.status, value: r.value } })
              .run();
          }
          if (r.note) {
            tx.insert(notes)
              .values({ id: newId(), habitId, day: r.day, text: r.note, createdAt: now, updatedAt: now })
              .onConflictDoUpdate({ target: [notes.habitId, notes.day], set: { text: r.note, updatedAt: now } })
              .run();
          }
          // 習慣の始まりより前の記録があれば、始まりを早める
          const h = tx.select({ startDay: habits.startDay }).from(habits).where(eq(habits.id, habitId)).get();
          if (h && r.day < h.startDay) tx.update(habits).set({ startDay: r.day }).where(eq(habits.id, habitId)).run();
        }
      });
      notifyDataChanged();
    },
  };
}
