'use no memo';
// react-native-android-widget は、ふつうの関数として部品を呼ぶので、React Compiler の書き換えを止める

// Android のウィジェット：記録のマス目（選んだ習慣。列が週、行が曜日、右端がきょう）
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { addDays, weekStartOf, type Day } from '@/lib/day';
import { i18n } from '@/lib/i18n';
import type { DayStatus } from '@/lib/stats';
import type { Palette } from '@/lib/themeColors';

import { statusesOf, type WidgetData, type WidgetHabit } from './data';
import { colorOf, HabitGlyph, hex, RecordCircle } from './parts';

const GAP = 3;
const HEADER = 34;

/** マス目を1枚の SVG にする（小さな部品をたくさん並べると重いため） */
/** マス目の状態。outside は、始める前の日とこれからの日 */
type Cell = DayStatus | 'outside';

function gridSvg(statuses: Cell[][], width: number, height: number, color: string, palette: Palette): string {
  const cell = Math.max(4, (height - GAP * 6) / 7);
  const count = Math.min(statuses.length, Math.floor((width + GAP) / (cell + GAP)));
  const shown = statuses.slice(statuses.length - count);
  const left = width - (count * (cell + GAP) - GAP);
  const r = cell * 0.22;
  const rects = shown.flatMap((col, w) =>
    col.map((s, d) => {
      const x = left + w * (cell + GAP);
      const y = d * (cell + GAP);
      const base = `x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="${r.toFixed(1)}"`;
      switch (s) {
        case 'done':
          return `<rect ${base} fill="${color}"/>`;
        case 'partial':
          return `<rect ${base} fill="${color}" fill-opacity="0.45"/>`;
        case 'rest': {
          const sw = Math.max(1.5, cell * 0.16);
          return `<rect x="${(x + sw / 2).toFixed(1)}" y="${(y + sw / 2).toFixed(1)}" width="${(cell - sw).toFixed(1)}" height="${(cell - sw).toFixed(1)}" rx="${r.toFixed(1)}" fill="none" stroke="${color}" stroke-width="${sw.toFixed(1)}"/>`;
        }
        case 'over':
          return `<rect ${base} fill="${palette.textSecondary}"/>`;
        case 'outside':
          return `<rect ${base} fill="${palette.textSecondary}" fill-opacity="0.07"/>`;
        default:
          return `<rect ${base} fill="${palette.textSecondary}" fill-opacity="0.18"/>`;
      }
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects.join('')}</svg>`;
}

export const HEATMAP_WEEKS = 30;

export function HeatmapWidget({
  data,
  habit,
  palette,
  dark,
  width,
  height,
}: {
  data: WidgetData;
  habit: WidgetHabit | undefined;
  palette: Palette;
  dark: boolean;
  width: number;
  height: number;
}) {
  if (!habit) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: hex(palette.surface), borderRadius: 22, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
        <TextWidget text={i18n.t('widget.empty')} style={{ fontSize: 13, color: hex(palette.textSecondary), textAlign: 'center' }} />
      </FlexWidget>
    );
  }
  const color = colorOf(habit.habit, palette, data.isPro, dark);
  const first = addDays(weekStartOf(data.today, data.weekStart), -7 * (HEATMAP_WEEKS - 1));
  const columns: Day[][] = Array.from({ length: HEATMAP_WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const statuses: Cell[][] = columns.map((days) =>
    statusesOf(habit, data, days).map((s, i): Cell => (days[i] > data.today || days[i] < habit.habit.startDay ? 'outside' : s)),
  );
  const gridW = Math.max(40, width - 24);
  const gridH = Math.max(40, height - 24 - HEADER);
  const entry = habit.entries.get(data.today);

  return (
    <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: hex(palette.surface), borderRadius: 22, padding: 12 }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: HEADER - 6 }}>
        <HabitGlyph habit={habit.habit} color={color} size={16} isPro={data.isPro} />
        <TextWidget text={` ${habit.habit.name}`} maxLines={1} style={{ fontSize: 14, fontWeight: 'bold', color: hex(palette.text) }} />
        <FlexWidget style={{ flex: 1 }} />
        <RecordCircle
          habit={habit.habit}
          color={color}
          palette={palette}
          done={habit.state === 'done' || (habit.habit.kind === 'check' && entry?.status === 'done')}
          over={false}
          size={26}
        />
      </FlexWidget>
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: `ongo://habit/${habit.habit.id}` }}
        style={{ width: 'match_parent', height: gridH, marginTop: 6 }}>
        <SvgWidget svg={gridSvg(statuses, gridW, gridH, color, palette)} style={{ width: gridW, height: gridH }} />
      </FlexWidget>
    </FlexWidget>
  );
}
