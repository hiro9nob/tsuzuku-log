import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_INPUT, HabitForm, isValidInput } from '@/components/HabitForm';
import { HabitIcon } from '@/components/HabitIcon';
import { useToday } from '@/hooks/useToday';
import { parseSchedule } from '@/lib/habit';
import { createHabit, type HabitInput } from '@/lib/habits';
import { cleanupIconImages } from '@/lib/iconImages';
import { scheduleReschedule } from '@/lib/notifications';
import { SUGGESTIONS } from '@/lib/suggestions';
import { radius, spacing, useTheme } from '@/theme';

function devPreset(type: string) {
  if (type === 'monthlyWeekday') return { type, weeks: [1, 3], days: [0, 6] };
  if (type === 'weekdays') return { type, days: [1, 2, 3, 4, 5] };
  return { type };
}

export default function NewHabitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const today = useToday();
  // 開発版だけ：?devSchedule=monthlyWeekday などで、その頻度を選んだ状態から開く（シミュレータでの確かめ用）
  const { devSchedule, devScroll } = useLocalSearchParams<{ devSchedule?: string; devScroll?: string }>();
  const [input, setInput] = useState(() =>
    __DEV__ && devSchedule ? { ...DEFAULT_INPUT, schedule: parseSchedule(JSON.stringify(devPreset(devSchedule))) } : DEFAULT_INPUT,
  );
  // 候補を選んだら、フォームを作り直す（数値の入力欄は、打っている途中の文字を持っているため）
  const [formKey, setFormKey] = useState(0);
  const valid = isValidInput(input);

  // 2つ目からも候補を使えるようにする（名前を打ち始めたら隠す）
  const pickSuggestion = (s: (typeof SUGGESTIONS)[number]) => {
    const { unitKey, ...rest } = s.input;
    const next: HabitInput = { ...rest, endDay: null, name: t(`suggestions.${s.id}`), unit: unitKey ? t(`units.${unitKey}`) : '' };
    setInput(next);
    setFormKey((k) => k + 1);
  };
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (!__DEV__ || !devScroll) return;
    const timer = setTimeout(() => scrollRef.current?.scrollTo({ y: Number(devScroll), animated: false }), 1000);
    return () => clearTimeout(timer);
  }, [devScroll]);

  const save = () => {
    if (!valid) return;
    createHabit(input, today);
    scheduleReschedule();
    cleanupIconImages();
    router.back();
  };

  // 作るのをやめたら、選んだ画像も片付ける
  const cancel = () => {
    router.back();
    cleanupIconImages();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('form.newTitle'),
          headerLeft: () => (
            <Pressable onPress={cancel} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.headerButton, { color: theme.text }]}>{t('common.cancel')}</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={save} disabled={!valid} accessibilityRole="button" accessibilityState={{ disabled: !valid }} hitSlop={8}>
              <Text style={[styles.headerButton, styles.bold, { color: theme.text, opacity: valid ? 1 : 0.35 }]}>{t('common.save')}</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        ref={scrollRef}>
        {input.name === '' ? (
          <View style={styles.suggestions}>
            <Text style={[styles.suggestionsTitle, { color: theme.textSecondary }]}>{t('form.suggestions')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => pickSuggestion(s)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.chip, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
                  <HabitIcon icon={s.input.icon} color={s.input.color} size={24} />
                  <Text style={[styles.chipText, { color: theme.text }]}>{t(`suggestions.${s.id}`)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <HabitForm key={formKey} value={input} onChange={setInput} autoFocus={formKey === 0} collapsible />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, paddingBottom: spacing.xl * 2, gap: spacing.l },
  suggestions: { gap: spacing.s },
  suggestionsTitle: { fontSize: 13, fontWeight: '700', marginLeft: spacing.s },
  chips: { gap: spacing.s },
  chip: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.full, paddingLeft: spacing.s, paddingRight: spacing.m, paddingVertical: 6 },
  chipText: { fontSize: 15, fontWeight: '600' },
  headerButton: { fontSize: 17, paddingHorizontal: spacing.xs },
  bold: { fontWeight: '700' },
});
