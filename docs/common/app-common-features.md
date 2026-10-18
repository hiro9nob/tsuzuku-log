# 新しいアプリの共通機能

Yaylog の実装をもとにした、ほかのアプリでも入れる機能のまとめ（2026-10-08）。コードは「コピー元」のファイルをコピーして名前を直す。ストアの設定から審査までは [ios-app-playbook.md](./ios-app-playbook.md)。

## 技術の前提

- 指定がなければ **Expo**（Expo Router）。Expo Go ではなく development build で動かす
- **pnpm** を使う。パッケージは `pnpm expo install` で足す。npm・yarn・npx は使わない
- `ios/` と `android/` は生成物。設定は `app.config.ts` で行う
- 開発版と本番は `APP_VARIANT` で切り替える（アプリ名、Bundle ID、RevenueCat のキー）
- commit の前に `pnpm check`（型チェック・lint・テスト）
- `package.json` の scripts に、実機の Release ビルド、本番のビルド、提出を iOS と Android の両方で入れる

```json
"ios:device:release": "expo run:ios --device --configuration Release",
"build:ios:production": "pnpm dlx eas-cli@latest build --platform ios --profile production",
"release:ios:production": "pnpm dlx eas-cli@latest submit --platform ios --profile production --latest",
"android:device:release": "expo run:android --device --variant release",
"build:android:production": "pnpm dlx eas-cli@latest build --platform android --profile production",
"release:android:production": "pnpm dlx eas-cli@latest submit --platform android --profile production --latest",
```

## 多言語

コピー元：`mobile/src/lib/i18n/`、`src/app/settings/language.tsx`

- i18next ＋ react-i18next ＋ expo-localization
- 11言語（ja / en / zh-CN / zh-TW / ko / es / fr / de / pt / th / id）。対応外の言語は英語
- **言語と時間の既定は端末の設定に従う**
  - 言語：既定は「端末の設定に従う」。手動でも選べる。アプリに戻ったときに言語を確かめ直す
  - 時間：端末の時計とタイムゾーンで「今日」を決める。タイムゾーンが変わったら計算し直す
  - 日付の書き方は選んだ言語に、週の始まりは端末の設定（`expo-localization` の `firstWeekday`）に合わせる
- 中国語は簡体字と繁体字に振り分ける
- Hermes では複数形が選べないことがあるので、`@formatjs/intl-pluralrules` を入れる

## 課金（RevenueCat）

コピー元：`mobile/src/lib/plus.ts`、`src/app/settings/plus.tsx`、`src/components/PlusInvite.tsx`、`mobile/scripts/store/`

- 有料プランは `<App> Plus` の1つ。判定は権利（entitlement）`plus` だけで行う
- 月額・年額・買い切りを用意する。ストアと RevenueCat の設定は画面ではなくスクリプト（API）で行う
- 公開用の SDK キーは `app.config.ts` に書いて commit してよい。キーがなければ「今は購入できません」と出す
- アプリに戻ったときと Plus の画面を開いたときに、権利を確かめ直す
- Plus の画面は押し売りしない。できることを短く書き、購入・復元・規約のリンクを置く
- 審査で必要なもの：自動更新の説明、利用規約とプライバシーポリシーのリンク、「購入を復元」
- Plus の機能は隠さず鍵のマークで見せ、押したら Plus の画面へ案内する
- Plus でなくなったら、設定は残して表示だけ無料の状態に戻す

## レビューのお願い

コピー元：`mobile/src/lib/reviewPrompt.ts`、`src/lib/storeReview.ts`

- アプリのダイアログで「応援しませんか？」と聞き、「応援する」を押したら OS の評価のダイアログ（`expo-store-review`）を出す
- 中心の操作のあと、使った日数が5日以上で出す。「あとで」なら10日後にもう一度。「応援する」のあとは出さない
- 1回の起動で1回まで。モーダルを閉じきってから出す（閉じている途中だと iOS で出ないことがある）
- iOS の評価のダイアログは年3回まで。TestFlight では出ない

## シンプルでわかりやすい UI/UX

コピー元：`mobile/src/theme.ts`、`src/components/SettingsRow.tsx`

- タブは3つまで（ネイティブタブ）。設定は⚙️から開く
- 設定は iOS の設定アプリのような、カードに行を並べる形にする。選んだらその場で反映する
- 押し売り・催促をしない。ゼロや足りなさを見せない
- 説明は長い文ではなく、プレースホルダーや一言で伝える
- 取り消せない操作は確認のダイアログを出す
- アカウント、広告、トラッキングは使わない

## テーマカラー

コピー元：`mobile/src/lib/themeColors.ts`、`src/theme.ts`、`src/app/settings/appearance.tsx`

- ライト／ダークは無料（端末の設定に従う／ライト／ダーク）。`Appearance.setColorScheme` で OS の表示もそろえる
- アクセント色は6色で、既定の1色だけ無料。ほかは Plus
- 色はライト用とダーク用の2組で持つ。画面では色を直接書かず、`useTheme()` から取る
- 既定の色はアプリのアイコンに合わせ、起動画面とサイトの色もそろえる

## プロモーションサイト（Astro ＋ Cloudflare）

コピー元：`site/`（詳しくは [site.md](../site.md)）

- Astro で静的な HTML を作り、Cloudflare Workers の静的アセットで配信する。ドメインは `<app>.no9.app`
- 英語（`/`）と日本語（`/ja/`）
- ページ：トップ、サポート、利用規約、プライバシーポリシー、404。ストアの URL と審査のリンク先に使う
- 画像と動画は Cloudflare R2 に置く。サイトマップと構造化データを出す
- 公開は `pnpm release`（`pnpm deploy` は使わない）
