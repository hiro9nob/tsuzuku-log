# 開発のメモ

最終更新：2026-10-19。アプリは `mobile/`（Expo SDK 57、Expo Router、pnpm）。コンセプトは [tsuzuku-log-concept.md](./tsuzuku-log-concept.md)。

## 動かし方

```bash
cd mobile
pnpm install
pnpm ios            # シミュレータ（development build）
pnpm check          # 型チェック・lint・テスト
```

開発版では、Pro の画面の一番下に次の2つがある。
- 「Pro を有効にする（開発用）」：ストアの準備なしで Pro の見た目を確かめる
- 「見本のデータを入れる（開発用）」：6つの習慣と120日分の記録（お休み、メモを含む）を足す

起動のときに環境変数でも指定できる（開発版だけ）。
- `EXPO_PUBLIC_DEMO_DATA=1`：データが空なら見本を入れる。`add` なら今のデータに1回だけ足す
- `EXPO_PUBLIC_DEV_ROUTE=/share?habitId={first}&format=square`：起動後にその画面を開く（`{first}` は最初の習慣の ID）

```bash
EXPO_PUBLIC_DEMO_DATA=1 pnpm start
```

`ios/` は生成物。ウィジェットや app.config.ts を変えたら `pnpm expo prebuild --clean --platform ios` で作り直す。

## 決めたこと

| もの | 値 | 補足 |
|---|---|---|
| Bundle ID | `com.horizon.ongo`（開発版は `.dev`） | 2026-10-19 に決定 |
| App Group | `group.<Bundle ID>` | アプリとウィジェットで DB と表示の内容を共有する |
| iCloud コンテナ | `iCloud.<Bundle ID>` | iCloud バックアップ |
| サイトのドメイン | `https://ongo.no9.app` | 2026-10-19 に決定。利用規約・プライバシーポリシー・サポート（`src/lib/links.ts`）。サイトはまだない |
| Apple のチーム ID | `CZ84NTJZJT` | `ios.appleTeamId`。アプリ本体・ウィジェット・Siri の拡張の署名に使う |
| RevenueCat の権利 | `pro` | 公開用 SDK キーは `app.config.ts` に入れる（今は `null` で、購入できない表示になる）。開発版は Test Store のキーで、実機で購入を試せる（[revenuecat-setup.md](./revenuecat-setup.md)） |

## まだ決めていないこと

| もの | いまの値 | 補足 |
|---|---|---|
| アイコン | 仮（2つの「o」を、塗りつぶしの丸と中空の丸で描いたもの） | 本番のアイコンに差し替える |
| カラーテーマ10色 | 見本（`docs/design-sample/color-theme.png`）の9色＋Sunset Amber（10色目は仮） | `src/lib/themeColors.ts`。見本の3つの丸（メイン、サブ、背景）からライト用とダーク用の色を作る。淡い色は、文字やボタンに使うときだけ 4.5:1 になるまで濃く（ダークでは明るく）する（テストで確かめている）。無料はデフォルトだけで、アクセントがアイコンの緑 |

## データ

- 記録は端末の SQLite（`expo-sqlite`＋Drizzle）。iOS は App Group の共有の場所に置く（`src/db/client.ts`）
- テーブル：`habits`、`entries`（習慣×日で1行。`done`／`rest` と値）、`notes`（習慣×日で1つ）
- 設定は AsyncStorage（`src/lib/settings.ts`）
- スキーマを変えたら `pnpm db:generate` でマイグレーションを作る

## 連続記録の数え方（`src/lib/stats.ts`）

- 日ごとの習慣（毎日・曜日指定・何日おき）：予定の日にできなければ切れる。お休みの日、予定のない日、まだ終わっていないきょうは切れない
- 週に何回・月に何回：週（月）ごとに数える。お休みの日は必要な回数から引く。途中から始めた最初の週は、届かなくても切らない
- 上限型：期間（日・週・月）の合計が上限を超えたら切れる
- 第何曜日（Pro）：その月の第N週（1〜5、最終）の指定した曜日（第5週がない月は予定なし）
- やってから N 日後（Pro）：前にできた日から N 日たった日から予定になり、できるまで予定のまま（過ぎた日は切れる）
- 期間限定（Pro）：終わりの日までで数える。終わった習慣は「きょう」に出ず、振り返りに残る
- 節目（日：7・30・100・365・500・1000、週：4・12・26・52・104、月：3・6・12・24）は、習慣ごとに1回だけお祝いを出す
- 上限型の節目は、期間が終わってはじめて決まるので、きょうの画面を開いたときに確かめる（開かなかった日に過ぎていても、まだの一番大きな節目を1回だけ）

