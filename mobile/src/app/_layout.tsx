import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appearance, AppState, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { db } from '@/db/client';
import { dayOf } from '@/lib/day';
import { seedDemoData } from '@/lib/demoData';
import { listHabits } from '@/lib/habits';
import { applyLanguage, initI18n } from '@/lib/i18n';
import { autoBackupToICloud } from '@/lib/icloud';
import { cleanupIconImages } from '@/lib/iconImages';
import { rescheduleNotifications } from '@/lib/notifications';
import { useIsPro, usePro } from '@/lib/pro';
import { useRevision } from '@/lib/revision';
import { useSettings } from '@/lib/settings';
import { startAppLock } from '@/lib/appLock';
import { LockScreen } from '@/components/LockScreen';
import { scheduleWidgetSync } from '@/lib/widgetSync';
import { spacing, useTheme } from '@/theme';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const { hydrated, language, appearance, hydrate } = useSettings();
  const initPro = usePro((s) => s.init);
  const isPro = useIsPro();
  const [i18nReady, setI18nReady] = useState(false);
  // 終わるまで DB を使う画面は開かない
  const migration = useMigrations(db, migrations);

  useEffect(() => {
    hydrate();
    initPro();
  }, [hydrate, initPro]);

  // ライト／ダークを OS の表示（タブ、ダイアログ、キーボードなど）ごと切り替える
  useEffect(() => {
    if (!hydrated) return;
    Appearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
  }, [hydrated, appearance]);

  useEffect(() => {
    if (!hydrated) return;
    initI18n(language).then(() => setI18nReady(true));
  }, [hydrated, language]);

  // アプリのロック：設定を読み込んでから始める（ロックがオンなら、起動したときから中身を隠す）
  useEffect(() => {
    if (hydrated) startAppLock();
  }, [hydrated]);

  // 「端末の設定に従う」ときは、アプリに戻ったときに言語を確認し直す
  useEffect(() => {
    if (language !== 'system') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') applyLanguage('system');
    });
    return () => sub.remove();
  }, [language]);

  const ready = hydrated && i18nReady && (migration.success || migration.error !== undefined);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // 通知は近い日の分だけ予約するので、開くたび・設定や Pro の状態が変わるたびに予約し直す
  const { dayStartHour, weekStart, summaryEnabled, summaryTime } = useSettings();
  useEffect(() => {
    if (!ready || !migration.success) return;
    void rescheduleNotifications();
    cleanupIconImages();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // ウィジェットから記録したときのため、DB を読み直す
        useRevision.getState().bump();
        void rescheduleNotifications();
      } else if (state === 'background') {
        void autoBackupToICloud();
      }
    });
    return () => sub.remove();
  }, [ready, migration.success, dayStartHour, weekStart, summaryEnabled, summaryTime, isPro, language]);

  // ウィジェット・ロック画面・コントロールセンターに渡す内容を、記録や設定が変わるたびに書き直す
  const revision = useRevision((s) => s.revision);
  const theme_ = useSettings((s) => s.theme);
  useEffect(() => {
    if (!ready || !migration.success) return;
    scheduleWidgetSync();
  }, [ready, migration.success, revision, dayStartHour, weekStart, theme_, isPro, language]);

  // 開発版だけ：EXPO_PUBLIC_DEMO_DATA=1 で起動すると、データが空のときに見本を入れる。
  // EXPO_PUBLIC_DEMO_DATA=add なら、今のデータはそのままで、見本を1回だけ足す。
  // EXPO_PUBLIC_DEV_ROUTE を指定すると、起動後にその画面を開く（シミュレータでの確かめ用）
  const router = useRouter();
  const devStarted = useRef(false);
  useEffect(() => {
    if (!__DEV__ || !ready || !migration.success || devStarted.current) return;
    devStarted.current = true;
    const demo = process.env.EXPO_PUBLIC_DEMO_DATA;
    if (demo === '1' && listHabits().length === 0) seedDemoData(dayOf(new Date(), dayStartHour));
    if (demo === 'add') {
      AsyncStorage.getItem('ongo.demoSeeded').then((done) => {
        if (done) return;
        seedDemoData(dayOf(new Date(), dayStartHour));
        void AsyncStorage.setItem('ongo.demoSeeded', '1');
      });
    }
    const route = process.env.EXPO_PUBLIC_DEV_ROUTE;
    // {first} は最初の習慣の ID、{habit:N} は N 番目（0 から）の習慣の ID に置き換える（例：/habit/{habit:3}）
    if (route) {
      const list = listHabits();
      const href = route.replace('{first}', list[0]?.id ?? '').replace(/\{habit:(\d+)\}/, (_, n: string) => list[Number(n)]?.id ?? '');
      setTimeout(() => router.push(href as Href), 2000);
    }
  }, [ready, migration.success, dayStartHour, router]);

  if (!ready) return null;

  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: { ...navTheme.colors, background: theme.background, card: theme.background, primary: theme.accent, text: theme.text },
        }}>
        <StatusBar style="auto" />
        {migration.error ? (
          <MigrationError />
        ) : (
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.background },
              headerBackButtonDisplayMode: 'minimal',
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.background },
              headerTintColor: theme.text,
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="habit/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="habit/[id]/index" options={{ title: '' }} />
            <Stack.Screen name="habit/[id]/edit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="entry" options={{ presentation: 'formSheet', sheetAllowedDetents: [0.6, 1], headerShown: false }} />
            <Stack.Screen name="share" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="pro" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="notes" />
            <Stack.Screen name="reorder" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/language" />
            <Stack.Screen name="settings/appearance" />
            <Stack.Screen name="settings/icloud" />
            <Stack.Screen name="settings/archived" />
            <Stack.Screen name="settings/vacation" />
          </Stack>
        )}
        <LockScreen />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** マイグレーションに失敗したとき。既存の DB には手を付けない */
function MigrationError() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.error, { backgroundColor: theme.background }]}>
      <Text style={[styles.errorTitle, { color: theme.text }]}>{t('startup.dbError')}</Text>
      <Text style={[styles.errorBody, { color: theme.textSecondary }]}>{t('startup.dbErrorBody')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  error: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.m },
  errorTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorBody: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
