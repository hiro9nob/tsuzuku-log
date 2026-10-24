// アプリのロック（Face ID・Touch ID・端末のパスコード）。設定でオンにすると、
// 起動したときと、裏から戻ったときに認証を求める。アプリの切り替え画面では中身を隠す
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { i18n } from './i18n';
import { useSettings } from './settings';

type LockState = {
  /** 認証するまで中身を見せない */
  locked: boolean;
  /** アプリの切り替え画面などで、一時的に中身を隠す（認証は要らない） */
  covered: boolean;
  authenticating: boolean;
  unlock: () => Promise<boolean>;
};

export const useAppLock = create<LockState>((set, get) => ({
  locked: false,
  covered: false,
  authenticating: false,
  unlock: async () => {
    if (get().authenticating) return false;
    set({ authenticating: true });
    const ok = await authenticate(i18n.t('lock.prompt'));
    set({ authenticating: false, ...(ok ? { locked: false, covered: false } : {}) });
    return ok;
  },
}));

/** Face ID などで本人か確かめる。生体認証がなくても、端末のパスコードで確かめる */
export async function authenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: i18n.t('common.cancel') });
    return result.success;
  } catch (e) {
    console.warn('[lock] auth failed', e);
    return false;
  }
}

/** この端末でロックを使えるか（生体認証か、端末のパスコードが設定されている） */
export async function lockAvailable(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

let started = false;

/** 設定を読み込んだあとに1回呼ぶ */
export function startAppLock(): void {
  if (started) return;
  started = true;
  if (useSettings.getState().appLock) useAppLock.setState({ locked: true });
  AppState.addEventListener('change', (state) => {
    if (!useSettings.getState().appLock) return;
    // Face ID の画面が出ているあいだも inactive になるので、そのときは何もしない
    if (useAppLock.getState().authenticating) return;
    if (state === 'background') useAppLock.setState({ locked: true, covered: true });
    else if (state === 'inactive') useAppLock.setState({ covered: true });
    else if (state === 'active') useAppLock.setState({ covered: false });
  });
}
