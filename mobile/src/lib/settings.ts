import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars } from 'expo-localization';
import { create } from 'zustand';

import { isDayStartHour, type DayStartHour, type WeekStart } from './day';
import { isValidTime } from './habit';
import { isLanguagePreference, type LanguagePreference } from './i18n/languages';
import { DEFAULT_THEME, isAppearancePreference, isThemeId, type AppearancePreference, type ThemeId } from './themeColors';

// 設定は AsyncStorage に置く（記録は SQLite）
const PREFIX = 'ongo.';

export type WeekStartPreference = 'system' | 'sun' | 'mon';

/** きょうの一覧で、習慣ごとに見せる記録の期間 */
export type TodayHistoryRange = 'week' | '3m' | '6m' | '1y';
export const TODAY_HISTORY_RANGES: TodayHistoryRange[] = ['week', '3m', '6m', '1y'];

type Values = {
  language: LanguagePreference;
  appearance: AppearancePreference;
  /** 選んだテーマ。Pro でないときは画面に反映しないが、値は残す */
  theme: ThemeId;
  dayStartHour: DayStartHour;
  weekStart: WeekStartPreference;
  todayHistory: TodayHistoryRange;
  /** 節目のお祝い */
  celebrations: boolean;
  /** 1日のまとめ通知 */
  summaryEnabled: boolean;
  summaryTime: string;
  /** 通知の許可のカードを閉じた */
  notificationCardDismissed: boolean;
  /** 最後に書き出した時刻（ISO） */
  lastExportAt: string | null;
  /** アプリのロック（Face ID・パスコード） */
  appLock: boolean;
  /** iCloud バックアップ（iOS） */
  iCloudBackup: boolean;
  lastICloudBackupAt: string | null;
};

const DEFAULTS: Values = {
  language: 'system',
  appearance: 'system',
  theme: DEFAULT_THEME,
  dayStartHour: 0,
  weekStart: 'system',
  todayHistory: 'week',
  celebrations: true,
  summaryEnabled: false,
  summaryTime: '08:00',
  notificationCardDismissed: false,
  lastExportAt: null,
  appLock: false,
  iCloudBackup: true,
  lastICloudBackupAt: null,
};

const VALIDATORS: { [K in keyof Values]: (raw: unknown) => Values[K] | undefined } = {
  language: (v) => (isLanguagePreference(v) ? v : undefined),
  appearance: (v) => (isAppearancePreference(v) ? v : undefined),
  theme: (v) => (isThemeId(v) ? v : undefined),
  dayStartHour: (v) => (isDayStartHour(v) ? v : undefined),
  weekStart: (v) => (v === 'system' || v === 'sun' || v === 'mon' ? v : undefined),
  todayHistory: (v) => (TODAY_HISTORY_RANGES.includes(v as TodayHistoryRange) ? (v as TodayHistoryRange) : undefined),
  celebrations: (v) => (typeof v === 'boolean' ? v : undefined),
  summaryEnabled: (v) => (typeof v === 'boolean' ? v : undefined),
  summaryTime: (v) => (isValidTime(v) ? v : undefined),
  notificationCardDismissed: (v) => (typeof v === 'boolean' ? v : undefined),
  lastExportAt: (v) => (typeof v === 'string' ? v : undefined),
  appLock: (v) => (typeof v === 'boolean' ? v : undefined),
  iCloudBackup: (v) => (typeof v === 'boolean' ? v : undefined),
  lastICloudBackupAt: (v) => (typeof v === 'string' ? v : undefined),
};

type SettingsState = Values & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Values>(key: K, value: Values[K]) => Promise<void>;
};

const KEYS = Object.keys(DEFAULTS) as (keyof Values)[];

export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const pairs = await AsyncStorage.multiGet(KEYS.map((k) => PREFIX + k)).catch(() => [] as readonly [string, string | null][]);
    const loaded: Partial<Values> = {};
    for (const [key, raw] of pairs) {
      const name = key.slice(PREFIX.length) as keyof Values;
      if (raw === null || !(name in VALIDATORS)) continue;
      try {
        const value = VALIDATORS[name](JSON.parse(raw));
        if (value !== undefined) (loaded as Record<string, unknown>)[name] = value;
      } catch {
        // 読めない値は既定のまま
      }
    }
    set({ ...loaded, hydrated: true });
  },

  set: async (key, value) => {
    set({ [key]: value } as Partial<SettingsState>);
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)).catch(console.error);
  },
}));

/** 端末の設定から週の始まりを決める（expo-localization の firstWeekday は 1 = 日曜） */
function systemWeekStart(): WeekStart {
  try {
    return getCalendars()[0]?.firstWeekday === 2 ? 1 : 0;
  } catch {
    return 0;
  }
}

export function resolveWeekStart(pref: WeekStartPreference): WeekStart {
  if (pref === 'sun') return 0;
  if (pref === 'mon') return 1;
  return systemWeekStart();
}

export function useWeekStart(): WeekStart {
  return resolveWeekStart(useSettings((s) => s.weekStart));
}
