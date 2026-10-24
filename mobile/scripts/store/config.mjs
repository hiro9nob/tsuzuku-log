// ストアと RevenueCat に入れる設定の中身（docs/revenuecat-setup.md）
// 値を変えたら、対応するスクリプトを流し直す

/** アプリ名と有料プランの名前 */
export const APP_NAME = 'Ongo';
export const PLAN_NAME = 'Ongo Pro';

/**
 * App Store Connect のアプリ（Apple ID）と Bundle ID。アプリの枠は 2026-10-20 に作成（主言語は英語（U.S.））
 */
export const ASC_APP_ID = '6824834396';
export const BUNDLE_ID = 'com.horizon.ongo';
/** SKU（あとから変えられない）。2026-10-20 に決定 */
export const SKU = 'ongo-ios';
/** ストアの名前（主言語は英語（U.S.）。日本語などの名前は掲載情報で入れる）。2026-10-20 に決定 */
export const STORE_NAME = 'Ongo: Habit Tracker';
/**
 * 登録する Bundle ID（scripts/store/asc-bundle.mjs）。本番の本体とウィジェット・Siri の拡張（targets/）
 * 開発版（.dev）は Xcode の自動署名で登録済み。App Group と iCloud の設定は EAS の本番ビルドが合わせる
 */
export const BUNDLE_IDS = [
  { identifier: BUNDLE_ID, name: 'Ongo' },
  { identifier: `${BUNDLE_ID}.widget`, name: 'Ongo Widget' },
  { identifier: `${BUNDLE_ID}.intents`, name: 'Ongo Intents' },
];

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
    labelKey: 'monthly',
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
    labelKey: 'annual',
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
    labelKey: 'lifetime',
    rcPackage: '$rc_lifetime',
    testStoreId: 'lifetime',
  },
];

/** サブスクリプションのグループ名（ストアで購入者に見える） */
export const SUBSCRIPTION_GROUP = PLAN_NAME;

/**
 * アプリの言語 → App Store の言語。2026-10-22 に、申請は英語と日本語だけにした（ほかの言語の文は git の履歴にある）
 * ここにない言語は、asc-listing.mjs と asc-iap.mjs が App Store Connect から消す（主言語の en-US は消せない）
 */
export const STORE_LOCALES = {
  en: ['en-US'],
  ja: ['ja'],
};

/**
 * 課金アイテムの説明（ストアの購入画面に出る。55文字以内）。3つとも同じ Pro なので同じ文。言語は STORE_LOCALES と同じ
 * 表示名は「Ongo Pro (月額など)」で、月額などはアプリの pro.* の訳を使う（scripts/store/asc-iap.mjs）
 */
export const IAP_DESCRIPTIONS = {
  en: 'Themes, icons, custom repeats, reminders and deep stats',
  ja: 'テーマ、アイコン、自由なくり返し、通知、詳しい統計が使える',
};

/** アプリ全体の設定（scripts/store/asc-app.mjs）。カテゴリは「ヘルスケア／フィットネス」と「仕事効率化」 */
export const APP_SETTINGS = {
  privacyPolicyUrl: 'https://ongo.no9.app/privacy/',
  contentRightsDeclaration: 'DOES_NOT_USE_THIRD_PARTY_CONTENT',
  primaryCategory: 'HEALTH_AND_FITNESS',
  secondaryCategory: 'PRODUCTIVITY',
};

// 年齢制限の質問票。すべて「なし」（広告・ギャンブル・ユーザー同士のやりとり・Web の閲覧などがないため）
// 習慣の候補の「お酒を控える」は飲酒を勧めるものではないので、アルコールの項目も「なし」
export const AGE_RATING = {
  ...Object.fromEntries(
    [
      'alcoholTobaccoOrDrugUseOrReferences',
      'contests',
      'gamblingSimulated',
      'gunsOrOtherWeapons',
      'horrorOrFearThemes',
      'matureOrSuggestiveThemes',
      'medicalOrTreatmentInformation',
      'profanityOrCrudeHumor',
      'sexualContentGraphicAndNudity',
      'sexualContentOrNudity',
      'violenceCartoonOrFantasy',
      'violenceRealisticProlongedGraphicOrSadistic',
      'violenceRealistic',
    ].map((k) => [k, 'NONE']),
  ),
  ...Object.fromEntries(
    [
      'advertising',
      'ageAssurance',
      'gambling',
      'healthOrWellnessTopics',
      'lootBox',
      'messagingAndChat',
      'parentalControls',
      'unrestrictedWebAccess',
      'userGeneratedContent',
      'socialMedia',
      'socialMediaAgeRestricted',
    ].map((k) => [k, false]),
  ),
};

/** バージョンの設定（scripts/store/asc-version.mjs） */
export const COPYRIGHT = '2026 Ongo'; // 「©」は Apple が付けるので入れない
// 審査に通っても自動では公開しない（11言語で一斉に公開する日を選ぶ。docs/tsuzuku-log-concept.md「公開の予定」）
export const RELEASE_TYPE = 'MANUAL';

/**
 * 審査へのメモ（審査する人だけが読む。英語）。pnpm store:asc:version で入れる
 * Pro でできることが変わったら、ここも直す
 */
export const REVIEW_NOTES = {
  app: [
    'No account or login is required. All records are stored only on the device (with optional iCloud Drive backup); the app has no server of its own.',
    '',
    'How to try it: on the Today tab, tap a suggestion (e.g. "Drink water") to create a habit, then tap the large circle on its row to log it. "Undo" appears right after logging. The "..." button on a row lets you mark a rest day, which keeps the streak going. Tap a habit to see its streaks and history grid. The Review tab shows weekly and monthly rates. Home Screen and Lock Screen widgets and a Control Center control can log habits without opening the app.',
    '',
    'In-app purchases: Ongo Pro is optional. Open the Me tab > Your plan. It offers a monthly and a yearly auto-renewable subscription and a one-time purchase (non-consumable). All three unlock the same Pro features: custom repeats (every N days, N times a month, Nth weekday, etc.), multiple reminders per habit, detailed stats, color themes, habit colors, custom icons/emoji/photos, note search and share card designs. Restore Purchases, Terms of Use and Privacy Policy are on the same screen. Purchases are handled with RevenueCat.',
    '',
    'Why a subscription: Pro features are used every day as the user keeps building habits (reminders, flexible schedules, ongoing stats). The one-time purchase unlocks the same features for users who prefer not to subscribe.',
    '',
    'Unlimited habits, logging, undo, fixing past days, rest days, basic stats, widgets, iCloud backup and export/import are free without Pro. There are no ads.',
    '',
    'Reminders are local notifications scheduled on the device (no push server). Face ID is used only when the user turns on App Lock in Settings. The photo library is used only when the user picks a photo as a habit icon (Pro).',
  ].join('\n'),
  /** 課金ごと。{label} は Pro の画面のボタンの名前 */
  product:
    'Open the Me tab > Your plan, then tap "{label}". This unlocks Ongo Pro: custom repeats, multiple reminders, detailed stats, color themes, custom icons, note search and share card designs. Restore Purchases is on the same screen.',
};

/** 課金の審査用スクリーンショット（Pro の画面、英語・ドル）。scripts/store/asc-review.mjs */
export const REVIEW_SCREENSHOT = '../../../store-screenshots/out/review/pro.png';
