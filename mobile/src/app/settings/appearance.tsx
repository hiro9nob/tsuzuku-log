import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProBadge } from '@/components/ProBadge';
import { SettingsRow, SettingsSection } from '@/components/SettingsRow';
import { useProGate } from '@/hooks/useProGate';
import { useThemeName } from '@/hooks/useThemeName';
import { useIsPro } from '@/lib/pro';
import { useSettings } from '@/lib/settings';
import { APPEARANCES, resolveTheme, THEMES, type ThemeDef } from '@/lib/themeColors';
import { radius, spacing, useTheme } from '@/theme';

/**
 * 外観（docs/design-sample/color-theme.png）：ライト／ダークとデフォルトのテーマは無料。カラーテーマ10色は Pro。
 * テーマは1行ずつ、3つの丸（メイン、サブ、背景）と名前で並べる
 */
export default function AppearanceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isPro = useIsPro();
  const gate = useProGate();
  const themeName = useThemeName();
  const appearance = useSettings((s) => s.appearance);
  const chosen = useSettings((s) => s.theme);
  const set = useSettings((s) => s.set);
  const active = resolveTheme(chosen, isPro).id;

  const pick = (def: ThemeDef) => {
    if (def.pro && !gate(t('pro.features.themes'))) return;
    set('theme', def.id);
  };

  const row = (def: ThemeDef) => {
    const selected = active === def.id;
    const locked = def.pro && !isPro;
    return (
      <Pressable
        key={def.id}
        onPress={() => pick(def)}
        accessibilityRole="button"
        accessibilityLabel={themeName(def)}
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.surface, borderColor: selected ? theme.text : 'transparent', opacity: pressed ? 0.7 : 1 },
        ]}>
        <View style={styles.dots}>
          {def.swatches.map((c, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: c, borderColor: theme.divider }]} />
          ))}
        </View>
        <View style={styles.nameWrap}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {themeName(def)}
          </Text>
          {def.pro ? <ProBadge locked={false} /> : null}
        </View>
        {selected ? (
          <Ionicons name="checkmark-circle" size={26} color={theme.text} />
        ) : locked ? (
          <Ionicons name="lock-closed" size={20} color={theme.textSecondary} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: t('appearance.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsSection>
          {APPEARANCES.map((a, i) => (
            <SettingsRow key={a} first={i === 0} label={t(`appearance.modes.${a}`)} checked={appearance === a} onPress={() => set('appearance', a)} />
          ))}
        </SettingsSection>
        <View style={styles.group}>
          <Text style={[styles.title, { color: theme.textSecondary }]}>{t('appearance.color')}</Text>
          {THEMES.map(row)}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.m, gap: spacing.l, paddingBottom: spacing.xl * 2 },
  group: { gap: spacing.s },
  title: { fontSize: 13, fontWeight: '700', marginLeft: spacing.m },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    borderWidth: 2,
    borderRadius: radius.l,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '600' },
});
