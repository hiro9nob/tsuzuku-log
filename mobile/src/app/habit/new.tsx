import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { DEFAULT_INPUT, HabitForm, isValidInput } from '@/components/HabitForm';
import { useToday } from '@/hooks/useToday';
import { parseSchedule } from '@/lib/habit';
import { createHabit } from '@/lib/habits';
import { cleanupIconImages } from '@/lib/iconImages';
import { scheduleReschedule } from '@/lib/notifications';
import { spacing, useTheme } from '@/theme';

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
  const valid = isValidInput(input);
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
        <HabitForm value={input} onChange={setInput} autoFocus />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, paddingBottom: spacing.xl * 2 },
  headerButton: { fontSize: 17, paddingHorizontal: spacing.xs },
  bold: { fontWeight: '700' },
});
