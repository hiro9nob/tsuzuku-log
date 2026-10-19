import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { useProGate } from '@/hooks/useProGate';
import { addDays, orderedWeekdays } from '@/lib/day';
import { useToday } from '@/hooks/useToday';
import { formatTimeOfDay, weekdayName } from '@/lib/format';
import { FREE_HABIT_COLOR, habitColor, HABIT_COLORS, FREE_REMINDERS, isAmount, type HabitKind, isProSchedule, type LimitPeriod, MONTH_WEEKS, type Reminder, type Schedule } from '@/lib/habit';
import type { HabitInput } from '@/lib/habits';
import { pickIconImage } from '@/lib/iconImages';
import { emojiIcon, firstEmoji, FREE_ICONS, parseIcon, PRO_ICONS } from '@/lib/icons';
import { useIsPro } from '@/lib/pro';
import { useWeekStart } from '@/lib/settings';
import { radius, spacing, useTheme } from '@/theme';

import { Chip } from './Chip';
import { DateField } from './DateField';
import { HabitIcon } from './HabitIcon';
import { ProBadge } from './ProBadge';
import { Stepper } from './Stepper';
import { TimeField } from './TimeField';

export const DEFAULT_INPUT: HabitInput = {
  name: '',
  icon: 'checkmark-circle',
  color: 'mono',
  kind: 'check',
  target: 1,
  step: 1,
  unit: '',
  limitPeriod: 'day',
  schedule: { type: 'daily' },
  reminders: [],
  endDay: null,
};

const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

function sameDays(a: number[], b: number[]) {
  return a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i]);
}

/** 空欄や読めない入力は NaN（保存できない） */
function parseNumber(text: string): number {
  return text.trim() === '' ? NaN : Number(text.replace(',', '.'));
}


function Section({ title, children, accessory }: { title: string; children: ReactNode; accessory?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
        {accessory}
      </View>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>{children}</View>
    </View>
  );
}

