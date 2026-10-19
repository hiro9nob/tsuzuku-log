// はじめて使うときの候補（タップで追加）
import type { HabitInput } from './habits';

export type SuggestionId = 'water' | 'read' | 'walk' | 'sleepEarly' | 'english' | 'lessAlcohol';

export const SUGGESTIONS: readonly { id: SuggestionId; input: Omit<HabitInput, 'name' | 'unit' | 'endDay'> & { unitKey?: 'ml' | 'drinks' } }[] = [
  {
    id: 'water',
    input: { icon: 'water', color: 'blue', kind: 'count', target: 2000, step: 250, unitKey: 'ml', limitPeriod: 'day', schedule: { type: 'daily' }, reminders: [] },
  },
  {
    id: 'read',
    input: { icon: 'book', color: 'amber', kind: 'check', target: 1, step: 1, limitPeriod: 'day', schedule: { type: 'daily' }, reminders: [] },
  },
  {
    id: 'walk',
    input: { icon: 'walk', color: 'teal', kind: 'check', target: 1, step: 1, limitPeriod: 'day', schedule: { type: 'daily' }, reminders: [] },
  },
  {
    id: 'sleepEarly',
    input: { icon: 'moon', color: 'violet', kind: 'check', target: 1, step: 1, limitPeriod: 'day', schedule: { type: 'daily' }, reminders: [] },
  },
  {
    id: 'english',
    input: { icon: 'language', color: 'rose', kind: 'check', target: 1, step: 1, limitPeriod: 'day', schedule: { type: 'perWeek', times: 3 }, reminders: [] },
  },
  {
    id: 'lessAlcohol',
    input: { icon: 'wine', color: 'gray', kind: 'limit', target: 3, step: 1, unitKey: 'drinks', limitPeriod: 'week', schedule: { type: 'daily' }, reminders: [] },
  },
];
