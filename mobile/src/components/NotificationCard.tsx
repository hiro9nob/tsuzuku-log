import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useData } from '@/hooks/useData';
import { listHabits } from '@/lib/habits';
import { permissionState, requestPermission, type PermissionState } from '@/lib/notifications';
import { useSettings } from '@/lib/settings';
import { radius, spacing, useTheme } from '@/theme';

function hasReminders() {
  return listHabits().some((h) => h.reminders.length > 0);
}

/**
 * 通知の許可のお願いは、画面の中のカードで行う（いきなり OS のダイアログを出さない）。
 * force のときは、閉じたあとでも出す（設定の画面）
 */
export function NotificationCard({ force = false }: { force?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dismissed = useSettings((s) => s.notificationCardDismissed);
  const summaryEnabled = useSettings((s) => s.summaryEnabled);
  const set = useSettings((s) => s.set);
  const [state, setState] = useState<PermissionState | null>(null);
  const anyReminders = useData(hasReminders);
  const wantsReminders = anyReminders || summaryEnabled;

  useFocusEffect(
    useCallback(() => {
      permissionState().then(setState);
    }, []),
  );

  if (state === null || state === 'granted') return null;
  if (state === 'denied' && !wantsReminders) return null;
  if (state === 'undetermined' && dismissed && !force) return null;

  const denied = state === 'denied';
  return (
    <View style={[styles.card, { backgroundColor: theme.accentSoft }]}>
      <Ionicons name="notifications-outline" size={22} color={theme.text} />
      <Text style={[styles.text, { color: theme.text }]}>{denied ? t('notifications.deniedCard') : t('notifications.card')}</Text>
      <Pressable
        onPress={async () => {
          if (denied) Linking.openSettings().catch(() => {});
          else setState(await requestPermission());
        }}
        accessibilityRole="button"
        hitSlop={8}>
        <Text style={[styles.action, { color: theme.text }]}>{denied ? t('notifications.openSettings') : t('notifications.allow')}</Text>
      </Pressable>
      {!denied && !force ? (
        <Pressable onPress={() => set('notificationCardDismissed', true)} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={8}>
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.l, padding: spacing.m },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
  action: { fontSize: 15, fontWeight: '800' },
});
