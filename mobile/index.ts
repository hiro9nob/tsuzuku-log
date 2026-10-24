// アプリの入り口。Expo Router に加えて、Android のウィジェットの処理を登録する
import 'expo-router/entry';

import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  // react-native-android-widget は、読み込んだ時点で Android の機能を探す（iOS では止まる）ので、Android のときだけ読み込む。
  // ウィジェットの処理はアプリを開いていないときにも呼ばれるので、読み込んですぐに登録する（import() は使わない）
  /* eslint-disable @typescript-eslint/no-require-imports */
  const widget = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/android/handler') as typeof import('./src/widgets/android/handler');
  const { HeatmapConfiguration } = require('./src/widgets/android/HeatmapConfiguration') as typeof import('./src/widgets/android/HeatmapConfiguration');
  /* eslint-enable @typescript-eslint/no-require-imports */
  widget.registerWidgetTaskHandler(widgetTaskHandler);
  widget.registerWidgetConfigurationScreen(HeatmapConfiguration);
}
