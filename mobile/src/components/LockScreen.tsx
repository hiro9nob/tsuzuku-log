import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppLock } from '@/lib/appLock';
import { radius, spacing, useTheme } from '@/theme';

/** ロック中に、アプリの上にかぶせる画面。開いたらすぐ認証を求める */
export function LockScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { locked, covered, unlock } = useAppLock();

  useEffect(() => {
    if (!locked) return;
    // 前面に出ているときだけ認証を求める（裏にいるあいだに出すと失敗する）
    if (AppState.currentState === 'active') void unlock();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAppLock.getState().locked) void unlock();
    });
    return () => sub.remove();
  }, [locked, unlock]);

  if (!locked && !covered) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: theme.background }]} accessibilityViewIsModal>
      <View style={styles.logo} accessibilityElementsHidden>
        <View style={[styles.dot, { backgroundColor: theme.accent }]} />
        <View style={[styles.dot, styles.ring, { borderColor: theme.accent }]} />
      </View>
      {locked ? (
        <>
          <Text style={[styles.title, { color: theme.text }]}>{t('lock.title')}</Text>
          <Pressable
            onPress={() => void unlock()}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="lock-open-outline" size={20} color={theme.accentText} />
            <Text style={[styles.buttonText, { color: theme.accentText }]}>{t('lock.unlock')}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.l, zIndex: 1000 },
  logo: { flexDirection: 'row', gap: 10 },
  dot: { width: 36, height: 36, borderRadius: 18 },
  ring: { backgroundColor: 'transparent', borderWidth: 7 },
  title: { fontSize: 17, fontWeight: '700' },
  button: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, borderRadius: radius.full, paddingHorizontal: spacing.l, paddingVertical: spacing.m },
  buttonText: { fontSize: 17, fontWeight: '800' },
});
