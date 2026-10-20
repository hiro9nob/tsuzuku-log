// Android の記録のマス目のウィジェット：置くとき（とあとから）に、出す習慣を選ぶ画面
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { i18n } from '@/lib/i18n';

import { loadWidgetData, type WidgetData } from './data';
import { heatmapKey } from './handler';
import { HeatmapWidget } from './HeatmapWidget';

export function HeatmapConfiguration({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const dark = useColorScheme() === 'dark';
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    loadWidgetData().then(setData);
  }, []);

  if (!data) return <View style={styles.wrap} />;
  const p = dark ? data.dark : data.light;

  const choose = async (habitId: string) => {
    await AsyncStorage.setItem(heatmapKey(widgetInfo.widgetId), habitId);
    const habit = data.habits.find((h) => h.habit.id === habitId);
    renderWidget({
      light: <HeatmapWidget data={data} habit={habit} palette={data.light} dark={false} width={widgetInfo.width} height={widgetInfo.height} />,
      dark: <HeatmapWidget data={data} habit={habit} palette={data.dark} dark width={widgetInfo.width} height={widgetInfo.height} />,
    });
    setResult('ok');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: p.background }]}>
      <Text style={[styles.title, { color: p.text }]}>{i18n.t('widget.chooseHabit')}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {data.habits.length === 0 ? <Text style={{ color: p.textSecondary }}>{i18n.t('widget.empty')}</Text> : null}
        {data.habits.map((h) => (
          <Pressable
            key={h.habit.id}
            onPress={() => void choose(h.habit.id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, { backgroundColor: p.surface, opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.name, { color: p.text }]}>{h.habit.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => setResult('cancel')} accessibilityRole="button" style={styles.cancel}>
        <Text style={{ color: p.text, fontSize: 16 }}>{i18n.t('common.cancel')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: 48, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16 },
  list: { gap: 8, paddingBottom: 24 },
  row: { borderRadius: 16, padding: 16 },
  name: { fontSize: 16, fontWeight: '700' },
  cancel: { alignItems: 'center', paddingVertical: 20 },
});
