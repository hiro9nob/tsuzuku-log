import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { radius, useTheme } from '@/theme';

/** Pro の機能に付ける印。Pro のときは出さない */
export function ProBadge({ locked = true }: { locked?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.accentSoft }]} accessibilityLabel={t('pro.badge')}>
      {locked ? <Ionicons name="lock-closed" size={10} color={theme.text} /> : null}
      <Text style={[styles.text, { color: theme.text }]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
