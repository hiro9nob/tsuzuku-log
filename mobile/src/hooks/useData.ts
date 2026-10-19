import { useMemo } from 'react';

import { useRevision } from '@/lib/revision';

/**
 * 同期で読める DB の値を読む。記録が変わったとき（revision が進んだとき）と、
 * read が変わったとき（中で使う値が変わったとき）に読み直す
 */
export function useData<T>(read: () => T): T {
  const revision = useRevision((s) => s.revision);
  // revision は読み直しのきっかけとしてだけ使う
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => read(), [read, revision]);
}
