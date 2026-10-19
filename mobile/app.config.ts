import type { ExpoConfig } from 'expo/config';

type Variant = 'dev' | 'production';

const variant: Variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'dev';

// Bundle ID は com.horizon.ongo（2026-10-19 に決定。docs/development.md「決めたこと」）
// RevenueCat の公開用 SDK キーは、RevenueCat のアプリを作ったら入れる。null のあいだは購入できない
const variants = {
  dev: {
    name: 'Ongo (Dev)',
    bundleId: 'com.horizon.ongo.dev',
    revenueCatApiKey: { ios: null, android: null },
  },
  production: {
    name: 'Ongo',
    bundleId: 'com.horizon.ongo',
    revenueCatApiKey: { ios: null, android: null },
  },
} as const;

const v = variants[variant];

// ウィジェットから記録できるよう、DB は最初から App Group の共有の場所に置く（docs/development.md「データの置き場所」）
const appGroup = `group.${v.bundleId}`;
// iCloud バックアップ（iCloud Drive のアプリのフォルダに JSON を置く）
const iCloudContainer = `iCloud.${v.bundleId}`;

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
    entitlements: {
      'com.apple.security.application-groups': [appGroup],
      'com.apple.developer.icloud-container-identifiers': [iCloudContainer],
      'com.apple.developer.ubiquity-container-identifiers': [iCloudContainer],
      'com.apple.developer.icloud-services': ['CloudDocuments'],
    },
    infoPlist: {
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
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // ウィジェット・ロック画面・コントロールセンター（targets/widget）
    '@bacons/apple-targets',
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
  },
};

export default config;
