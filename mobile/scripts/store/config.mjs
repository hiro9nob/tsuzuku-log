// ストアと RevenueCat に入れる設定の中身（docs/revenuecat-setup.md）
// 値を変えたら、対応するスクリプトを流し直す

/** アプリ名と有料プランの名前 */
export const APP_NAME = 'Ongo';
export const PLAN_NAME = 'Ongo Pro';

/**
 * App Store Connect のアプリ（Apple ID）と Bundle ID。アプリの枠はまだない（作ったら ASC_APP_ID に入れる）
 */
export const ASC_APP_ID = null;
export const BUNDLE_ID = 'com.horizon.ongo';

/** 対象のバージョン。app.config.ts の version と合わせる */
export const APP_VERSION = '1.0.0';

/** RevenueCat */
export const RC_APP_NAME = `${APP_NAME} (App Store)`;
// アプリの判定（src/lib/pro.ts の PRO_ENTITLEMENT）と同じにする
export const RC_ENTITLEMENT = 'pro';
export const RC_OFFERING = 'default';

/**
 * Pro の課金アイテム（docs/tsuzuku-log-concept.md「価格」）。日本とアメリカ以外は、日本の価格から換算する
 * testStoreId は RevenueCat の Test Store（開発版で本物の課金なしに購入を試す）の商品 ID。期間と価格はあとで変えられない
 */
export const PRODUCTS = [
  {
    key: 'monthly',
    productId: 'com.horizon.ongo.pro.monthly',
    referenceName: 'Pro Monthly',
    kind: 'subscription',
    period: 'ONE_MONTH',
    prices: { JPN: '250', USA: '1.49' },
    reviewLabel: 'Monthly',
    rcPackage: '$rc_monthly',
    testStoreId: 'monthly',
  },
  {
    key: 'yearly',
    productId: 'com.horizon.ongo.pro.yearly',
    referenceName: 'Pro Yearly',
    kind: 'subscription',
    period: 'ONE_YEAR',
    prices: { JPN: '1500', USA: '9.99' },
    reviewLabel: 'Yearly',
    rcPackage: '$rc_annual',
    testStoreId: 'yearly',
  },
  {
    key: 'lifetime',
    productId: 'com.horizon.ongo.pro.lifetime',
    referenceName: 'Pro Lifetime',
    kind: 'nonConsumable',
    prices: { JPN: '3600', USA: '24.99' },
    reviewLabel: 'Lifetime',
    rcPackage: '$rc_lifetime',
    testStoreId: 'lifetime',
  },
];
