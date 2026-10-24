// Siri とショートカット（App Intents の拡張）。アプリを開かずに記録する
// docs/development.md「Siri とショートカット」
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'app-intent',
  name: 'OngoIntents',
  bundleIdentifier: '.intents',
  deploymentTarget: '17.0',
  frameworks: ['AppIntents', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
