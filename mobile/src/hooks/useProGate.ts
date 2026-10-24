import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useIsPro } from '@/lib/pro';

/**
 * Pro の機能を使おうとした瞬間だけ、小さな説明を出す（docs/tsuzuku-log-concept.md「Pro」）。
 * Pro なら true を返し、そうでなければ説明を出して false
 */
export function useProGate() {
  const { t } = useTranslation();
  const router = useRouter();
  const isPro = useIsPro();
  return useCallback(
    (feature: string): boolean => {
      if (isPro) return true;
      Alert.alert(t('pro.gateTitle', { feature }), t('pro.gateBody'), [
        { text: t('common.close'), style: 'cancel' },
        { text: t('pro.gateSee'), onPress: () => router.push('/pro') },
      ]);
      return false;
    },
    [isPro, router, t],
  );
}
