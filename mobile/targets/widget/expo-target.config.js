// ウィジェット（ホーム画面・ロック画面）とコントロールセンターのコントロール
// docs/development.md「ウィジェット」
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'OngoWidget',
  displayName: 'Ongo',
  bundleIdentifier: '.widget',
  // タップで記録する（インタラクティブなウィジェット）には iOS 17 が要る
  deploymentTarget: '17.0',
  frameworks: ['SwiftUI', 'WidgetKit', 'AppIntents'],
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
  colors: {
    $accent: { color: '#1C1C1E', darkColor: '#F2F2F3' },
  },
});