/** 習慣をつくる・直す画面（1画面：名前、アイコン、色、種類、頻度、通知） */
export function HabitForm({ value, onChange, autoFocus }: { value: HabitInput; onChange: (v: HabitInput) => void; autoFocus?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPro = useIsPro();
  const gate = useProGate();
  const weekStart = useWeekStart();
  const today = useToday();
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [emoji, setEmoji] = useState(() => {
    const v = parseIcon(value.icon);
    return v.type === 'emoji' ? v.text : '';
  });
  // 数値の入力は、打っている途中の文字を残す
  const [targetText, setTargetText] = useState(String(value.target));
  const [stepText, setStepText] = useState(String(value.step));

  const set = <K extends keyof HabitInput>(key: K, v: HabitInput[K]) => onChange({ ...value, [key]: v });
  const schedule = value.schedule;

  const setKind = (kind: HabitKind) => {
    if (kind === value.kind) return;
    const target = kind === 'count' ? 10 : kind === 'limit' ? 3 : 1;
    const step = 1;
    setTargetText(String(target));
    setStepText(String(step));
    onChange({ ...value, kind, target, step });
  };

  const setSchedule = (next: Schedule) => {
    if (isProSchedule(next) && !gate(t('pro.features.repeat'))) return;
    set('schedule', next);
  };

  const toggleEndDay = (on: boolean) => {
    if (on && !gate(t('pro.features.repeat'))) return;
    set('endDay', on ? addDays(today, 29) : null);
  };

  const pickIcon = (icon: string, pro: boolean) => {
    if (pro && !gate(t('pro.features.icons'))) return;
    set('icon', icon);
  };

  const pickImage = async () => {
    if (!gate(t('pro.features.icons'))) return;
    try {
      const icon = await pickIconImage();
      if (!icon) return;
      setEmoji('');
      set('icon', icon);
    } catch (e) {
      console.warn('[form] image failed', e);
      Alert.alert(t('form.imageFailed'));
    }
  };

  const setReminders = (reminders: Reminder[]) => set('reminders', reminders);
  const addReminder = () => {
    if (value.reminders.length >= FREE_REMINDERS && !gate(t('pro.features.reminders'))) return;
    setReminders([...value.reminders, { time: value.reminders.length === 0 ? '09:00' : '20:00' }]);
  };

  const iconChoices: { name: string; pro: boolean }[] = [
    ...FREE_ICONS.map((name) => ({ name, pro: false })),
    ...(showAllIcons ? PRO_ICONS.map((name) => ({ name, pro: true })) : []),
  ];

  return (
    <View style={styles.form}>
      <View style={[styles.nameRow, { backgroundColor: theme.surface }]}>
        <HabitIcon icon={value.icon} color={value.color} size={48} />
        <TextInput
          value={value.name}
          onChangeText={(v) => set('name', v)}
          placeholder={t('form.namePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          autoFocus={autoFocus}
          maxLength={60}
          returnKeyType="done"
          accessibilityLabel={t('form.name')}
          style={[styles.nameInput, { color: theme.text }]}
        />
      </View>

      <Section title={t('form.icon')}>
        <View style={styles.grid}>
          {iconChoices.map(({ name, pro }) => {
            const selected = value.icon === name;
            return (
              <Pressable
                key={name}
                onPress={() => pickIcon(name, pro)}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityState={{ selected }}
                style={[styles.iconCell, { backgroundColor: selected ? theme.accentSoft : 'transparent' }]}>
                <Ionicons
                  name={name as ComponentProps<typeof Ionicons>['name']}
                  size={24}
                  color={pro && !isPro ? theme.textSecondary : theme.habit(value.color)}
                />
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => setShowAllIcons(!showAllIcons)} accessibilityRole="button" style={styles.linkRow}>
          <Text style={[styles.link, { color: theme.text }]}>{showAllIcons ? t('form.fewerIcons') : t('form.moreIcons')}</Text>
          {!isPro ? <ProBadge /> : null}
        </Pressable>
        <View style={styles.emojiRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('form.emoji')}</Text>
          {!isPro ? <ProBadge /> : null}
          <TextInput
            value={emoji}
            onFocus={() => {
              if (!isPro) gate(t('pro.features.icons'));
            }}
            editable={isPro}
            onChangeText={(text) => {
              const e = firstEmoji(text);
              setEmoji(e ?? '');
              if (e) set('icon', emojiIcon(e));
            }}
            placeholder="🙂"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={t('form.emoji')}
            style={[styles.emojiInput, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
          />
        </View>
        <View style={styles.emojiRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('form.image')}</Text>
          {!isPro ? <ProBadge /> : null}
          <Pressable
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel={t('form.chooseImage')}
            style={({ pressed }) => [styles.imageButton, { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="image-outline" size={18} color={theme.text} />
            <Text style={[styles.imageButtonText, { color: theme.text }]}>{t('form.chooseImage')}</Text>
          </Pressable>
        </View>
      </Section>

      <Section title={t('form.color')} accessory={!isPro ? <ProBadge /> : null}>
        <View style={styles.colors}>
          {HABIT_COLORS.map((c) => {
            const selected = (isPro ? value.color : FREE_HABIT_COLOR) === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (c.id !== FREE_HABIT_COLOR && !gate(t('pro.features.colors'))) return;
                  set('color', c.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={t(`colors.${c.id}`)}
                accessibilityState={{ selected }}
                style={[styles.swatchRing, { borderColor: selected ? theme.text : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: c.id === FREE_HABIT_COLOR ? theme.accent : habitColor(c.id, theme.isDark) }]}>
                  {c.id !== FREE_HABIT_COLOR && !isPro ? <Ionicons name="lock-closed" size={12} color={theme.isDark ? '#121212' : '#FFFFFF'} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title={t('form.kind')}>
        <View style={styles.chips}>
          {(['check', 'count', 'limit'] as const).map((k) => (
            <Chip key={k} grow label={t(`kinds.${k}`)} selected={value.kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{t(`kinds.${value.kind}Hint`)}</Text>
        {value.kind !== 'check' ? (
          <View style={styles.numbers}>
            <NumberField
              label={value.kind === 'count' ? t('form.target') : t('form.limit')}
              text={targetText}
              onChange={(text) => {
                setTargetText(text);
                set('target', parseNumber(text));
              }}
            />
            <NumberField
              label={t('form.step')}
              text={stepText}
              onChange={(text) => {
                setStepText(text);
                set('step', parseNumber(text));
              }}
            />
            <View style={styles.numberRow}>
              <Text style={[styles.label, { color: theme.text }]}>{t('form.unit')}</Text>
              <TextInput
                value={value.unit}
                onChangeText={(v) => set('unit', v)}
                placeholder={t('form.unitPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                maxLength={12}
                accessibilityLabel={t('form.unit')}
                style={[styles.smallInput, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
              />
            </View>
            {value.kind === 'limit' ? (
              <View style={styles.chips}>
                {(['day', 'week', 'month'] as LimitPeriod[]).map((p) => (
                  <Chip key={p} grow label={t(`limitPeriods.${p}`)} selected={value.limitPeriod === p} onPress={() => set('limitPeriod', p)} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </Section>

      {value.kind !== 'limit' ? (
        <Section title={t('form.frequency')}>
          <View style={styles.chips}>
            <Chip grow label={t('schedule.daily')} selected={schedule.type === 'daily'} onPress={() => setSchedule({ type: 'daily' })} />
            <Chip
              grow
              label={t('schedule.weekdays')}
              selected={schedule.type === 'weekdays'}
              onPress={() => setSchedule({ type: 'weekdays', days: WEEKDAYS })}
            />
            <Chip
              grow
              label={t('schedule.perWeek')}
              selected={schedule.type === 'perWeek'}
              onPress={() => setSchedule({ type: 'perWeek', times: 3 })}
            />
          </View>
          <View style={styles.chips}>
            <Chip
              grow
              label={t('schedule.interval')}
              selected={schedule.type === 'interval'}
              onPress={() => setSchedule({ type: 'interval', every: 2 })}
              accessory={!isPro ? <ProBadge /> : null}
            />
            <Chip
              grow
              label={t('schedule.perMonth')}
              selected={schedule.type === 'perMonth'}
              onPress={() => setSchedule({ type: 'perMonth', times: 8 })}
              accessory={!isPro ? <ProBadge /> : null}
            />
          </View>
          <View style={styles.chips}>
            <Chip
              grow
              label={t('schedule.monthlyWeekday')}
              selected={schedule.type === 'monthlyWeekday'}
              onPress={() => setSchedule({ type: 'monthlyWeekday', weeks: [1], days: [0] })}
              accessory={!isPro ? <ProBadge /> : null}
            />
            <Chip
              grow
              label={t('schedule.afterDone')}
              selected={schedule.type === 'afterDone'}
              onPress={() => setSchedule({ type: 'afterDone', days: 3 })}
              accessory={!isPro ? <ProBadge /> : null}
            />
          </View>

          {schedule.type === 'weekdays' ? (
            <>
              <View style={styles.weekdays}>
                {orderedWeekdays(weekStart).map((d) => {
                  const on = schedule.days.includes(d);
                  return (
                    <Chip
                      key={d}
                      grow
                      compact
                      label={weekdayName(d, 'narrow')}
                      accessibilityLabel={weekdayName(d, 'short')}
                      selected={on}
                      onPress={() => {
                        const days = on ? schedule.days.filter((x) => x !== d) : [...schedule.days, d].sort();
                        if (days.length > 0) set('schedule', { type: 'weekdays', days });
                      }}
                    />
                  );
                })}
              </View>
              <View style={styles.chips}>
                <Chip grow label={t('schedule.weekdayPreset')} selected={sameDays(schedule.days, WEEKDAYS)} onPress={() => set('schedule', { type: 'weekdays', days: WEEKDAYS })} />
                <Chip grow label={t('schedule.weekendPreset')} selected={sameDays(schedule.days, WEEKEND)} onPress={() => set('schedule', { type: 'weekdays', days: WEEKEND })} />
              </View>
            </>
          ) : null}
          {schedule.type === 'perWeek' ? (
            <Stepper value={schedule.times} min={1} max={7} label={t('schedule.timesPerWeek', { count: schedule.times })} onChange={(times) => set('schedule', { type: 'perWeek', times })} />
          ) : null}
          {schedule.type === 'interval' ? (
            <Stepper value={schedule.every} min={2} max={30} label={t('schedule.everyNDays', { count: schedule.every })} onChange={(every) => set('schedule', { type: 'interval', every })} />
          ) : null}
          {schedule.type === 'monthlyWeekday' ? (
            <>
              {/* 第1〜第5・最終の6つは、1行だと文字が切れるので、3つずつ2行に並べる */}
              <View style={styles.weeks}>
                {MONTH_WEEKS.map((w) => {
                  const on = schedule.weeks.includes(w);
                  return (
                    <Chip
                      key={w}
                      compact
                      style={styles.week}
                      label={w === -1 ? t('schedule.lastWeek') : t('schedule.nthWeek', { n: w })}
                      selected={on}
                      onPress={() => {
                        const weeks = on ? schedule.weeks.filter((x) => x !== w) : [...schedule.weeks, w].sort();
                        if (weeks.length > 0) set('schedule', { ...schedule, weeks });
                      }}
                    />
                  );
                })}
              </View>
              <View style={styles.weekdays}>
                {orderedWeekdays(weekStart).map((d) => {
                  const on = schedule.days.includes(d);
                  return (
                    <Chip
                      key={d}
                      grow
                      compact
                      label={weekdayName(d, 'narrow')}
                      accessibilityLabel={weekdayName(d, 'short')}
                      selected={on}
                      onPress={() => {
                        const days = on ? schedule.days.filter((x) => x !== d) : [...schedule.days, d].sort();
                        if (days.length > 0) set('schedule', { ...schedule, days });
                      }}
                    />
                  );
                })}
              </View>
            </>
          ) : null}
          {schedule.type === 'afterDone' ? (
            <Stepper value={schedule.days} min={1} max={60} label={t('schedule.afterDoneDays', { count: schedule.days })} onChange={(days) => set('schedule', { type: 'afterDone', days })} />
          ) : null}
          {schedule.type === 'perMonth' ? (
            <Stepper value={schedule.times} min={1} max={31} label={t('schedule.timesPerMonth', { count: schedule.times })} onChange={(times) => set('schedule', { type: 'perMonth', times })} />
          ) : null}
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{t('schedule.restHint')}</Text>
        </Section>
      ) : null}

      <Section title={t('form.period')} accessory={!isPro ? <ProBadge /> : null}>
        <View style={styles.numberRow}>
          <Text style={[styles.label, { color: theme.text }]}>{t('form.limited')}</Text>
          <Switch value={value.endDay !== null && isPro} onValueChange={toggleEndDay} accessibilityLabel={t('form.limited')} />
        </View>
        {value.endDay !== null && isPro ? (
          <View style={styles.numberRow}>
            <Text style={[styles.label, { color: theme.text }]}>{t('form.endDay')}</Text>
            <DateField value={value.endDay} minimum={today} label={t('form.endDay')} onChange={(d) => set('endDay', d)} />
          </View>
        ) : null}
        <Text style={[styles.hint, { color: theme.textSecondary }]}>{t('form.limitedHint')}</Text>
      </Section>

      <Section title={t('form.reminders')} accessory={value.reminders.length >= FREE_REMINDERS && !isPro ? <ProBadge /> : null}>
        {value.reminders.map((r, i) => (
          <View key={i} style={styles.reminder}>
            <View style={styles.reminderRow}>
              <Ionicons name="notifications-outline" size={20} color={theme.textSecondary} />
              <View style={styles.flex}>
                <TimeField
                  value={r.time}
                  label={t('form.reminderTime', { time: formatTimeOfDay(r.time) })}
                  onChange={(time) => setReminders(value.reminders.map((x, j) => (j === i ? { ...x, time } : x)))}
                />
              </View>
              <Pressable
                onPress={() => setReminders(value.reminders.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={t('form.removeReminder')}
                hitSlop={8}>
                <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.weekdays}>
              {orderedWeekdays(weekStart).map((d) => {
                const on = r.days ? r.days.includes(d) : true;
                return (
                  <Chip
                    key={d}
                    grow
                    compact
                    label={weekdayName(d, 'narrow')}
                    accessibilityLabel={weekdayName(d, 'short')}
                    selected={on}
                    onPress={() => {
                      if (!gate(t('pro.features.reminders'))) return;
                      const current = r.days ?? [0, 1, 2, 3, 4, 5, 6];
                      const days = on ? current.filter((x) => x !== d) : [...current, d].sort();
                      if (days.length === 0) return;
                      setReminders(value.reminders.map((x, j) => (j === i ? { time: x.time, ...(days.length === 7 ? {} : { days }) } : x)));
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}
        <Pressable onPress={addReminder} accessibilityRole="button" style={styles.linkRow}>
          <Ionicons name="add" size={20} color={theme.text} />
          <Text style={[styles.link, { color: theme.text }]}>{t('form.addReminder')}</Text>
        </Pressable>
      </Section>
    </View>
  );
}

function NumberField({ label, text, onChange }: { label: string; text: string; onChange: (text: string) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.numberRow}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        style={[styles.smallInput, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
      />
    </View>
  );
}

/** 保存できるか（名前があり、数値が正しい） */
export function isValidInput(v: HabitInput): boolean {
  if (v.name.trim() === '') return false;
  if (v.kind !== 'check' && !(isAmount(v.target) && isAmount(v.step))) return false;
  return true;
}

const styles = StyleSheet.create({
  form: { gap: spacing.l },
  flex: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, borderRadius: radius.l, padding: spacing.m },
  nameInput: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: spacing.s },
  section: { gap: spacing.s },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginLeft: spacing.s },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  card: { borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  iconCell: { width: 44, height: 44, borderRadius: radius.s, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingVertical: spacing.xs },
  link: { fontSize: 15, fontWeight: '700' },
  emojiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  imageButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto', borderRadius: radius.full, paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  imageButtonText: { fontSize: 15, fontWeight: '600' },
  emojiInput: { marginLeft: 'auto', width: 64, textAlign: 'center', fontSize: 22, borderRadius: radius.s, paddingVertical: spacing.xs },
  colors: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: spacing.s },
  swatchRing: { borderWidth: 2, borderRadius: radius.full, padding: 3 },
  swatch: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  weekdays: { flexDirection: 'row', gap: 4 },
  weeks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s },
  week: { flexGrow: 1, flexBasis: '30%' },
  hint: { fontSize: 13, lineHeight: 18 },
  numbers: { gap: spacing.s },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  label: { flex: 1, fontSize: 16 },
  smallInput: { minWidth: 110, textAlign: 'right', fontSize: 17, borderRadius: radius.s, paddingHorizontal: spacing.s, paddingVertical: spacing.s },
  reminder: { gap: spacing.s },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
});
