import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

/** 記録した直後に出す帯：「取り消す」と「ひとこと」 */
export function UndoBar({ message, onUndo, onNote }: { message: string; onUndo: () => void; onNote: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: theme.text }]} accessibilityLiveRegion="polite">
      <Text style={[styles.message, { color: theme.background }]} numberOfLines={1}>
        {message}
      </Text>
      <Pressable onPress={onNote} accessibilityRole="button" hitSlop={8} style={styles.action}>
        <Text style={[styles.actionText, { color: theme.background }]}>{t('today.note')}</Text>
      </Pressable>
      <Pressable onPress={onUndo} accessibilityRole="button" hitSlop={8} style={styles.action}>
        <Text style={[styles.actionText, { color: theme.background }]}>{t('today.undo')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    borderRadius: radius.full,
    paddingLeft: spacing.l,
    paddingRight: spacing.s,
    paddingVertical: spacing.s,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { flex: 1, fontSize: 15, fontWeight: '600' },
  action: { paddingHorizontal: spacing.m, paddingVertical: spacing.s },
  actionText: { fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' },
});
