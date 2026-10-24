# RevenueCat の設定

RevenueCat の設定は、できるだけ REST API v2（`mobile/scripts/store/rc-setup.mjs`、`pnpm store:rc`）で行う。何度流しても、あるものは作らない。画面でしかできないことだけを、ここにチェックリストで書く。スクリプトは Teraloo から移した。

> 書いた日：2026-10-19。RevenueCat の仕様はよく変わるので、作業の前に公式ドキュメントで確かめる。

## 決めたこと

| 項目 | 値 |
|---|---|
| プロジェクト | `Ongo`（1つ） |
| 権利（entitlement） | `pro`（アプリの `PRO_ENTITLEMENT`、`src/lib/pro.ts`） |
| 商品（App Store） | 月額 `com.horizon.ongo.pro.monthly`、年額 `com.horizon.ongo.pro.yearly`、買い切り `com.horizon.ongo.pro.lifetime`（価格は `scripts/store/config.mjs`） |
| Offering | `default`（current）、パッケージ `$rc_monthly`・`$rc_annual`・`$rc_lifetime` |
| Test Store の商品 | `monthly`・`yearly`・`lifetime`（App Store と同じ価格。期間と価格はあとで変えられない） |
| 開発版で使うキー | Test Store の `test_…`（`app.config.ts` の dev）。本番に入れると app.config.ts が止める |

## 画面でしかできないこと

- [x] プロジェクト `Ongo` を作る（最初の案内の権利・商品の案は作らずに飛ばしてよい。Test Store は自動でできる）
- [x] v2 のシークレットキーを作る（Project settings → API keys → New、V2）。Project configuration と **Apps configuration の両方**を Read & write にする（片方だけだと `/apps` が 403）
- [x] `mobile/.env.local` に書く（commit しない）：`REVENUECAT_PROJECT_ID`（`proj…`）、`REVENUECAT_SECRET_API_KEY`、App Store Connect のキー（`ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_KEY_PATH`、`ASC_IAP_KEY_ID`、`ASC_IAP_KEY_PATH`、`ASC_VENDOR_NUMBER`。ほかのアプリと同じアカウントのもの）
- [ ] App Store サーバー通知を RevenueCat につなぐ（App Store Connect にアプリの枠を作ってから。iOS アプリの「Apply in App Store Connect」）
- [ ] Google Play のアプリを足す（Play Console にアプリを作ってから）

## 開発版で購入を試す（実機）

1. `pnpm store:rc` を流す。最後に出る「Test Store key」を `app.config.ts` の `dev.revenueCatApiKey`（iOS と Android）に入れる
2. `pnpm store:check` で、権利 `pro` と Offering `default` の各パッケージに Test Store の商品が入っているか確かめる
3. 開発版を実機に入れ直す（`pnpm ios:device`）。キーはビルドに入るので、変えたら入れ直す
   - **Debug 構成（`pnpm ios:device`）で試す**。RevenueCat の SDK は、Release 構成で Test Store のキーを使うとアプリをわざと止める（2026-10-20 に `pnpm ios:device:release` で起動直後に落ちて確認。`checkForSimulatedStoreAPIKeyInRelease`）。アプリ側は、Release 構成では Test Store のキーを使わず、課金を使えない状態で起動する（`src/lib/pro.ts`）
4. Pro の画面で、月額・年額・買い切りが出ること、買うと Test Store のダイアログが出て Pro になること、「購入を復元」を押しても Pro のままなことを確かめる

Test Store の購入は RevenueCat の中だけで完結し、お金はかからない。購入は今の App User ID（匿名）に付くので、Test Store の「購入を復元」は同じ ID の権利を読み直すだけ。アプリを消して入れ直すと ID が変わり、Pro は戻らない（ストアの購入履歴から戻す動きは、App Store の Sandbox で確かめる）。本物の App Store（Sandbox）で試すのは、アプリの枠と課金アイテムを作ってから、本番の Bundle ID のビルド（TestFlight）で行う。

## 作ったもの（ID）

まだない。`pnpm store:rc` を流したら書く。
