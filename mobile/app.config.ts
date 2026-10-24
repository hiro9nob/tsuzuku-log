import { AndroidConfig, withStringsXml, type ConfigPlugin } from 'expo/config-plugins';
import type { ExpoConfig } from 'expo/config';
import type { WithAndroidWidgetsParams } from 'react-native-android-widget';

type Variant = 'dev' | 'production';

const variant: Variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'dev';

// Bundle ID は com.horizon.ongo（2026-10-19 に決定。docs/development.md「決めたこと」）
// RevenueCat の公開用 SDK キー（commit してよい。docs/revenuecat-setup.md）。null のあいだは購入できない
// 開発版は RevenueCat の Test Store（test_…。本物の課金なしで、実機でも購入を試せる）。本番のビルドには入れない
// アプリの名前：英語（ほかの言語も）は Ongo、日本語は つづくログ（locales/ja.json。docs/tsuzuku-log-concept.md「アプリ名」）
const variants = {
  dev: {
    name: 'Ongo (Dev)',
    jaLocale: './locales/ja.dev.json',
    bundleId: 'com.horizon.ongo.dev',
    // RevenueCat の Test Store の公開キー（買ってもお金はかからない。docs/revenuecat-setup.md「開発版で購入を試す」）
    revenueCatApiKey: { ios: 'test_FSKOCebRLNBYLmsmlGfDDejDkuJ', android: 'test_FSKOCebRLNBYLmsmlGfDDejDkuJ' },
  },
  production: {
    name: 'Ongo',
    jaLocale: './locales/ja.json',
    bundleId: 'com.horizon.ongo',
    // RevenueCat の App Store の公開キー（Android は Play Console にアプリを作ってから）
    revenueCatApiKey: { ios: 'appl_RFzrEAiCCWyaGiVLRefwwDLQwkE', android: null },
  },
} as const satisfies Record<Variant, { name: string; jaLocale: string; bundleId: string; revenueCatApiKey: { ios: string | null; android: string | null } }>;

for (const key of Object.values(variants.production.revenueCatApiKey) as (string | null)[]) {
  if (key?.startsWith('test_')) throw new Error('production の revenueCatApiKey に Test Store のキー（test_）が入っています');
}

const v = variants[variant];

// ウィジェットから記録できるよう、DB は最初から App Group の共有の場所に置く（docs/development.md「データの置き場所」）
const appGroup = `group.${v.bundleId}`;
// iCloud バックアップ（iCloud Drive のアプリのフォルダに JSON を置く）
const iCloudContainer = `iCloud.${v.bundleId}`;

// Android のウィジェット（src/widgets/android）。名前と説明は strings.xml に入れ、日本語は locales/ja.json で訳す
const androidWidgets: WithAndroidWidgetsParams = {
  fonts: ['./assets/fonts/Ionicons.ttf'],
  widgets: [
    {
      name: 'OngoToday',
      label: '@string/widget_ongotoday_label',
      description: "Log today's habits with a tap",
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: 'horizontal|vertical',
      previewImage: './assets/widget-preview/today.png',
      // 1日の区切りをまたいだら描き直す（アプリで記録したときは、アプリから描き直す）
      updatePeriodMillis: 1800000,
    },
    {
      name: 'OngoHeatmap',
      label: '@string/widget_ongoheatmap_label',
      description: 'Your history for the habit you choose',
      minWidth: '250dp',
      minHeight: '110dp',
      targetCellWidth: 4,
      targetCellHeight: 2,
      resizeMode: 'horizontal|vertical',
      previewImage: './assets/widget-preview/heatmap.png',
      updatePeriodMillis: 1800000,
      // 置くときに習慣を選ぶ（選ばなければ先頭の習慣）。あとから選び直せる
      widgetFeatures: 'reconfigurable|configuration_optional',
    },
  ],
};

