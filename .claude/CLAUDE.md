## 受け答えの言語

- ユーザーへの受け答えは、必ず日本語で書く。表や途中経過の報告も含め、英語で返さない

## ストアと RevenueCat の設定

- App Store Connect と RevenueCat の設定は、画面ではなく `mobile/scripts/store/` のスクリプト（`pnpm store:check`、`store:asc:app`、`store:asc:iap`、`store:asc:review`、`store:rc`）で行う。設定の中身は `config.mjs` にまとめ、変えたら対応するスクリプトを流し直す
- 作業の前に `pnpm store:check` で今の設定を確かめる。使い方と扱わないものは `docs/development.md` の「ストアと RevenueCat のスクリプト」、画面でしかできない設定は `docs/store-setup.md` と `docs/revenuecat-setup.md`
- キーは `mobile/.env.local` にある（commit しない）。中身を表示しない

## Codex CLI の利用

- Claude から Codex CLI にタスクを依頼するときは、必ず `--ephemeral` を付けて実行する（Codex 側にセッション履歴を残さないため）
  - 例: `codex exec --ephemeral --sandbox read-only -C <repo> - < prompt.txt`
- `--ephemeral` ではセッションが保存されないため、`codex exec resume` は使えない。追加の検証が必要な場合は、前回の結果をプロンプトに含めて新しく実行する
