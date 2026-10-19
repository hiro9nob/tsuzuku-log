import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/Chip';
import { useStreakLabel } from '@/components/HabitRow';
import { ProBadge } from '@/components/ProBadge';
import { Illustration } from '@/components/Illustration';
import { MONO_CARD, ShareCard, type CardColors, type CardFormat, type CardLayout } from '@/components/ShareCard';
import { useHabitView } from '@/hooks/useHabits';
import { useProGate } from '@/hooks/useProGate';
import { useThemeName } from '@/hooks/useThemeName';
import { useToday } from '@/hooks/useToday';
import { addDays } from '@/lib/day';
import { effectiveIcon } from '@/lib/icons';
import { useIsPro } from '@/lib/pro';
import { useWeekStart } from '@/lib/settings';
import { dayStatus } from '@/lib/stats';
import { THEMES, type ThemeId } from '@/lib/themeColors';
import { radius, spacing, useTheme } from '@/theme';

const RECENT_DAYS = 14;
/** 節目のお祝いのイラストの高さ */
const CELEBRATE_ILLUSTRATION = 110;
/** 節目のお祝いで、カード以外に要る高さ（モーダルの上の隙間、見出し、説明、シェアと閉じるのボタン、すき間） */
const CELEBRATE_CHROME = 340;

function cardColorsOf(themeId: ThemeId | null): CardColors {
  const def = themeId ? THEMES.find((x) => x.id === themeId) : undefined;
  if (!def) return MONO_CARD;
  const p = def.light;
  return { background: p.accentSoft, text: p.text, sub: p.textSecondary, accent: p.accent, empty: '#FFFFFF' };
}

/**
 * シェアカード。milestone があるときは節目のお祝い（「シェア」と「閉じる」だけ）。
 * 画像は端末の中で作り、OS の共有シートで渡す（サーバーには送らない）
 */
export default function ShareScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { habitId, milestone, format: initialFormat } = useLocalSearchParams<{ habitId: string; milestone?: string; format?: string }>();
  const today = useToday();
  const weekStart = useWeekStart();
  const view = useHabitView(habitId, today);
  const streakLabel = useStreakLabel();
  const themeName = useThemeName();
  const isPro = useIsPro();
  const gate = useProGate();
  const cardRef = useRef<View>(null);
  const [format, setFormat] = useState<CardFormat>(initialFormat === 'square' ? 'square' : 'story');
  const [secret, setSecret] = useState(false);
  const [layout, setLayout] = useState<CardLayout>('classic');
  const [cardTheme, setCardTheme] = useState<ThemeId | null>(null);
  const [busy, setBusy] = useState(false);

  if (!view) return null;
  const { habit, entries, streaks } = view;
  const celebrating = milestone !== undefined;
  const number = celebrating ? Number(milestone) : streaks.current;
  const statuses = Array.from({ length: RECENT_DAYS }, (_, i) => dayStatus(habit, entries, addDays(today, i - RECENT_DAYS + 1), today, weekStart));
  // 節目のお祝いでは「シェア」と「閉じる」がスクロールせずに見えるよう、イラスト・見出し・ボタンの分を引いた高さにカードを収める
  const celebrateCardHeight = screenHeight - insets.top - insets.bottom - CELEBRATE_ILLUSTRATION - CELEBRATE_CHROME;
  const previewWidth = Math.max(
    140,
    Math.min(screenWidth - spacing.l * 2, format === 'story' ? 260 : 320, celebrating ? (celebrateCardHeight * 9) / 16 : Infinity),
  );
  const colors = cardColorsOf(isPro ? cardTheme : null);

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: format === 'story' ? 1920 : 1080,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: t('share.button') });
    } catch (e) {
      console.warn('[share] failed', e);
      Alert.alert(t('share.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background, paddingTop: insets.top + spacing.s }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {celebrating ? <Illustration name="milestone" height={CELEBRATE_ILLUSTRATION} /> : null}
        <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
          {celebrating ? t('share.celebrateTitle', { streak: streakLabel(number, streaks.unit) }) : t('share.title')}
        </Text>
        {celebrating ? <Text style={[styles.body, { color: theme.textSecondary }]}>{t('share.celebrateBody')}</Text> : null}

        <View style={styles.preview}>
          <ShareCard
            ref={cardRef}
            width={previewWidth}
            format={format}
            layout={isPro ? layout : 'classic'}
            colors={colors}
            icon={effectiveIcon(habit.icon, isPro)}
            name={secret ? t('share.secretName') : habit.name}
            streak={t(`streakUnit.${streaks.unit}`, { count: number })}
            streakNumber={number}
            statuses={statuses}
            appName={t('app.name')}
            headline={celebrating ? t('share.milestoneHeadline') : undefined}
          />
        </View>

        {!celebrating ? (
          <View style={[styles.options, { backgroundColor: theme.surface }]}>
            <View style={styles.chips}>
              <Chip grow label={t('share.story')} selected={format === 'story'} onPress={() => setFormat('story')} />
              <Chip grow label={t('share.square')} selected={format === 'square'} onPress={() => setFormat('square')} />
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.text }]}>{t('share.hideName')}</Text>
              <Switch value={secret} onValueChange={setSecret} accessibilityLabel={t('share.hideName')} />
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.text }]}>{t('share.designs')}</Text>
              {!isPro ? <ProBadge /> : null}
            </View>
            <View style={styles.chips}>
              <Chip grow label={t('share.layoutClassic')} selected={!isPro || layout === 'classic'} onPress={() => setLayout('classic')} />
              <Chip
                grow
                label={t('share.layoutBold')}
                selected={isPro && layout === 'bold'}
                onPress={() => {
                  if (gate(t('pro.features.cards'))) setLayout('bold');
                }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
              <Swatch color={MONO_CARD.accent} selected={!isPro || cardTheme === null} label={t('share.mono')} onPress={() => setCardTheme(null)} />
              {THEMES.filter((x) => x.pro).map((x) => (
                <Swatch
                  key={x.id}
                  color={x.light.accent}
                  selected={isPro && cardTheme === x.id}
                  label={themeName(x)}
                  onPress={() => {
                    if (gate(t('pro.features.cards'))) setCardTheme(x.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <Pressable
          onPress={share}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, { backgroundColor: theme.accent, opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}>
          <Text style={[styles.primaryText, { color: theme.accentText }]}>{t('share.button')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.secondary}>
          <Text style={[styles.secondaryText, { color: theme.text }]}>{t('common.close')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Swatch({ color, selected, label, onPress }: { color: string; selected: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.swatchRing, { borderColor: selected ? theme.text : 'transparent' }]}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.l, gap: spacing.m },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.s,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  options: { borderRadius: radius.l, padding: spacing.m, gap: spacing.m },
  chips: { flexDirection: 'row', gap: spacing.s },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  label: { flex: 1, fontSize: 16 },
  swatches: { gap: spacing.xs },
  swatchRing: { borderWidth: 2, borderRadius: radius.full, padding: 2 },
  swatch: { width: 28, height: 28, borderRadius: radius.full },
  primary: { borderRadius: radius.full, paddingVertical: spacing.m, alignItems: 'center' },
  primaryText: { fontSize: 17, fontWeight: '800' },
  secondary: { paddingVertical: spacing.m, alignItems: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
