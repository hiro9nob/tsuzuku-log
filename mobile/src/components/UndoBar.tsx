import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

/**
 * 記録した直後に出す帯：「取り消す」と「ひとこと」。
 * 節目に届いたときは、同じ帯で控えめに祝い、「シェア」と「取り消す」を出す（画面は切り替えない）
 */
export function UndoBar({
  message,
  onUndo,
  onNote,
  onShare,
}: {
  message: string;
  onUndo?: () => void;
  onNote?: () => void;
  onShare?: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const celebrating = !!onShare;
  const background = celebrating ? theme.accent : theme.text;
  const foreground = celebrating ? theme.accentText : theme.background;
  const actions = [
    onShare ? { label: t('today.share'), onPress: onShare } : null,
    onNote ? { label: t('today.note'), onPress: onNote } : null,
    onUndo ? { label: t('today.undo'), onPress: onUndo } : null,
  ].filter((a) => a !== null);
  return (
    <View style={[styles.bar, { backgroundColor: background }]} accessibilityLiveRegion="polite">
      <Text style={[styles.message, { color: foreground }]} numberOfLines={2}>
        {message}
      </Text>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={a.onPress} accessibilityRole="button" hitSlop={8} style={styles.action}>
          <Text style={[styles.actionText, { color: foreground }]}>{a.label}</Text>
        </Pressable>
      ))}
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
