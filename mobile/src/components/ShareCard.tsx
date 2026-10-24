import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { iconImageUri } from '@/lib/iconImages';
import { FALLBACK_ICON, parseIcon } from '@/lib/icons';
import { BRAND } from '@/lib/themeColors';
import type { DayStatus } from '@/lib/stats';

export type CardFormat = 'story' | 'square';
export type CardLayout = 'classic' | 'bold';

/** カードの色：無料はモノクロ、Pro はカラーテーマの色 */
export type CardColors = { background: string; text: string; sub: string; accent: string; empty: string };

/** 無料のカード：白地に、アクセントはアイコンと同じ緑 */
export const MONO_CARD: CardColors = { background: '#FFFFFF', text: '#1C1C1E', sub: '#5F6168', accent: BRAND.light, empty: '#E4E4E7' };

type Props = {
  width: number;
  format: CardFormat;
  layout: CardLayout;
  colors: CardColors;
  icon: string;
  name: string;
  streak: string;
  streakNumber: number;
  statuses: DayStatus[];
  appName: string;
  headline?: string;
};

/**
 * シェアカード。載せるもの：習慣の名前とアイコン、いまの連続、直近の点（お休みは中空の丸）、アプリ名。
 * メモ、ほかの習慣、達成率は載せない
 */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { width, format, layout, colors, icon, name, streak, streakNumber, statuses, appName, headline },
  ref,
) {
  const height = format === 'story' ? (width * 16) / 9 : width;
  const u = width / 100;
  // 正方形は縦が短いので、縦に並ぶものを小さくして、下のクレジットに重ならないようにする
  const k = format === 'square' ? 0.62 : 1;
  const v = parseIcon(icon);
  const imageUri = v.type === 'image' ? iconImageUri(v.file) : null;
  const dotSize = Math.min(5.5 * u, (width - 16 * u) / statuses.length - 1.5 * u);

  return (
    <View ref={ref} collapsable={false} style={[styles.card, { width, height, backgroundColor: colors.background, padding: 8 * u }]}>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { width: 18 * k * u, height: 18 * k * u, borderRadius: 9 * k * u, borderColor: colors.accent, borderWidth: 0.8 * u }]}>
          {v.type === 'image' && imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 18 * k * u, height: 18 * k * u }} />
          ) : v.type === 'emoji' ? (
            <Text style={{ fontSize: 9 * k * u }}>{v.text}</Text>
          ) : (
            <Ionicons name={(v.type === 'ion' ? v.name : FALLBACK_ICON) as ComponentProps<typeof Ionicons>['name']} size={9.5 * k * u} color={colors.accent} />
          )}
        </View>
        <Text style={[styles.name, { color: colors.text, fontSize: 6 * u, marginTop: 3 * k * u }]} numberOfLines={format === 'square' ? 1 : 2}>
          {name}
        </Text>
        {headline ? <Text style={[styles.sub, { color: colors.sub, fontSize: 4 * u, marginTop: 1 * u }]}>{headline}</Text> : null}
        <Text
          style={[
            styles.number,
            { color: layout === 'bold' ? colors.accent : colors.text, fontSize: (layout === 'bold' ? 40 : 28) * k * u, marginTop: 3 * k * u },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {streakNumber}
        </Text>
        <Text style={[styles.sub, { color: colors.sub, fontSize: 4.6 * u }]}>{streak}</Text>
        <View style={[styles.dots, { gap: 1.5 * u, marginTop: 6 * k * u }]}>
          {statuses.map((s, i) => {
            const base = { width: dotSize, height: dotSize, borderRadius: dotSize / 2 };
            if (s === 'done') return <View key={i} style={[base, { backgroundColor: colors.accent }]} />;
            if (s === 'partial') return <View key={i} style={[base, { backgroundColor: colors.accent, opacity: 0.4 }]} />;
            if (s === 'rest') return <View key={i} style={[base, { borderWidth: 0.6 * u, borderColor: colors.accent }]} />;
            return <View key={i} style={[base, { backgroundColor: colors.empty }]} />;
          })}
        </View>
      </View>
      <View style={[styles.footer, { gap: 1.5 * u, marginTop: 2 * u }]}>
        <View style={styles.logo}>
          <View style={[styles.o, { width: 3 * u, height: 3 * u, borderRadius: 1.5 * u, backgroundColor: colors.accent }]} />
          <View style={[styles.o, { width: 3 * u, height: 3 * u, borderRadius: 1.5 * u, borderWidth: 0.5 * u, borderColor: colors.accent }]} />
        </View>
        <Text style={[styles.app, { color: colors.sub, fontSize: 3.6 * u }]}>{appName}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  center: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontWeight: '800', textAlign: 'center' },
  number: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  sub: { fontWeight: '600', textAlign: 'center' },
  dots: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logo: { flexDirection: 'row', gap: 2 },
  o: {},
  app: { fontWeight: '700', letterSpacing: 0.3 },
});