/** ウィジェットの名前（英語。ほかの言語は locales の android） */
const withWidgetLabels: ConfigPlugin = (c) =>
  withStringsXml(c, (mod) => {
    mod.modResults = AndroidConfig.Strings.setStringItem(
      [
        { $: { name: 'widget_ongotoday_label' }, _: "Today's habits" },
        { $: { name: 'widget_ongoheatmap_label' }, _: 'Habit grid' },
      ],
      mod.modResults,
    );
    return mod;
  });

const config: ExpoConfig = {
  name: v.name,
  owner: 'horizon-systems',
  slug: 'ongo',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'ongo',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: v.bundleId,
    // Apple の開発チーム。ウィジェットと Siri の拡張（@bacons/apple-targets）の署名にも使う
    appleTeamId: 'CZ84NTJZJT',
    entitlements: {
      'com.apple.security.application-groups': [appGroup],
      'com.apple.developer.icloud-container-identifiers': [iCloudContainer],
      'com.apple.developer.ubiquity-container-identifiers': [iCloudContainer],
      'com.apple.developer.icloud-services': ['CloudDocuments'],
    },
    infoPlist: {
      // 日本語の端末では、アプリの名前を「つづくログ」にする（locales）
      CFBundleAllowMixedLocalizations: true,
      // モーションは使わない。react-native-reanimated（useAnimatedSensor）が CMMotionManager を参照するため、
      // アップロードで ITMS-90683 にならないよう念のため入れる。アプリから許可を求めないので、利用者には出ない
      NSMotionUsageDescription: 'Ongo does not use motion data. This text is required by a component the app includes.',
      // ファイル App の iCloud Drive に「Ongo」のフォルダとして見せる
      NSUbiquitousContainers: {
        [iCloudContainer]: {
          NSUbiquitousContainerIsDocumentScopePublic: true,
          NSUbiquitousContainerName: 'Ongo',
          NSUbiquitousContainerSupportedFolderLevels: 'Any',
        },
      },
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: v.bundleId,
    // Android は自動バックアップ（docs/tsuzuku-log-concept.md「技術」）
    allowBackup: true,
    adaptiveIcon: {
      backgroundColor: '#4A7C59',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  locales: {
    ja: v.jaLocale,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // ウィジェット・ロック画面・コントロールセンター（targets/widget）、Siri とショートカット（targets/intents）
    '@bacons/apple-targets',
    // Android のウィジェット
    ['react-native-android-widget', androidWidgets],
    'expo-sqlite',
    'expo-localization',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    [
      // アプリのロック（設定でオンにしたときだけ）
      'expo-local-authentication',
      { faceIDPermission: 'Ongo uses Face ID to unlock the app when you turn on App Lock.' },
    ],
    [
      // 自分の画像のアイコン（Pro）。写真は選んだ1枚だけを使う。カメラとマイクは使わないが、
      // ライブラリに機能が含まれるので説明の文を入れる（docs/common/ios-app-playbook.md「Info.plist の説明の文」。false にしない）
      'expo-image-picker',
      {
        photosPermission: 'Ongo uses the photo you choose as a habit icon. It stays on your device.',
        cameraPermission: 'Ongo does not use the camera. This text is required by a component the app includes.',
        microphonePermission: 'Ongo does not use the microphone. This text is required by a component the app includes.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#4A7C59',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F7F5',
        // アイコンの2つの丸（背景は透明）。ダークでは見やすいよう明るい緑の絵にする
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        dark: { backgroundColor: '#121412', image: './assets/images/splash-icon-dark.png' },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    variant,
    appGroup,
    revenueCatApiKey: v.revenueCatApiKey,
    // EAS のプロジェクト（@horizon-systems/ongo。2026-10-20 に作成）。動的な設定には eas init が書けないので手で書く
    eas: { projectId: '0de3ce33-a1a4-4b48-a254-cdea53b4d7c5' },
  },
};

export default withWidgetLabels(config);
