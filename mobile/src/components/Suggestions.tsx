import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Day } from '@/lib/day';
import { createHabit } from '@/lib/habits';
import { SUGGESTIONS } from '@/lib/suggestions';
import { radius, spacing, useTheme } from '@/theme';

import { HabitIcon } from './HabitIcon';
import { Illustration } from './Illustration';

/** はじめて使うとき：候補をタップするだけで1つ目の習慣ができる */
export function Suggestions({ today }: { today: Day }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <Illustration name="welcome" height={110} />
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.title')}</Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{t('onboarding.body')}</Text>
      <View style={styles.list}>
        {SUGGESTIONS.map(({ id, input }) => (
          <Pressable
            key={id}
            onPress={() =>
              createHabit(
                { ...input, endDay: null, name: t(`suggestions.${id}`), unit: input.unitKey ? t(`units.${input.unitKey}`) : '' },
                today,
              )
            }
            accessibilityRole="button"
            accessibilityHint={t('onboarding.addHint')}
            style={({ pressed }) => [styles.item, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
            <HabitIcon icon={input.icon} color={input.color} size={40} />
            <View style={styles.texts}>
              <Text style={[styles.name, { color: theme.text }]}>{t(`suggestions.${id}`)}</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>{t(`suggestions.${id}Detail`)}</Text>
            </View>
            <Ionicons name="add-circle" size={28} color={theme.accent} />
          </Pressable>
        ))}
      </View>
      <Pressable
        onPress={() => router.push('/habit/new')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.custom, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Text style={[styles.customText, { color: theme.accentText }]}>{t('onboarding.custom')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.m },
  title: { fontSize: 22, fontWeight: '800', marginTop: spacing.s },
  body: { fontSize: 15, lineHeight: 22 },
  list: { gap: spacing.s },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.m, borderRadius: radius.l, padding: spacing.m },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '700' },
  meta: { fontSize: 13 },
  custom: { borderRadius: radius.full, paddingVertical: spacing.m, alignItems: 'center', marginTop: spacing.s },
  customText: { fontSize: 17, fontWeight: '800' },
});
