import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { HabitIcon } from '@/components/HabitIcon';
import { ProBadge } from '@/components/ProBadge';
import { useData } from '@/hooks/useData';
import { useProGate } from '@/hooks/useProGate';
import { formatDay } from '@/lib/format';
import { listHabits, listNotes } from '@/lib/habits';
import { useIsPro } from '@/lib/pro';
import { radius, spacing, useTheme } from '@/theme';

/** メモの一覧（無料）。検索は Pro */
export default function NotesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const isPro = useIsPro();
  const gate = useProGate();
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const [query, setQuery] = useState('');
  const effectiveQuery = isPro ? query : '';
  const notes = useData(useCallback(() => listNotes({ habitId, query: effectiveQuery }), [habitId, effectiveQuery]));
  const habits = useData(useCallback(() => new Map(listHabits().map((h) => [h.id, h])), []));

  return (
    <>
      <Stack.Screen options={{ title: t('notes.title') }} />
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={[styles.search, { backgroundColor: theme.surface }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              editable={isPro}
              onPressIn={() => {
                if (!isPro) gate(t('pro.features.search'));
              }}
              placeholder={t('notes.search')}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={t('notes.search')}
              clearButtonMode="while-editing"
              style={[styles.searchInput, { color: theme.text }]}
            />
            {!isPro ? <ProBadge /> : null}
          </View>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.textSecondary }]}>{effectiveQuery ? t('notes.noResults') : t('notes.empty')}</Text>}
        renderItem={({ item }) => {
          const h = habits.get(item.habitId);
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/entry', params: { habitId: item.habitId, day: item.day, focus: 'note' } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.note, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
              {h ? <HabitIcon icon={h.icon} color={h.color} size={32} /> : null}
              <View style={styles.texts}>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {formatDay(item.day, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
                  {h ? ` · ${h.name}` : ''}
                </Text>
                <Text style={[styles.text, { color: theme.text }]}>{item.text}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.s, paddingBottom: spacing.xl * 2 },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.full, paddingHorizontal: spacing.m, marginBottom: spacing.s },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: spacing.s + 2 },
  empty: { fontSize: 15, textAlign: 'center', marginTop: spacing.xl },
  note: { flexDirection: 'row', gap: spacing.m, borderRadius: radius.l, padding: spacing.m },
  texts: { flex: 1, gap: 4 },
  meta: { fontSize: 12, fontWeight: '600' },
  text: { fontSize: 15, lineHeight: 22 },
});
