import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { create } from 'zustand';

// docs/tsuzuku-log-concept.md「無料とProの線引き」：RevenueCat。Pro は1つの権利（entitlement）で判定する
export const PRO_ENTITLEMENT = 'pro';

// RevenueCat の公開用 API キー（アプリに埋め込んでいいもの）。app.config.ts の variant ごとに書く
// app.config.ts の null は、設定を書き出すときに {} になるので、文字列のときだけ使う
const revenueCatApiKey = Constants.expoConfig?.extra?.revenueCatApiKey as
  | { ios?: unknown; android?: unknown }
  | undefined;
const platformKey = Platform.select({ ios: revenueCatApiKey?.ios, android: revenueCatApiKey?.android });
const API_KEY = typeof platformKey === 'string' && platformKey !== '' ? platformKey : undefined;

export type PurchaseResult = 'purchased' | 'pending' | 'cancelled' | 'failed';
export type RestoreResult = 'restored' | 'nothing' | 'failed';

type ProState = {
  /** RevenueCat を初期化できたか（キーがない・Web などでは false のまま） */
  available: boolean;
  /** 起動してから、Pro かどうかを一度確かめ終えたか（確かめる前に Pro で決まることをしない） */
  ready: boolean;
  isPro: boolean;
  /** ストアのサブスクリプション管理の URL（買い切りだけのときなどは null） */
  managementURL: string | null;
  /** 開発版だけ：ストアの準備なしで Pro の見た目を確かめるための切り替え */
  devOverride: boolean;
  init: () => Promise<void>;
  /** RevenueCat に今の権利を確かめ直す。失敗したら今の判定のまま */
  refresh: () => Promise<void>;
  loadPackages: () => Promise<PurchasesPackage[]>;
  purchase: (pkg: PurchasesPackage) => Promise<PurchaseResult>;
  restore: () => Promise<RestoreResult>;
  setDevOverride: (on: boolean) => void;
};

function hasPro(info: CustomerInfo) {
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

function fromInfo(info: CustomerInfo) {
  return { isPro: hasPro(info), managementURL: info.managementURL };
}

let initStarted = false;

export const usePro = create<ProState>((set, get) => ({
  available: false,
  ready: false,
  isPro: false,
  managementURL: null,
  devOverride: false,

  init: async () => {
    if (initStarted) return;
    initStarted = true;
    if (!API_KEY) {
      set({ ready: true });
      return;
    }
    try {
      if (__DEV__) Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: API_KEY });
      set({ available: true });
      Purchases.addCustomerInfoUpdateListener((info) => set(fromInfo(info)));
      // アプリに戻ったときにも確かめ直す（ストア側で解約・失効したときのため）
      AppState.addEventListener('change', (state) => {
        if (state === 'active') get().refresh();
      });
      await get().refresh();
    } catch (e) {
      console.warn('[pro] init failed', e);
    }
  },

  refresh: async () => {
    if (!get().available) return;
    try {
      // オフラインでも、SDK が前回の内容を返す。取れなかったときは ready にしない（Pro で決まることを次の機会に回す）
      set({ ...fromInfo(await Purchases.getCustomerInfo()), ready: true });
    } catch (e) {
      console.warn('[pro] refresh failed', e);
    }
  },

  loadPackages: async () => {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  },

  purchase: async (pkg) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      set(fromInfo(customerInfo));
      return hasPro(customerInfo) ? 'purchased' : 'failed';
    } catch (e) {
      const error = e as { userCancelled?: boolean | null; code?: unknown };
      if (error.userCancelled) return 'cancelled';
      // 保護者の承認待ちなど。承認されると CustomerInfo の更新で反映される
      if (error.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
      console.warn('[pro] purchase failed', e);
      return 'failed';
    }
  },

  restore: async () => {
    try {
      const info = await Purchases.restorePurchases();
      set(fromInfo(info));
      return hasPro(info) ? 'restored' : 'nothing';
    } catch (e) {
      console.warn('[pro] restore failed', e);
      return 'failed';
    }
  },

  setDevOverride: (on) => {
    if (__DEV__) set({ devOverride: on });
  },
}));

function selectIsPro(s: ProState): boolean {
  return s.isPro || (__DEV__ && s.devOverride);
}

/** Pro の機能を使えるか */
export function useIsPro() {
  return usePro(selectIsPro);
}

/** 画面の外（通知の予約など）で使う。useIsPro と同じ判定 */
export function isProNow(): boolean {
  return selectIsPro(usePro.getState());
}
