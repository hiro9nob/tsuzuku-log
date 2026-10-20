import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { formatAmount, type Habit } from '@/lib/habit';
import { currentLocale } from '@/lib/i18n';
import { useTheme } from '@/theme';

type Props = {
  habit: Habit;
  /** きょうの値（check は 0 か 1） */
  value: number;
  done: boolean;
  over: boolean;
  rest: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
};

/** 丸いボタン。1タップで記録する。できたらさりげなく弾む。大きさは習慣のアイコンとそろえ、押しやすさの目安の 44pt にする */
export function RecordButton({ habit, value, done, over, rest, label, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const color = theme.habit(habit.color);
  const [scale] = useState(() => new Animated.Value(1));
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 110, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();
    }
    prevDone.current = done;
  }, [done, scale]);

  const filled = done && !over;
  const step = formatAmount(habit.step, currentLocale());

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ checked: habit.kind === 'check' ? done : undefined }}>
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.circle,
            {
              borderColor: over ? theme.textSecondary : color,
              backgroundColor: filled ? color : 'transparent',
              borderStyle: rest ? 'dashed' : 'solid',
              opacity: pressed ? 0.7 : 1,
              transform: [{ scale }],
            },
          ]}>
          {done && habit.kind !== 'limit' ? (
            <Ionicons name="checkmark" size={24} color={theme.isDark ? '#121212' : '#FFFFFF'} />
          ) : habit.kind === 'check' ? null : (
            <Text
              style={[styles.step, { color: filled ? (theme.isDark ? '#121212' : '#FFFFFF') : over ? theme.textSecondary : color }]}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {`+${step}`}
            </Text>
          )}
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 44, height: 44, borderRadius: 22, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  step: { fontSize: 13, fontWeight: '800', paddingHorizontal: 3 },
});
