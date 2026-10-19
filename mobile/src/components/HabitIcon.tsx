import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { HabitColorId } from '@/lib/habit';
import { iconImageUri } from '@/lib/iconImages';
import { effectiveIcon, FALLBACK_ICON, parseIcon } from '@/lib/icons';
import { useIsPro } from '@/lib/pro';
import { useTheme } from '@/theme';

export function HabitIcon({ icon, color, size = 44 }: { icon: string; color: HabitColorId; size?: number }) {
  const theme = useTheme();
  const c = theme.habit(color);
  // Pro のアイコン・絵文字・画像は、Pro でなくなったら基本のアイコンで表示する（選んだ値は残す）
  const v = parseIcon(effectiveIcon(icon, useIsPro()));
  const [broken, setBroken] = useState(false);
  // 画像のファイルがない（バックアップから戻したときなど）ときは、基本のアイコンにする
  const uri = v.type === 'image' ? iconImageUri(v.file) : null;
  const circle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View
      style={[styles.circle, circle, { backgroundColor: theme.surfaceAlt }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {v.type === 'image' && uri && !broken ? (
        <Image source={{ uri }} style={circle} onError={() => setBroken(true)} />
      ) : v.type === 'emoji' ? (
        <Text style={{ fontSize: size * 0.5 }}>{v.text}</Text>
      ) : (
        <Ionicons
          name={(v.type === 'ion' ? v.name : FALLBACK_ICON) as ComponentProps<typeof Ionicons>['name']}
          size={size * 0.52}
          color={c}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