## Pro でなくなったとき

設定は残し、表示だけ無料の状態に戻す。Pro の繰り返しは近い無料の繰り返しとして数え（何日おき → 毎日、月に何回・やってから N 日後 → 週に何回、第何曜日 → その曜日）、期間限定の終わりの日は使わない。2つ目からの通知と曜日の指定は使わない。カラーテーマは既定（デフォルト）、習慣の色はテーマの色、Pro のアイコンと絵文字は基本のアイコンで表示する。

## ウィジェット・ロック画面・コントロールセンター（iOS）

- `targets/widget/`（Swift）。`@bacons/apple-targets` で拡張のターゲットを作る。iOS 17 以上（タップで記録するため）、コントロールセンターは iOS 18 以上
- ホーム画面：小（4つ）・中（4つ、名前つき）・大（7つ。Pro）。長押しの「ウィジェットを編集」で、表示する習慣を選べる（選んだ順に、予定の日でなくても出す）。選ばなければ、きょうやる習慣を並べ替えの順に出す
- ウィジェットの編集の画面の文言は、`targets/widget/<言語>.lproj/Localizable.strings` で訳す（キーは Swift の英語の文字列）
- 記録のマス目（小・中、無料）：選んだ習慣の、これまでの記録（列が週、行が曜日、右端がきょう）。長押しの「ウィジェットを編集」で習慣を選ぶ。上の丸で記録でき、マス目をタップすると習慣の詳細を開く（`HeatmapWidget.swift`）。ロック画面：円（達成数）・長方形（達成数と次の習慣）・1行
- コントロールセンター：選んだ習慣をワンタップで記録する
- アプリは、習慣の一覧（繰り返しの決まり、始まりと終わりの日）・表示の言葉を App Group の UserDefaults（`widgetSnapshot`）に JSON で置く（`src/lib/widgetSnapshot.ts`）。記録が変わるたび、設定・Pro・言語が変わるたびに書き直し、ウィジェットを再読み込みする
- ウィジェットは記録（`entries`）を SQLite から直接読み書きし、その日に出すかを繰り返しの決まりと最新の記録から決める（`Schedule.swift`。`stats.ts` の `isScheduledOn` と同じ考え方なので、片方を変えたらもう片方も直す）。上限型は期間の合計を見せる
- 量を足す記録は、アプリとウィジェットのどちらも1つの SQL で足す（同時に押しても消えない）。消した習慣には記録しない（外部キー）
- 記録したら、その日の通知（identifier `ongo.<習慣>.<日>.<番号>`）を消す。アプリに戻ると DB を読み直し、通知を予約し直す
- アイコンは Ionicons を SF Symbols に置き換える（`src/lib/sfSymbols.ts`。選べるアイコンすべてに対応表があることをテストで確かめている）

- ウィジェット・コントロール・Siri で共有する Swift（記録の読み書き、予定の判定、習慣の一覧）は `targets/_shared/` に置く（すべての拡張とアプリ本体に入る）

## Siri とショートカット（iOS）

- `targets/intents/`（App Intents の拡張。iOS 17 以上）。アプリを開かずに動く
- 「習慣を記録」：習慣を選ぶか名前を言って記録する（「できた」は取り消さない。数値・上限は1回分を足す）。「きょうの進み具合」：きょうの達成数を答える
- Siri への言い方（設定なしで使える）は `AppShortcutsProvider`。各言語の言い方は `targets/intents/<言語>.lproj/AppShortcuts.strings`、ほかの文言は `Localizable.strings`（キーは Swift の英語の文字列）
  - 例：「つづくログで水を飲むを記録」「つづくログできょうの進み具合」

## Android のウィジェット

