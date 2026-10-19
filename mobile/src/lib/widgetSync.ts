// ウィジェットに渡す内容を書き、ウィジェットとコントロールを再読み込みする（iOS だけ）
import { ExtensionStorage } from '@bacons/apple-targets';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { listHabits } from './habits';
import { i18n } from './i18n';
import { isProNow } from './pro';
import { resolveWeekStart, useSettings } from './settings';
import { resolveTheme } from './themeColors';
import { buildSnapshot, SNAPSHOT_KEY } from './widgetSnapshot';

const appGroup: unknown = Constants.expoConfig?.extra?.appGroup;
const storage = Platform.OS === 'ios' && typeof appGroup === 'string' ? new ExtensionStorage(appGroup) : null;

export function syncWidgets(): void {
  if (Platform.OS === 'android') {
    // Android：置いてあるウィジェットを描き直す（src/widgets/android）。react-native-android-widget は
    // 読み込んだ時点で Android の機能を探すので、iOS では読み込まないよう、ここで読み込む
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { updateAndroidWidgets } = require('@/widgets/android/handler') as typeof import('@/widgets/android/handler');
    void updateAndroidWidgets().catch((e) => console.warn('[widget] android update failed', e));
    return;
  }
  if (!storage) return;
  try {
    const settings = useSettings.getState();
    const isPro = isProNow();
    const theme = resolveTheme(settings.theme, isPro);
    const t = i18n.t.bind(i18n);
    const now = new Date();
    const snapshot = buildSnapshot({
      habits: listHabits(),
      weekStart: resolveWeekStart(settings.weekStart),
      dayStartHour: settings.dayStartHour,
      isPro,
      accent: { light: theme.light.accent, dark: theme.dark.accent, lightText: theme.light.accentText, darkText: theme.dark.accentText },
      strings: {
        today: t('widget.today'),
        empty: t('widget.empty'),
        allDone: t('widget.allDone'),
        proLarge: t('widget.proLarge'),
        widgetName: t('widget.name'),
        widgetDescription: t('widget.description'),
        lockName: t('widget.lockName'),
        lockDescription: t('widget.lockDescription'),
        controlName: t('widget.controlName'),
        controlDescription: t('widget.controlDescription'),
        chooseHabit: t('widget.chooseHabit'),
        heatmapName: t('widget.heatmapName'),
        heatmapDescription: t('widget.heatmapDescription'),
      },
      now,
    });
    storage.set(SNAPSHOT_KEY, JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
    ExtensionStorage.reloadControls();
  } catch (e) {
    console.warn('[widget] sync failed', e);
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** 少し待ってから書く（続けて記録したときにまとめる） */
export function scheduleWidgetSync(): void {
  if (!storage && Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncWidgets();
  }, 400);
}
