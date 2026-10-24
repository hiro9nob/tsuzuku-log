# サイト

`https://ongo.no9.app` で公開する つづくログ（Ongo）のサイト。ストアに登録する URL（サポート、プライバシーポリシー）と、アプリの Pro の画面・設定からの利用規約・プライバシーポリシーのリンク先（`mobile/src/lib/links.ts`）に使う。Keptly の `site/` をもとに作った（2026-10-20）。

## 決めたこと

| 項目 | 内容 |
|---|---|
| ドメイン | `ongo.no9.app`（Cloudflare のカスタムドメイン。DNS と証明書は wrangler が作る） |
| 置き場所 | リポジトリの `site/` |
| 作り方 | Astro で静的な HTML を作り、Cloudflare Workers の静的アセットで配信する（Worker のコードもアダプターも使わない）。Worker 名は `ongo-site` |
| 言語 | 英語（`/`）と日本語（`/ja/`）だけ。アプリのリンクは日本語なら `/ja/`、それ以外は英語 |
| ページ | トップ、サポート、利用規約、プライバシーポリシー、404 |
| 見た目 | アプリの代表の緑（ライト #4A7C59、ダーク #8DBF9C）と生成りの紙の色。端末の設定でダークにもなる。見出しは英語 Fraunces、日本語 Zen Maru Gothic（Google Fonts） |
| 画面の画像 | ストアのスクリーンショット用に撮った本物の画面（`store-screenshots/public/raw`）を `src/assets/screens/` に置き、ビルドで webp に縮める（sharp） |
| OG 画像 | `public/og-<lang>.png`（1200×630）。`node scripts/make-og.mjs` で作る |
| アクセス解析・Cookie | 使わない |
| 運営者名 | 「つづくログ運営者」／「Ongo Operator」（`src/config.ts` と `src/content/*/`） |
| 連絡先 | `contact@no9.app` |
| 規約の施行日 | 2026-10-20（`LEGAL_EFFECTIVE_DATE`） |

## 利用規約とプライバシーポリシー

Keptly と同じ形で、運営者の責任を小さくしている（詳しい考え方は Keptly の `docs/site.md`）。

- 医療・健康などの助言ではなく、続ける習慣は利用者が決めること。通知が届かないことがあること
- 記録は端末（と利用者自身の iCloud Drive）にあり、消えても運営者は復元できず責任を負わないこと
- 責任の上限は、故意・重過失を除き、通常かつ直接の損害で、過去12か月に Pro に払った額と3,000円の高いほう
- 住んでいる国の法令による消費者の権利は制限しない。日本法、運営者の住所地の地方裁判所
- プライバシー：記録は運営者に送らない。RevenueCat には匿名の ID・購入履歴・端末の情報を送る。iCloud バックアップは利用者の iCloud Drive。写真はアイコンに選んだものだけを縮めて端末に保存。購入情報の削除は、ストアの注文番号で探す（アプリに問い合わせ用 ID はない）

アプリの機能やデータの扱いが変わったら、トップ・サポート・規約・ポリシーを直す。**公開前に専門家に見てもらうのがおすすめ**。

## コマンド（`site/`、Node 24）

| コマンド | 何をするか |
|---|---|
| `pnpm dev` | 開発用のサーバー |
| `pnpm build` | `dist/` に HTML を作る |
| `pnpm check` | Astro の型チェック |
| `pnpm release:dry` | 公開の手前まで確かめる |
| `pnpm release` | ビルド → 【】の仮置きの確認 → 公開（`pnpm deploy` は pnpm の別のコマンドなので使わない） |

## 残っていること

- [ ] 初めての公開（`pnpm release`）
- [ ] Google Search Console にサイトを登録し、`https://ongo.no9.app/sitemap-index.xml` を送る
- [ ] ストアに出したら `src/config.ts` の `APP_STORE_URL`
- [ ] Pro の内容や価格が変わったら、トップの「Pro」と規約を直す
