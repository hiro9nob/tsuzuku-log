// 書き出しと取り込み（このアプリの JSON、無料）
import { eq } from 'drizzle-orm';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { entries, habits, notes, type EntryRow, type HabitRow, type NoteRow } from '@/db/schema';

import { isValidDay } from './day';
import { parseRules, toHabitColorId } from './habit';
import { rowToHabit } from './habits';
import { notifyDataChanged } from './revision';
import { nowIso } from './time';

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

export type ImportSummary = { habitsAdded: number; records: number; notes: number };

export type PreparedImport =
  | { kind: 'canceled' }
  | { kind: 'invalid' }
  | { kind: 'ready'; summary: ImportSummary; apply: () => void };

export async function pickImport(): Promise<PreparedImport> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets[0]) return { kind: 'canceled' };
  const text = await new File(result.assets[0].uri).text();
  const trimmed = text.replace(/^﻿/, '').trimStart();
  if (!trimmed.startsWith('{')) return { kind: 'invalid' };
  return prepareJson(trimmed);
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
          // 判定の決まりの履歴は、いまの設定と同じ時点のものにそろえる（履歴のない古いバックアップなら、履歴もなし）。
          // 読めない日付などは捨てる
          const row = { ...h, color: toHabitColorId(h.color), rules: JSON.stringify(parseRules(h.rules)) };
          const current = tx.select().from(habits).where(eq(habits.id, h.id)).get();
          if (current) {
            // お祝い済みの節目は合わせる（同じ節目で二度出さない）。始まりは早いほう
            // 数だけの古い形は、それぞれの習慣のいまの連続の単位で読む（rowToHabit）
            const celebrated = [...new Set([...rowToHabit(current).celebrated, ...rowToHabit({ ...current, ...row }).celebrated])];
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
