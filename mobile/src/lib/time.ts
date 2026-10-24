import { randomUUID } from 'expo-crypto';

/** UTC・ミリ秒付きの ISO 8601（例：2026-10-05T13:45:12.345Z） */
export function nowIso(): string {
  return new Date().toISOString();
}

/** 小文字の UUID v4 */
export function newId(): string {
  return randomUUID().toLowerCase();
}
