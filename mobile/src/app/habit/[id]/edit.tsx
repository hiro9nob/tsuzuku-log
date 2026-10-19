import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { HabitForm, isValidInput } from '@/components/HabitForm';
import { useToday } from '@/hooks/useToday';
import { archiveHabit, deleteHabit, getHabit, updateHabit, type HabitInput } from '@/lib/habits';
import { cleanupIconImages } from '@/lib/iconImages';
import { scheduleReschedule } from '@/lib/notifications';
import { radius, spacing, useTheme } from '@/theme';

export default function EditHabitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = useToday();
  const [input, setInput] = useState<HabitInput | null>(() => getHabit(id));
  const [archived] = useState(() => getHabit(id)?.archivedDay != null);
  if (!input) return null;
  const valid = isValidInput(input);

  const save = () => {
    if (!valid) return;
    updateHabit(id, input);
    scheduleReschedule();
    cleanupIconImages();
    router.back();
  };

  // アーカイブは取り消せる（いつでも戻せる）ので、確認しない
  const archive = () => {
    archiveHabit(id, today);
    scheduleReschedule();
    router.dismissAll();
  };

  // 取り消せない操作なので確認する
  const remove = () =>
    Alert.alert(t('form.deleteTitle', { name: input.name }), t('form.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deleteHabit(id);
          scheduleReschedule();
          cleanupIconImages();
          router.dismissAll();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('form.editTitle'),
          headerLeft: () => (
            <Pressable
              onPress={() => {
                router.back();
                cleanupIconImages();
              }}
              accessibilityRole="button"
              hitSlop={8}>
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <HabitForm value={input} onChange={setInput} />
        {!archived ? (
        <Pressable
          onPress={archive}
          accessibilityRole="button"
          accessibilityHint={t('archive.hint')}
          style={({ pressed }) => [styles.delete, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.deleteText, { color: theme.text }]}>{t('archive.action')}</Text>
          <Text style={[styles.subText, { color: theme.textSecondary }]}>{t('archive.hint')}</Text>
        </Pressable>
        ) : null}
        <Pressable
          onPress={remove}
          accessibilityRole="button"
          style={({ pressed }) => [styles.delete, { backgroundColor: theme.surface, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.deleteText, { color: theme.danger }]}>{t('form.delete')}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, paddingBottom: spacing.xl * 2, gap: spacing.l },
  headerButton: { fontSize: 17, paddingHorizontal: spacing.xs },
  bold: { fontWeight: '700' },
  delete: { borderRadius: radius.l, padding: spacing.m, alignItems: 'center' },
  deleteText: { fontSize: 16, fontWeight: '700' },
  subText: { fontSize: 13, marginTop: 2, textAlign: 'center' },
});