- `react-native-android-widget`。中身は JS（`src/widgets/android/`）で、アプリと同じ DB と計算を使う。アプリを開いていないときにも動くので、DB の作り替え・設定・言語の準備を、ウィジェットの処理の中で行う（`data.ts`）
- きょうの習慣（丸を押すと記録。大きさに合わせて並べる数を変える）、記録のマス目（SVG の1枚の絵で描く。鉛筆のボタンで習慣を選び直せる。選んだ習慣は AsyncStorage にウィジェットごとに置く）
- アプリで記録や設定が変わったら、置いてあるウィジェットを描き直す（`widgetSync.ts` → `updateAndroidWidgets`）
- Pro かどうかは、課金の SDK を動かさず、アプリが最後に確かめた結果（`ongo.lastIsPro`）を使う
- アイコンは Ionicons のフォント（`assets/fonts/Ionicons.ttf`）。自分の画像のアイコンは、ウィジェットでは基本のアイコンにする
- 名前と説明は strings.xml（英語は `app.config.ts`、日本語は `locales/ja.json` の android）
- 気をつけること
  - ウィジェットのファイルの先頭に `'use no memo';` を書く（React Compiler が書き換えると、この部品の仕組みで動かない）
  - `react-native-android-widget` は読み込んだ時点で Android の機能を探すので、iOS では読み込まない（`index.ts` と `widgetSync.ts` で Android のときだけ `require`）
  - アプリの入り口は `index.ts`（Expo Router の前に、ウィジェットの処理を登録する）

## iCloud バックアップ（iOS）

- `modules/ongo-icloud`（Expo Modules API）。iCloud Drive のアプリのフォルダ（ファイル App では「Ongo」）の `Backups/` に、書き出しと同じ JSON を置く
- アプリを閉じたとき、前のバックアップから記録が変わっていれば保存する（ファイルは日と端末ごと。同じ日は上書き。新しい20個を残す）。記録が空のときは保存しない（新しい端末で、戻す前に上書きしないため）
- 設定の「今すぐバックアップ」「iCloud から戻す」（今の記録に足す）
- Apple Developer で iCloud コンテナ（`iCloud.com.horizon.ongo`、開発版は `.dev`）を作り、App ID に iCloud と App Group を付ける。EAS の資格情報の同期で付くかを、最初の本番ビルドで確かめる
- Android は自動バックアップ（`allowBackup`）

## 自分の画像のアイコン（Pro）

- 写真から1枚選び、正方形に切り取って 256px に縮め、App Group の `icons/` に置く（`src/lib/iconImages.ts`）。サーバーには送らない。ウィジェットもここから読む
- アイコンの値は `image:<ファイル名>`。どの習慣にも使われていない画像は、起動・保存・削除・作るのをやめたときに消す
- **バックアップ（書き出しと iCloud）には画像を含めない**。戻したときに画像がなければ、基本のアイコンで表示する
- Pro でなくなったら、基本のアイコンで表示する（選んだ値と画像は残す）

## 通知から記録する

- 習慣の通知に、ボタンを付ける（「できた」の習慣は「できた」、数値・上限の習慣は「1回分を記録」）。押すとアプリを開かずに記録し、通知を予約し直し、ウィジェットも書き直す（`src/lib/notifications.ts`）
- 「できた」のボタンは、できていなければできたにする（もう押してあっても取り消さない）
- iOS は、アプリが閉じていても裏で起動して受け取る（受け取る処理はモジュールを読み込んだときに登録する）。Android は、終了しているときは `expo-task-manager` のタスクで受け取る
- 同じ操作が二度届いても、1回だけ記録する（最後の50件を覚えておく）
- アプリのロックがオンのときは、端末のロックを解いてから記録する（`isAuthenticationRequired`）

## アーカイブとまとめてお休み

- アーカイブ：習慣を消さずにしまう（`habits.archived_day`）。きょう・振り返り・通知・ウィジェットから外れ、詳細とアーカイブの一覧（設定）からは見られる。戻すと、アーカイブしていたあいだの記録のない日をお休みにする（連続を切らないため）
- まとめてお休み（設定）：期間を選んで、使っているすべての習慣の、記録のない日をお休みにする。できた記録は変えない。取り消すと、その期間のお休みだけを消す

## アプリのロック

- 設定でオンにすると、起動したときと裏から戻ったときに Face ID・Touch ID・端末のパスコードを求める（`expo-local-authentication`。`src/lib/appLock.ts`）。オン・オフにするときも確かめる
- アプリの切り替え画面では中身を隠す。ウィジェットとロック画面の表示はロックされない（設定の説明に書いている）

