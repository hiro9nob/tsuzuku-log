import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PACKAGE_TYPE, PRODUCT_CATEGORY, type PurchasesPackage } from 'react-native-purchases';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SettingsRow, SettingsSection } from '@/components/SettingsRow';
import { dayOf } from '@/lib/day';
import { seedDemoData } from '@/lib/demoData';
import { legalUrl, STORE_NAME } from '@/lib/links';
import { useSettings } from '@/lib/settings';
import { useIsPro, usePro } from '@/lib/pro';
import { radius, spacing, useTheme } from '@/theme';

type Packages = { status: 'loading' } | { status: 'ready'; packages: PurchasesPackage[] } | { status: 'unavailable' };

type FeatureKey = 'themes' | 'colors' | 'icons' | 'repeat' | 'reminders' | 'stats' | 'search' | 'cards';

const FEATURES: { key: FeatureKey; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'themes', icon: 'color-palette-outline' },
  { key: 'colors', icon: 'ellipse-outline' },
  { key: 'icons', icon: 'happy-outline' },
  { key: 'repeat', icon: 'repeat-outline' },
  { key: 'reminders', icon: 'notifications-outline' },
  { key: 'stats', icon: 'stats-chart-outline' },
  { key: 'search', icon: 'search-outline' },
  { key: 'cards', icon: 'image-outline' },
];

// 年額をおすすめとして先頭に
const ORDER: string[] = [PACKAGE_TYPE.ANNUAL, PACKAGE_TYPE.MONTHLY, PACKAGE_TYPE.LIFETIME];

/**
 * 課金の画面はこの1つだけ。年額・月額・買い切りを並べ、価格、自動更新、解約の方法をはっきり書く。
 * 「無料のまま続ける」と「購入を復元」を必ず置く
 */
