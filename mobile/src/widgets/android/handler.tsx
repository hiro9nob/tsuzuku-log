// Android のウィジェットの処理（追加・更新・大きさの変更・丸を押したとき）と、アプリからの更新
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, type WidgetInfo, type WidgetRepresentation, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { loadWidgetData, recordFromWidget, type WidgetData } from './data';
import { HeatmapWidget } from './HeatmapWidget';
import { TodayWidget } from './TodayWidget';

/** app.config.ts の react-native-android-widget の widgets の name と同じ */
export const TODAY_WIDGET = 'OngoToday';
export const HEATMAP_WIDGET = 'OngoHeatmap';

/** マス目のウィジェットで選んだ習慣（ウィジェットごと） */
export function heatmapKey(widgetId: number): string {
  return `ongo.androidHeatmap.${widgetId}`;
}

async function render(info: WidgetInfo, data: WidgetData): Promise<WidgetRepresentation> {
  if (info.widgetName === HEATMAP_WIDGET) {
    const selected = await AsyncStorage.getItem(heatmapKey(info.widgetId)).catch(() => null);
    const habit = data.habits.find((h) => h.habit.id === selected) ?? data.habits[0];
    return {
      light: <HeatmapWidget data={data} habit={habit} palette={data.light} dark={false} width={info.width} height={info.height} />,
      dark: <HeatmapWidget data={data} habit={habit} palette={data.dark} dark width={info.width} height={info.height} />,
    };
  }
  return {
    light: <TodayWidget data={data} palette={data.light} dark={false} height={info.height} />,
    dark: <TodayWidget data={data} palette={data.dark} dark height={info.height} />,
  };
}

/** アプリで記録や設定が変わったとき、置いてあるウィジェットをすべて描き直す */
export async function updateAndroidWidgets(): Promise<void> {
  const data = await loadWidgetData();
  for (const widgetName of [TODAY_WIDGET, HEATMAP_WIDGET]) {
    // 片方で失敗しても、もう片方は描き直す
    await requestWidgetUpdate({ widgetName, renderWidget: (info) => render(info, data), widgetNotFound: () => {} }).catch((e) =>
      console.warn('[android-widget] update failed', widgetName, e),
    );
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  try {
    switch (props.widgetAction) {
      case 'WIDGET_ADDED':
      case 'WIDGET_UPDATE':
      case 'WIDGET_RESIZED':
        props.renderWidget(await render(props.widgetInfo, await loadWidgetData()));
        break;
      case 'WIDGET_CLICK': {
        const habitId = props.clickActionData?.habitId;
        if (props.clickAction === 'record' && typeof habitId === 'string') {
          await recordFromWidget(habitId);
          // 押したウィジェットだけでなく、ほかのウィジェットも新しくする
          await updateAndroidWidgets();
        }
        break;
      }
      case 'WIDGET_DELETED':
        await AsyncStorage.removeItem(heatmapKey(props.widgetInfo.widgetId)).catch(() => {});
        break;
    }
  } catch (e) {
    console.warn('[android-widget] failed', e);
  }
}
