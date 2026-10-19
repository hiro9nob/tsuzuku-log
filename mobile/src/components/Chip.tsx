import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

export function Chip({
  label,
  selected,
  onPress,
  accessory,
  grow,
  compact,
  style,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessory?: ReactNode;
  grow?: boolean;
  /** 曜日のように、短い選択肢を1行にたくさん並べるとき：左右の余白を小さくし、入らなければ文字を少し縮める */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        grow && styles.grow,
        compact && styles.compact,
        style,
        {
          backgroundColor: selected ? theme.accent : theme.surfaceAlt,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Text
        style={[styles.label, { color: selected ? theme.accentText : theme.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.7}>
        {label}
      </Text>
      {accessory}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radius.s,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  grow: { flexGrow: 1, flexBasis: 0 },
  compact: { paddingHorizontal: spacing.xs },
  label: { fontSize: 15, fontWeight: '600' },
});
