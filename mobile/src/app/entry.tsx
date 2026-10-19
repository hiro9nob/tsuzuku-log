import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { HabitIcon } from '@/components/HabitIcon';
import { Illustration } from '@/components/Illustration';
import { isValidDay } from '@/lib/day';
import { formatDay, formatValue } from '@/lib/format';
import { effectiveSchedule, isAmount, isDone } from '@/lib/habit';
import { getEntry, getHabit, noteOf, setEntry, setNote } from '@/lib/habits';
import { scheduleReschedule } from '@/lib/notifications';
import { useIsPro } from '@/lib/pro';
import { afterCompletion } from '@/lib/record';
import { useWeekStart } from '@/lib/settings';
import { roundAmount } from '@/lib/stats';
import { useToday } from '@/hooks/useToday';
import { radius, spacing, useTheme } from '@/theme';

type Status = 'done' | 'rest' | 'none';

/** 1日の記録を直す：「できた／お休み／記録しない」の切り替え、数値、メモ（ひとこと） */
export default function EntryScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  // devStatus は開発版だけ：その状態を選んだ画面から開く（シミュレータでの確かめ用）
  const { habitId, day, focus, devStatus } = useLocalSearchParams<{ habitId: string; day: string; focus?: string; devStatus?: string }>();
  const today = useToday();
  const weekStart = useWeekStart();
  const isPro = useIsPro();
  const [habit] = useState(() => getHabit(habitId));
  const [initial] = useState(() => (isValidDay(day) ? getEntry(habitId, day) : null));
  const [status, setStatus] = useState<Status>(__DEV__ && devStatus === 'rest' ? 'rest' : (initial?.status ?? 'none'));
  const [valueText, setValueText] = useState(initial?.status === 'done' ? String(initial.value) : habit ? String(habit.kind === 'count' ? habit.target : habit.step) : '1');
  const [note, setNoteText] = useState(() => (isValidDay(day) ? (noteOf(habitId, day)?.text ?? '') : ''));

  if (!habit || !isValidDay(day)) return null;
  const numeric = habit.kind !== 'check';
  const value = Number(valueText.replace(',', '.'));
  const valid = status !== 'done' || !numeric || isAmount(value);

  const save = () => {
    if (!valid) return;
    const next = status === 'none' ? null : status === 'rest' ? ({ status: 'rest', value: 0 } as const) : ({ status: 'done', value: numeric ? roundAmount(value) : 1 } as const);
    setEntry(habitId, day, next);
    setNote(habitId, day, note);
    scheduleReschedule();
    // きょうの記録でできたになったときは、きょうの画面で押したときと同じく、お祝いとレビューを確かめる
    const effective = { ...habit, schedule: effectiveSchedule(habit.schedule, isPro) };
    const nowDone = next !== null && isDone(effective, { ...next, day });
    const milestone = day === today && nowDone && !isDone(effective, initial ?? undefined) ? afterCompletion(effective, today, weekStart) : null;
    if (milestone !== null) router.replace({ pathname: '/share', params: { habitId, milestone: String(milestone) } });
    else router.back();
  };

  const adjust = (delta: number) => {
    const base = Number.isFinite(value) ? value : 0;
    setValueText(String(Math.max(0, Math.round((base + delta) * 100) / 100)));
    setStatus('done');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={styles.header}>
        <HabitIcon icon={habit.icon} color={habit.color} size={40} />
        <View style={styles.flex}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={[styles.day, { color: theme.textSecondary }]}>{formatDay(day, { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip grow label={habit.kind === 'limit' ? t('entry.record') : t('entry.done')} selected={status === 'done'} onPress={() => setStatus('done')} />
        <Chip grow label={t('entry.rest')} selected={status === 'rest'} onPress={() => setStatus('rest')} />
        <Chip grow label={t('entry.none')} selected={status === 'none'} onPress={() => setStatus('none')} />
      </View>
      {status === 'rest' ? (
        <View style={styles.rest}>
          <Illustration name="rest" height={96} />
          <Text style={[styles.hint, styles.center, { color: theme.textSecondary }]}>{t('entry.restHint')}</Text>
        </View>
      ) : null}

      {numeric && status === 'done' ? (
        <View style={[styles.valueCard, { backgroundColor: theme.surface }]}>
          <Pressable onPress={() => adjust(-habit.step)} accessibilityRole="button" accessibilityLabel={t('common.decrease')} style={[styles.round, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.roundText, { color: theme.text }]}>−</Text>
          </Pressable>
          <View style={styles.valueBox}>
            <TextInput
              value={valueText}
              onChangeText={setValueText}
              keyboardType="decimal-pad"
              accessibilityLabel={t('entry.value')}
              style={[styles.valueInput, { color: theme.text }]}
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {habit.unit || ' '} {habit.kind === 'count' ? `/ ${formatValue(habit, habit.target)}` : ''}
            </Text>
          </View>
          <Pressable onPress={() => adjust(habit.step)} accessibilityRole="button" accessibilityLabel={t('common.increase')} style={[styles.round, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={[styles.roundText, { color: theme.text }]}>＋</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.noteWrap}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('entry.note')}</Text>
        <TextInput
          value={note}
          onChangeText={setNoteText}
          placeholder={t('entry.notePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          multiline
          autoFocus={focus === 'note'}
          maxLength={5000}
          accessibilityLabel={t('entry.note')}
          style={[styles.note, { color: theme.text, backgroundColor: theme.surface }]}
        />
      </View>

      <Pressable
        onPress={save}
        disabled={!valid}
        accessibilityRole="button"
        style={({ pressed }) => [styles.save, { backgroundColor: theme.accent, opacity: !valid ? 0.4 : pressed ? 0.8 : 1 }]}>
        <Text style={[styles.saveText, { color: theme.accentText }]}>{t('common.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.l, gap: spacing.m },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  name: { fontSize: 19, fontWeight: '800' },
  day: { fontSize: 14 },
  chips: { flexDirection: 'row', gap: spacing.s },
  hint: { fontSize: 13, lineHeight: 18 },
  rest: { gap: spacing.s, paddingVertical: spacing.s },
  center: { textAlign: 'center' },
  valueCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 22, fontWeight: '700' },
  valueBox: { flex: 1, alignItems: 'center' },
  valueInput: { fontSize: 30, fontWeight: '800', textAlign: 'center', minWidth: 100 },
  noteWrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '700', marginLeft: spacing.xs },
  note: { minHeight: 96, borderRadius: radius.m, padding: spacing.m, fontSize: 16, lineHeight: 22, textAlignVertical: 'top' },
  save: { borderRadius: radius.full, paddingVertical: spacing.m, alignItems: 'center' },
  saveText: { fontSize: 17, fontWeight: '800' },
});