export default function ProScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const { available, managementURL, refresh, loadPackages, purchase, restore, devOverride, setDevOverride } = usePro();
  const [loaded, setPackages] = useState<Packages>({ status: 'loading' });
  const packages: Packages = available ? loaded : { status: 'unavailable' };
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (isPro || !available) return;
    let canceled = false;
    loadPackages()
      .then((list) => {
        if (canceled) return;
        const sorted = [...list].sort((a, b) => ORDER.indexOf(a.packageType) - ORDER.indexOf(b.packageType));
        setPackages(sorted.length > 0 ? { status: 'ready', packages: sorted } : { status: 'unavailable' });
      })
      .catch((e) => {
        console.warn('[pro] offerings failed', e);
        if (!canceled) setPackages({ status: 'unavailable' });
      });
    return () => {
      canceled = true;
    };
  }, [available, isPro, loadPackages]);

  const onPurchase = async (pkg: PurchasesPackage) => {
    setBusy(true);
    const result = await purchase(pkg);
    setBusy(false);
    if (result === 'purchased') Alert.alert(t('pro.thanks'));
    else if (result === 'pending') Alert.alert(t('pro.pending'));
    else if (result === 'failed') Alert.alert(t('pro.purchaseFailed'));
  };

  const onRestore = async () => {
    setBusy(true);
    const result = await restore();
    setBusy(false);
    Alert.alert(t(result === 'restored' ? 'pro.restored' : result === 'nothing' ? 'pro.restoreNothing' : 'pro.restoreFailed'));
  };

  const openURL = (url: string) => Linking.openURL(url).catch(() => {});

  const packageLabel = (pkg: PurchasesPackage) => {
    switch (pkg.packageType) {
      case PACKAGE_TYPE.MONTHLY:
        return t('pro.monthly');
      case PACKAGE_TYPE.ANNUAL:
        return t('pro.annual');
      case PACKAGE_TYPE.LIFETIME:
        return t('pro.lifetime');
      default:
        return pkg.product.title;
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.m, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.text }]} accessibilityRole="header">
            {t('pro.title')}
          </Text>
          <Text style={[styles.heroBody, { color: theme.textSecondary }]}>{isPro ? t('pro.active') : t('pro.lead')}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.feature}>
              <Ionicons name={f.icon} size={22} color={theme.text} />
              <View style={styles.featureTexts}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{t(`pro.features.${f.key}`)}</Text>
                <Text style={[styles.featureBody, { color: theme.textSecondary }]}>{t(`pro.featureBodies.${f.key}`)}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={[styles.note, { color: theme.textSecondary }]}>{t('pro.freeForever')}</Text>

        {!isPro ? (
          packages.status === 'loading' ? (
            <ActivityIndicator color={theme.text} />
          ) : packages.status === 'unavailable' ? (
            <Text style={[styles.note, { color: theme.textSecondary }]}>{t('pro.unavailable')}</Text>
          ) : (
            <View style={styles.packages}>
              {packages.packages.map((pkg) => {
                const recommended = pkg.packageType === PACKAGE_TYPE.ANNUAL;
                return (
                  <Pressable
                    key={pkg.identifier}
                    disabled={busy}
                    onPress={() => onPurchase(pkg)}
                    accessibilityRole="button"
                    accessibilityLabel={`${packageLabel(pkg)} ${pkg.product.priceString}${recommended ? ` ${t('pro.recommended')}` : ''}`}
                    style={({ pressed }) => [
                      styles.package,
                      recommended
                        ? { backgroundColor: theme.accent }
                        : { backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.divider },
                      { opacity: busy ? 0.5 : pressed ? 0.8 : 1 },
                    ]}>
                    <View style={styles.packageTexts}>
                      <Text style={[styles.packageLabel, { color: recommended ? theme.accentText : theme.text }]}>{packageLabel(pkg)}</Text>
                      {recommended ? (
                        <Text style={[styles.packageSub, { color: theme.accentText }]}>{t('pro.recommended')}</Text>
                      ) : pkg.packageType === PACKAGE_TYPE.LIFETIME ? (
                        <Text style={[styles.packageSub, { color: theme.textSecondary }]}>{t('pro.lifetimeSub')}</Text>
                      ) : null}
                    </View>
                    <Text style={[styles.packagePrice, { color: recommended ? theme.accentText : theme.text }]}>{pkg.product.priceString}</Text>
                  </Pressable>
                );
              })}
              {packages.packages.some((p) => p.product.productCategory === PRODUCT_CATEGORY.SUBSCRIPTION) ? (
                <Text style={[styles.note, { color: theme.textSecondary }]}>{t('pro.subscriptionNote', { store: STORE_NAME })}</Text>
              ) : null}
              <Text style={[styles.note, { color: theme.textSecondary }]}>{t('pro.regionalNote')}</Text>
            </View>
          )
        ) : null}

        <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.stayFree}>
          <Text style={[styles.stayFreeText, { color: theme.text }]}>{isPro ? t('common.close') : t('pro.stayFree')}</Text>
        </Pressable>

        <SettingsSection footer={t('pro.storeNote')}>
          <SettingsRow first label={t('pro.restore')} onPress={busy || !available ? undefined : onRestore} />
          {managementURL ? <SettingsRow label={t('pro.manage')} onPress={() => openURL(managementURL)} /> : null}
          <SettingsRow label={t('pro.terms')} onPress={() => openURL(legalUrl('terms', i18n.language))} />
          <SettingsRow label={t('pro.privacy')} onPress={() => openURL(legalUrl('privacy', i18n.language))} />
        </SettingsSection>

        {__DEV__ ? (
          <SettingsSection title="Developer" footer="開発版だけに出る。ストアの準備なしで Pro の見た目を確かめるための切り替え。">
            <SettingsRow first label="Pro を有効にする（開発用）" checked={devOverride} onPress={() => setDevOverride(!devOverride)} />
            <SettingsRow
              label="見本のデータを入れる（開発用）"
              onPress={() => {
                seedDemoData(dayOf(new Date(), useSettings.getState().dayStartHour));
                Alert.alert('見本のデータを入れました');
              }}
            />
          </SettingsSection>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.m, gap: spacing.m },
  hero: { gap: spacing.s, paddingHorizontal: spacing.s },
  heroTitle: { fontSize: 30, fontWeight: '900' },
  heroBody: { fontSize: 15, lineHeight: 22 },
  card: { borderRadius: radius.l, padding: spacing.s },
  feature: { flexDirection: 'row', gap: spacing.m, padding: spacing.s },
  featureTexts: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 16, fontWeight: '700' },
  featureBody: { fontSize: 13, lineHeight: 18 },
  packages: { gap: spacing.s },
  package: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.l, paddingHorizontal: spacing.l, paddingVertical: spacing.m },
  packageTexts: { flex: 1, gap: 2 },
  packageLabel: { fontSize: 17, fontWeight: '800' },
  packageSub: { fontSize: 12, fontWeight: '600' },
  packagePrice: { fontSize: 17, fontWeight: '800' },
  note: { fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: spacing.s },
  stayFree: { alignItems: 'center', paddingVertical: spacing.m },
  stayFreeText: { fontSize: 16, fontWeight: '700', textDecorationLine: 'underline' },
});
