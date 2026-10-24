// 節目のお祝いを、きょうの画面の帯で出すための受け渡し。
// 記録を直す画面などで節目に届いたときは、画面を閉じてから、きょうの画面で控えめに祝う（シェアは帯から選べる）
import { create } from 'zustand';

import type { UndoToken } from './record';

/** undo があれば、帯の「取り消す」で、その記録を変える前に戻せる */
export type Celebration = { habitId: string; milestone: number; undo: UndoToken | null };

export const usePendingCelebration = create<{ value: Celebration | null; set: (value: Celebration | null) => void }>((set) => ({
  value: null,
  set: (value) => set({ value }),
}));
