import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme';

// タブは3つ：きょう、振り返り、マイページ
export default function TabsLayout() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <NativeTabs
      backgroundColor={theme.background}
      // 画面のスクロールは見出しの下の ScrollView なので、タブバーは常に背景を付ける（文字が重ならないように）
      disableTransparentOnScrollEdge
      indicatorColor={theme.accentSoft}
      iconColor={{ default: theme.textSecondary, selected: theme.accent }}
      labelStyle={{ default: { color: theme.textSecondary }, selected: { color: theme.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.today')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'circle.circle', selected: 'circle.circle.fill' }} md="radio_button_checked" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>{t('tabs.review')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>{t('tabs.me')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