## まだ作っていないもの

| もの | 補足 |
|---|---|
| 端末どうしの同期 | 将来作る（2026-10-19 に決定）。Cloudflare の Workers と D1、ログインなしのアカウントと引き継ぎコードで作る。作り方は下の「端末どうしの同期（将来）」 |
| 他のアプリの CSV の細かい対応 | いまは「日付の列＋習慣の名前の列」か「日付の列＋習慣ごとの列」の一般的な CSV に対応。DotHabit・Habitify の実際の書き出しで確かめる |
| App Store Connect のスクリプト、スクリーンショット | Teraloo からコピーする（[ios-app-playbook.md](./common/ios-app-playbook.md)）。RevenueCat の `store:rc` と、読むだけの `store:check` はある（下の「ストアと RevenueCat のスクリプト」） |
| サイト | 利用規約・プライバシーポリシー・サポート |
| 節目のお祝いでの名前の隠し | 仕様どおり「シェア」と「閉じる」だけ。名前を隠すには、習慣の詳細のシェアから作る |
| 写真つきのメモ、気分の記録、Apple Watch など | コンセプトで「未定」「第2弾以降」 |

## ストアと RevenueCat のスクリプト

`mobile/scripts/store/`（Teraloo から）。設定の中身は `config.mjs` にまとめ、変えたら対応するスクリプトを流し直す。キーは `mobile/.env.local`（commit しない。書く項目は [revenuecat-setup.md](./revenuecat-setup.md)）。

| コマンド | すること |
|---|---|
| `pnpm store:check` | App Store Connect と RevenueCat の今の設定を出す（読むだけ）。片方のキーがなくても、もう片方は出す |
| `pnpm store:rc` | RevenueCat の iOS アプリ、商品（App Store と Test Store）、権利 `pro`、Offering `default` とパッケージ。公開用の SDK キーと Test Store のキーを出す |

扱わないもの：プロジェクトとシークレットキーの作成、App Store サーバー通知（画面で。[revenuecat-setup.md](./revenuecat-setup.md)）。App Store Connect の課金アイテムなどは、アプリの枠を作るときにスクリプトを足す。

## 端末どうしの同期（将来）

2026-10-19 に、公開のあとに作ると決めた。同じ日に、iCloud（CloudKit）ではなく Cloudflare の Workers と D1 で作る方針に変えた。作るときの方針をここに残す。

- **どこで**：Cloudflare Workers（同期の API）と D1（データの保存）。iPhone と Android をまたいで同期できるのが、CloudKit を選ばなかったいちばんの理由。費用は無料枠（1日あたり読み出し 500 万行・書き込み 10 万行・保存 5GB）で始め、超えたら Workers の有料プラン（月 $5〜）。SQLite のファイルを iCloud Drive で共有するのは壊れやすいので使わない
- **置き場所**：リポジトリに Worker のフォルダ（例：`server/`）を作り、`wrangler` で D1 を作ってデプロイする

### アカウント（ログインなし）

Firebase の匿名認証と同じ考え方で、ログインの画面を出さずにアカウントを持つ（コンセプトの「ログインが要らない」を守る）。

1. 同期をオンにしたときに `POST /accounts` を呼ぶ。Worker が `account_id` とランダムなリフレッシュトークンを作り、D1 にはトークンのハッシュだけを置いて、端末に返す
2. トークンはキーチェーン（Android は Keystore）に置く（`expo-secure-store` を足す）。iOS のキーチェーンはアプリを消しても残るので、入れ直しても同じアカウントに戻れる
3. API を呼ぶときは、リフレッシュトークンを短い期限のアクセストークン（JWT。Worker の Web Crypto で署名）と交換し、`Authorization` ヘッダーに付ける。Worker は `account_id` を取り出し、D1 ではその `account_id` の行だけを読み書きする
4. 認証の部分を自分で作らずに、Workers と D1 で動くライブラリ（Better Auth の匿名ログインなど）を使ってもよい。作るときに比べて決める
5. あとから Sign in with Apple / Google を結びつけられるようにしておく（今は作らない）

