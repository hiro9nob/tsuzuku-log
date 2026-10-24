import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitIcon } from '@/components/HabitIcon';
import { useData } from '@/hooks/useData';
import { listHabits, reorderHabits } from '@/lib/habits';
import { radius, spacing, useTheme } from '@/theme';

/** 手動の並べ替え（無料） */
export default function ReorderScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const habits = useData(useCallback(() => listHabits(), []));

  const move = (index: number, delta: number) => {
    const ids = habits.map((h) => h.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderHabits(ids);
  };

  return (
    <>
      <Stack.Screen options={{ title: t('today.reorder') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {habits.map((h, i) => (
          <View key={h.id} style={[styles.row, { backgroundColor: theme.surface }]}>
            <HabitIcon icon={h.icon} color={h.color} size={36} />
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
              {h.name}
            </Text>
            <Pressable onPress={() => move(i, -1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel={t('reorder.up', { name: h.name })} hitSlop={6} style={{ opacity: i === 0 ? 0.25 : 1 }}>
              <Ionicons name="chevron-up" size={24} color={theme.text} />
            </Pressable>
            <Pressable
              onPress={() => move(i, 1)}
              disabled={i === habits.length - 1}
              accessibilityRole="button"
              accessibilityLabel={t('reorder.down', { name: h.name })}
              hitSlop={6}
              style={{ opacity: i === habits.length - 1 ? 0.25 : 1 }}>
              <Ionicons name="chevron-down" size={24} color={theme.text} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, borderRadius: radius.l, padding: spacing.m },
  name: { flex: 1, fontSize: 16, fontWeight: '700' },
});
