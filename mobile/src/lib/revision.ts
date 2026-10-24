import { create } from 'zustand';

/** 記録が変わったことを画面に知らせるための番号。変更のたびに1つ進める */
export const useRevision = create<{ revision: number; bump: () => void }>((set) => ({
  revision: 0,
  bump: () => set((s) => ({ revision: s.revision + 1 })),
}));

export function notifyDataChanged(): void {
  useRevision.getState().bump();
}