```sql
CREATE TABLE accounts (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL,
  device_name TEXT, created_at TEXT NOT NULL, revoked_at TEXT
);
-- データの表（habits・entries・notes）にはすべて account_id を付け、(account_id, id) を主キーにする
```

### 引き継ぎコード

別の端末を同じアカウントにつなぐのは、数桁のコードで行う（ゲームの「引き継ぎコード」と同じ形）。

| 種類 | 使う場面 | 形 |
|---|---|---|
| その場でつなぐコード | 古い端末が手元にあるとき | `ABCD-2345` のような8文字。期限は10分、1回使ったら消す |
| 控えておくコード | 機種変更や、端末をなくしたとき | 期限なし。12文字（`K7QM-3XRP-9HTD`）か、コード＋本人が決めたパスワード。作り直したら古いコードは無効にする。数字6桁は総当たりで当てられるので使わない |

- 設定の同期の画面に「別の端末をつなぐ」（その場のコード）と「引き継ぎコードを控えておく」（控えておくコード）を出す
- 文字は、0/O・1/I/L のような見間違えやすい文字を除いた英数字（Crockford Base32 など）
- D1 にはコードのハッシュだけを置く。失敗が続いたら、その端末・IP からの入力をしばらく止める（Workers の Rate Limiting）
- つないだあとも古い端末のトークンは残す（両方で同期して使う）。端末を外すときは `sessions.revoked_at` を入れる
- 全部の端末をなくし、コードも控えていなければ戻せない。画面でそう伝える

```sql
CREATE TABLE transfer_codes (
  code_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- 'once'（10分） / 'recovery'（期限なし）
  expires_at TEXT,
  used_at TEXT
);
```

- `POST /transfer-codes`（つないである端末から）→ コードを返す
- `POST /transfer-codes/redeem`（新しい端末から、コードを付けて）→ その `account_id` のトークンを返す

### 同期のしくみ

- アプリで変えたら「送るもの」の表に残し、まとめて Worker に送る。ウィジェット・コントロール・Siri から記録した分も拾えるよう、「送るもの」は SQLite のトリガーで残す
- 別の端末の変更は、アプリを開いたときと、バックグラウンドの取得で「前回からの変更」を取りに行く。受け取ったら SQLite に書いて、画面・ウィジェット・通知を新しくする。すぐ伝えたくなったら、Worker から APNs のサイレント通知を送る処理を足す
- **データの作りで直すところ**
  - 記録に「最後に変えた時刻」を足し、消すときは消した印を残す（今は行を消すので、別の端末に伝えられない）
  - 変更を送るまで残しておく表を作る（電波がないときの分）
  - 数値の記録は端末ごとの足し算にする（2台で別々に足すと、あとに変えたほうだけが残って片方が消えるため）
  - 設定（今は AsyncStorage）も同じ API で同期するか、端末ごとのままにするかを決める
  - 自分の画像のアイコンを同期に含めるか決める（含めるなら R2 に置く）
- **ぶつかったとき**：あとに変えたほうを使う（数値の記録は足し算で両方残す）。はじめてつないだときに両方の端末に習慣があれば、両方とも残す（勝手にまとめない）

### そのほか

- **悪用への対策**：アカウントを作る API は誰でも呼べるので、Rate Limiting で回数を抑える。強くするなら App Attest（iOS）や Play Integrity（Android）で本物のアプリからの呼び出しかを確かめる
- **アカウントを消す**：アカウントを作るアプリは、アプリの中で消せるようにする（App Store の決まり）。`DELETE /accounts/me` で全部の表から消す
- **ストアまわり**：プライバシーポリシーと、ストアのプライバシーの表示を「サーバーに送る」に変える。中身を端末で暗号化してから送るかも決める
- **画面**：設定に同期のオン・オフ、最後に同期した時刻、エラー、つないでいる端末の一覧を出す（コンセプトの「大事な状態が常に見える」）
- **確かめること**：iPhone と Android の2台で、電波のない状態での記録、同時に足したとき、消した記録が伝わるか、ウィジェットから記録した分、引き継ぎコードでつないだとき、アプリを入れ直したとき
- **大きさ**：サーバー・認証・同期を全部作るので、3〜5週間ほど
- **決めること**：無料か Pro か（コンセプトでは Apple Watch・iPad・Mac との同期を Pro の候補にしている）
