import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HabitIcon } from '@/components/HabitIcon';
import { useData } from '@/hooks/useData';
import { useToday } from '@/hooks/useToday';
import { formatDay } from '@/lib/format';
import { listArchivedHabits, unarchiveHabit } from '@/lib/habits';
import { scheduleReschedule } from '@/lib/notifications';
import { radius, spacing, useTheme } from '@/theme';

/** アーカイブした習慣。タップで詳細、「戻す」で使う習慣に戻す */
export default function ArchivedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const today = useToday();
  const habits = useData(listArchivedHabits);

  return (
    <>
      <Stack.Screen options={{ title: t('archive.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {habits.length === 0 ? (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{t('archive.empty')}</Text>
        ) : (
          habits.map((h) => (
            <View key={h.id} style={[styles.row, { backgroundColor: theme.surface }]}>
              <Pressable
                onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}
                accessibilityRole="button"
                style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}>
                <HabitIcon icon={h.icon} color={h.color} size={36} />
                <View style={styles.texts}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {h.name}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    {t('archive.since', { date: formatDay(h.archivedDay!, { year: 'numeric', month: 'short', day: 'numeric' }) })}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  unarchiveHabit(h.id, today);
                  scheduleReschedule();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t('archive.restore')} ${h.name}`}
                hitSlop={8}
                style={[styles.restore, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={[styles.restoreText, { color: theme.text }]}>{t('archive.restore')}</Text>
              </Pressable>
            </View>
          ))
        )}
        <Text style={[styles.footer, { color: theme.textSecondary }]}>{t('archive.footer')}</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.s, paddingBottom: spacing.xl * 2 },
  empty: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.l, padding: spacing.m },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13 },
  restore: { borderRadius: radius.full, paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  restoreText: { fontSize: 15, fontWeight: '700' },
  footer: { fontSize: 13, lineHeight: 18, marginTop: spacing.s, marginHorizontal: spacing.s },
});
