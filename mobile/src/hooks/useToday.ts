import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { dayOf, nextDayBoundary, type Day } from '@/lib/day';
import { useSettings } from '@/lib/settings';

/**
 * きょうの day（1日の区切りの設定に従う）。区切りをまたいだら、復帰したときや画面を表示したとき、
 * 開いたままなら区切りの時刻に計算し直す。タイムゾーンが変わったときも、計算し直した値で比べるので更新される
 */
export function useToday(): Day {
  const startHour = useSettings((s) => s.dayStartHour);
  const [today, setToday] = useState(() => dayOf(new Date(), startHour));
  const [checks, setChecks] = useState(0);

  const refresh = useCallback(() => {
    setToday(dayOf(new Date(), startHour));
    setChecks((n) => n + 1);
  }, [startHour]);

  useFocusEffect(refresh);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEffect(() => {
    const now = new Date();
    const delay = Math.max(nextDayBoundary(now, startHour).getTime() - now.getTime(), 1000);
    const timer = setTimeout(refresh, Math.min(delay, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [checks, refresh, startHour]);

  return today;
}
