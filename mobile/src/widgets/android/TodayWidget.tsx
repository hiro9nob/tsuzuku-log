'use no memo';
// react-native-android-widget は、ふつうの関数として部品を呼ぶので、React Compiler の書き換えを止める

// Android のウィジェット：きょうの習慣（丸を押すと記録）
import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatValue } from '@/lib/format';
import { i18n } from '@/lib/i18n';
import { periodTotal } from '@/lib/stats';
import type { Palette } from '@/lib/themeColors';

import type { WidgetData } from './data';
import { colorOf, HabitGlyph, hex, RecordCircle } from './parts';

const HEADER = 34;
const ROW = 48;

export function TodayWidget({ data, palette, dark, height }: { data: WidgetData; palette: Palette; dark: boolean; height: number }) {
  const t = i18n.t.bind(i18n);
  // きょうの画面と同じ：予定のない習慣と、期間が終わった習慣は出さない
  const items = data.habits.filter((h) => h.state !== 'later' && h.state !== 'ended');
  const counted = items.filter((h) => h.habit.kind !== 'limit' && h.state !== 'rest');
  const done = counted.filter((h) => h.state === 'done').length;
  const rows = Math.max(1, Math.floor((height - HEADER - 16) / ROW));

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: hex(palette.surface), borderRadius: 22, padding: 12 }}>
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', alignItems: 'center', height: HEADER - 6 }}>
        <TextWidget text={t('widget.today')} style={{ fontSize: 16, fontWeight: 'bold', color: hex(palette.text) }} />
        <FlexWidget style={{ flex: 1 }} />
        {counted.length > 0 ? (
          <TextWidget text={`${done}/${counted.length}`} style={{ fontSize: 15, fontWeight: 'bold', color: hex(palette.textSecondary) }} />
        ) : null}
      </FlexWidget>
      {items.length === 0 ? (
        <FlexWidget style={{ flex: 1, width: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget
            text={data.habits.length === 0 ? t('widget.empty') : t('widget.allDone')}
            style={{ fontSize: 13, color: hex(palette.textSecondary), textAlign: 'center' }}
          />
        </FlexWidget>
      ) : (
        items.slice(0, rows).map((h) => {
          const color = colorOf(h.habit, palette, data.isPro, dark);
          const entry = h.entries.get(data.today);
          const isLimit = h.habit.kind === 'limit';
          const total = isLimit ? periodTotal(h.habit, h.entries, data.today, data.weekStart) : 0;
          const detail =
            h.habit.kind === 'count'
              ? `${formatValue(h.habit, entry?.status === 'done' ? entry.value : 0)} / ${formatValue(h.habit, h.habit.target)}`
              : isLimit
                ? `${formatValue(h.habit, total)} / ${formatValue(h.habit, h.habit.target)}`
                : h.state === 'rest'
                  ? t('today.resting')
                  : '';
          return (
            <FlexWidget key={h.habit.id} style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: ROW }}>
              <FlexWidget
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: hex(palette.surfaceAlt), alignItems: 'center', justifyContent: 'center' }}>
                <HabitGlyph habit={h.habit} color={color} size={18} isPro={data.isPro} />
              </FlexWidget>
              <FlexWidget style={{ flex: 1, marginHorizontal: 10 }}>
                <TextWidget text={h.habit.name} maxLines={1} style={{ fontSize: 15, fontWeight: 'bold', color: hex(palette.text) }} />
                {detail ? <TextWidget text={detail} maxLines={1} style={{ fontSize: 12, color: hex(palette.textSecondary) }} /> : null}
              </FlexWidget>
              <RecordCircle
                habit={h.habit}
                color={color}
                palette={palette}
                done={h.state === 'done'}
                over={isLimit && total > h.habit.target}
                size={38}
              />
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
