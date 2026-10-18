# 新しい iOS アプリを TestFlight と審査まで最短で進める手順

Yaylog（`~/repository/github.com/hiro9nob/yaylog`）を作ったときの経験をもとに、Claude と Codex の意見を合わせてまとめた。2026-10-07 時点。

**この手順の前提**
- アプリは Expo（Expo Router）＋ EAS で作り、pnpm を使う
- 課金は **RevenueCat** を使う（サブスクリプションと買い切り）。課金なしのアプリは「課金」の項目を飛ばす
- ストアの設定はできるだけ App Store Connect の API と RevenueCat の API（v2）で行い、画面は使わない
- 人の作業は「ログイン・2ファクタ認証・本人確認・契約や公開の判断」に絞る。画面でしかできない設定も、人がログインしたあとは Claude が Chrome で入力する

**検証済みの環境**（変わっていたら、作業の前に公式ドキュメントで確かめる）
- Expo SDK 57、eas-cli latest、react-native-purchases 10.x、Node 24、macOS＋Xcode（iOS 26 SDK）、Google Chrome（Claude in Chrome）
- Apple の提出要件（Xcode と SDK のバージョン）は、毎年春に上がる。始めるときに [Upcoming requirements](https://developer.apple.com/news/upcoming-requirements/) を確かめる

## 0. 新しいセッションでの最初の一言（例）

> `~/repository/github.com/hiro9nob/yaylog/docs/common/ios-app-playbook.md` を読んで、この手順で新しいアプリを作って。決めることは下に書いた。どこまで任せるかは「内部 TestFlight まで」。

そのあとに「1. 人が決めること」を埋めて渡す。空欄は、Claude がおすすめを出して確認する。

## 1. 人が決めること

人が決めるのはここだけ。技術的な ID や文章は Claude が作って提案する（「2. Claude が作って提案するもの」）。

### A. どこまで任せるか

| 項目 | 選択肢 |
|---|---|
| 任せる範囲 | 内部 TestFlight まで／審査に出すまで／公開まで |
| 審査に通ったあとの公開 | 自動／手動（Yaylog は自動） |

### B. アプリの中身（審査の申告はここから決まる）

申告（年齢制限、App のプライバシー、審査メモ）は「好きに選ぶ値」ではなく、アプリの作りから決まる。ここを決めれば、Claude が申告の答えを作る。

| 項目 | Yaylog の例 |
|---|---|
| アプリ名（ストアで一意。先に空いているか確かめる） | Yaylog |
| 何をするアプリか（1〜2文） | 今日できたことを記録する「できたリスト」 |
| ログイン・アカウントがあるか | ない（あるなら、アプリ内でのアカウント削除と、審査用のデモアカウントが必要） |
| データの保存先・保存期間・削除方法 | 端末の中だけ。アプリを消すと消える。エクスポートあり |
| 外部に送るデータ | RevenueCat（購入の情報）だけ。分析・広告・追跡の SDK なし |
| 第三者のコンテンツ（他人の画像・文章・音楽など） | 使わない |
| 公開の投稿、チャット、ユーザー同士のやりとり | ない |
| 健康・医療・お金・賭けなど規制のある内容 | ない |
| 子ども向けか | 違う |
| 端末の権限（カメラ、写真、位置、通知など） | 使わない（使うなら、それぞれ説明の文が必要。**使わなくても、ライブラリが API を含むだけで説明の文が要ることがある**。「6. 落とし穴」の「Info.plist の説明の文」） |

### C. 課金（RevenueCat）

| 項目 | Yaylog の例 | 補足 |
|---|---|---|
| 最初のリリースに入れるか | 入れる | 入れると、審査用スクリーンショット・審査メモ・利用規約が必要 |
| 有料プランの名前 | Yaylog Plus | RevenueCat の権利（entitlement）は1つ（`plus`） |
| 有料でできること | テーマカラー、シール、90日より前の検索、詳しいふりかえり | **ストアの説明・課金の説明・審査メモ・課金の画面で同じものを書く**。あとで変えると全部直すことになる |
| 商品の構成 | 月額・年額（自動更新）と買い切り | サブスクリプションだけ、買い切りだけも可 |
| 価格（主な国） | 日本 ¥300／¥2,000／¥4,000、アメリカ $2.99／$19.99／$39.99 | |
| ほかの国の価格の決め方 | 日本の価格から換算した | 基準にする国で、ほかの国の税込価格が変わる。Yaylog では日本を基準にしたら EU・イギリスで安めになった。主な市場で決める |
| 無料のお試し期間 | なし | あるなら、長さと対象（初めての人だけなど） |
| 買い切りとサブスクリプションを両方持てるか | 両方買える作り | サブスクリプション中に買い切りを買った人へ、解約の案内をどうするか |
| ファミリー共有 | なし | |
| 請求の猶予期間（Billing Grace Period） | 未設定 | |
| Plus でなくなったときの扱い | 設定は残し、表示は無料の状態に戻す | データを消さないこと |

### D. 表記・事業者・法務

| 項目 | Yaylog の例 | 補足 |
|---|---|---|
| 著作権の権利者 | Yaylog（`2026 Yaylog`） | Apple の欄は「年＋権利者名」の形。`©` は Apple が自動で付けるので入れない（Yaylog は最初 `© 2026 Yaylog` と入れて、あとで直した） |
| ストアに出る販売者名 | 開発者アカウントの名前 | 個人アカウントだと**本名が出る**。気になるなら組織アカウントで始める |
| 審査の連絡先 | 名前・電話番号・メールアドレス | **値はドキュメントやリポジトリに書かない**。チャットで渡すか、管理外のファイルを指す |
| サポートの連絡先メール | contact@no9.app | 受信できるか確かめておく |
| サイトのドメイン | yaylog.no9.app | サポート、プライバシーポリシー、利用規約のページを置く |
| 利用規約・プライバシーポリシーの事業者名と施行日 | 施行日はサイトを公開した日 | プライバシーポリシーには、保存期間と削除の方法を必ず書く（審査ガイドライン 5.1.1） |
| 利用規約（EULA） | Apple の標準 EULA ＋ 自分の利用規約 | 独自の EULA を App Store Connect に入れるか |
| EU のデジタルサービス法（DSA） | トレーダーとして申告 | トレーダーなら住所・電話・メールが EU のストアに公開される |
| 税のカテゴリ | 既定のまま | 既定で良いかを決めた、と記録する |

### E. 配信・端末・アカウント

| 項目 | Yaylog の例 | 補足 |
|---|---|---|
| 配信する国 | すべて、新しい国にも自動 | 除外する国があるか。中国本土は内容によって追加の許可が要る |
| 対応言語 | ja, en, zh-CN, zh-TW, ko, es, fr, de, pt, th, id | 増やすほど翻訳とスクリーンショットが増える |
| プライマリ言語 | 英語（U.S.） | |
| 端末 | iPhone だけ（iPad なし） | Apple シリコンの Mac・Vision Pro への配信を許すか。iPad に対応すると iPad 用のスクリーンショットも要る |
| 最低 iOS バージョン | Expo の既定 | |
| 画面の向き | 縦だけ | |
| カテゴリ（1つ目／2つ目） | ライフスタイル／仕事効率化 | |
| Apple の開発者アカウント | 個人（あとで組織に移す予定） | **最初から本番のアカウントで作るのがおすすめ**。移すと手間が増える |
| EAS（Expo）の持ち主 | horizon-systems（組織） | |
| RevenueCat のプロジェクト | アプリごとに1つ | |
| アイコン | ChatGPT で作った絵（1024px 以上） | Claude がプロンプトを書ける。起動画面・サイト・favicon は Claude がアイコンから作る |
| TestFlight のテスター | アカウントの持ち主だけ（内部テスト） | 外部テストをするなら、ベータ版の審査が要る |

## 2. Claude が作って提案するもの（人は確かめるだけ）

| もの | 決め方 |
|---|---|
| slug、リポジトリ名 | アプリ名から |
| Bundle ID | `com.<組織>.<slug>`（開発版は末尾に `.dev`）。あとから変えられないので確認をとる |
| SKU | `<slug>-ios`。あとから変えられない |
| 商品 ID | `com.<組織>.<slug>.plus.monthly`／`.yearly`／`.lifetime` |
| サブタイトル、説明文、キーワード、プロモーション用テキスト（全言語） | アプリの中身から。文字数の上限内に収める |
| 課金の表示名と説明（全言語） | 表示名はアプリの訳、説明は55文字以内 |
| スクリーンショットの構成と見出し（全言語） | 最初の3枚で何のアプリか分かるように |
| 審査メモ（英語） | B と C から |
| 年齢制限の質問票の答え、App のプライバシーの答え | B と C から（RevenueCat の分は「6. 落とし穴」） |
| 利用規約・プライバシーポリシーの文 | B と D から |

## 3. 作成後に記録するもの

作ったらすぐ、リポジトリの `docs/store-setup.md` と設定ファイルに書く。

| もの | どこに |
|---|---|
| App Store Connect のアプリ ID | `scripts/store/config.mjs`、`eas.json`（`ascAppId`） |
| EAS のプロジェクト ID | `app.config.ts`（`extra.eas.projectId`） |
| RevenueCat のプロジェクト ID、アプリ ID、SDK の公開キー（`appl_…`） | `.env.local`（プロジェクト ID）、`app.config.ts`（公開キー。commit してよい） |
| サブスクリプションのグループ ID、各商品の ID | `docs/store-setup.md` |
| ビルド番号、TestFlight のグループ | `docs/development.md` |

## 4. 人の作業

### アカウントで最初の1回だけ（次のアプリでは不要）

- Apple Developer Program、契約（**有料 App 契約**を含む）、税務情報、銀行口座
- App Store Connect の API キー（チームのキー、**Admin**）。.p8 はパスワードマネージャーと `~/.appstoreconnect/private_keys/` に置く
- App 内課金キー（.p8。RevenueCat 用）。アカウントで1つあれば、アプリをまたいで使い回せる
- RevenueCat のシークレットキー（API v2）。「**Project configuration**」と「**Apps configuration**」の両方に Read & write を付ける（片方だけだと `/apps` が 403 になる）
- EAS（Expo）にログインしておく。Chrome に Claude in Chrome を入れておく

### アプリごと

1. 「1. 人が決めること」を埋める
2. Claude に頼まれたときに、Chrome で App Store Connect と RevenueCat にログインする（アプリの枠を作るとき、App のプライバシー、最初の審査に出すとき）
3. 公開・同意のボタン（App のプライバシーの「公開」、審査への提出）を承認する
4. 最初の本番ビルドで Apple へのログインが要るとき（「6. 落とし穴」の EAS を参照）
5. TestFlight で試す（「7. TestFlight で確かめること」）

## 5. 手順

TestFlight に早く出して、署名やネイティブまわりの問題を先に見つける。ストアの素材（説明文、スクリーンショット）は、その間に並行して用意する。

各段階の「完了」は、コマンドが成功したことではなく、**API で読み戻して確かめた状態**で判断する。途中で止まったら `pnpm store:check` で今の状態を見て、続きから流す。

### 段階1：土台（最初の1日）

| # | 作業 | だれ | 完了の確かめ方 |
|---|---|---|---|
| 1 | 「1. 人が決めること」を受け取り、「2」を提案して確認をとる | Claude＋人 | 決めたことを `docs/` に書いた |
| 2 | Yaylog からスクリプトなどをコピーし、Yaylog の値が残っていないか検索する（アプリ名、ドメイン、ID） | Claude | `grep -ri yaylog` で残りがない |
| 3 | アプリの骨組み（Expo、variant：dev／production、i18n） | Claude | シミュレータで起動する |
| 4 | Bundle ID を登録する（本番と開発版） | Claude | API |
| 5 | アプリの枠を作る（API では作れない） | 人がログイン → Claude が Chrome で入力 | API でアプリ ID が取れる |
| 6 | EAS のプロジェクトを作る（`eas init`）、`eas.json`（`ascAppId`） | Claude | `eas project:info` |
| 7 | 本番ビルド → **`pnpm store:ipa:check`** → 提出 → 内部 TestFlight | Claude（初回の資格情報は「6. 落とし穴」） | `store:ipa:check` が MISSING なし。API でビルドが `VALID`、内部グループに入っている |

### 段階2：課金（RevenueCat）

| # | 作業 | だれ | 完了の確かめ方 |
|---|---|---|---|
| 8 | 課金の商品（グループ、月額・年額・買い切り、価格、配信する国、表示名と説明） | Claude | `store:asc:iap`。全部の国の価格があるか |
| 9 | RevenueCat のプロジェクト、App Store のアプリ（App 内課金キーとベンダー番号を渡す）、商品、権利、Offering（`default` を current に）、パッケージ | Claude | `store:rc`、`store:check` |
| 10 | App Store サーバー通知を RevenueCat につなぐ（本番と Sandbox、V2） | Claude（URL を API で取れなければ人が RevenueCat の画面で「Apply in App Store Connect」） | API で `subscriptionStatusUrl` が両方入っている |
| 11 | アプリに課金の画面を作る（購入、復元、自動更新の説明、利用規約とプライバシーポリシーへのリンク） | Claude | |
| 12 | ビルドし直して TestFlight で試す | Claude → 人 | 「7. TestFlight で確かめること」が全部通る。RevenueCat に取引が入っている |

### 段階3：審査の準備（段階1・2と並行してよい）

| # | 作業 | だれ | 完了の確かめ方 |
|---|---|---|---|
| 13 | サイト（サポート、プライバシーポリシー、利用規約）を作って公開する | Claude | 各 URL が開く |
| 14 | 価格（無料）、配信する国、カテゴリ、年齢制限、権利、プライバシーポリシーの URL | Claude | `store:asc:app` |
| 15 | 著作権、審査の連絡先、公開の方法（自動／手動） | Claude | API で読み戻す（Yaylog ではスクリプトになっていないので、足す） |
| 16 | App のプライバシー（API では入れられない） | Claude が答えを用意 → 人がログイン → Claude が Chrome で入力 → 人が「公開」 | 画面で公開済み |
| 17 | 説明文などの掲載情報（全言語） | Claude | `store:asc:listing` |
| 18 | スクリーンショット（全言語）を撮って文字を入れ、上げる | Claude | `store:asc:screenshots`。全言語で枚数がそろう |
| 19 | 課金の審査用スクリーンショットと審査メモ（アプリと課金） | Claude | `store:asc:review`。課金が「提出の準備完了」 |

### 段階4：審査に出す

| # | 作業 | だれ | 完了の確かめ方 |
|---|---|---|---|
| 20 | 最終ビルドをバージョンに付ける | Claude | API |
| 21 | 審査の提出を作り、バージョンを入れる | Claude | API |
| 22 | 初めての課金を同じ提出に入れる（グループ、各サブスクリプション、買い切りのページで「審査用に追加」） | 人がログイン → Claude が Chrome | 提出物に全部そろっている（API で数を確かめる） |
| 23 | 「審査へ提出」 | 人の承認 → Claude | API で `WAITING_FOR_REVIEW` |

## 6. 落とし穴

「公式」は公式ドキュメントで確かめた決まり。「Yaylog で」は 2026-10 に実際に起きたことで、変わっている可能性がある。

### App Store Connect

- **公式**：アプリの枠は API で作れない（`apps` は参照と更新だけ）
- **公式**：種類ごとの最初の課金（サブスクリプション、買い切り）は、新しいアプリのバージョンと一緒に審査に出す
  - **Yaylog で**：`subscriptionSubmissions`・`inAppPurchaseSubmissions` は `FIRST_SUBSCRIPTION_MUST_BE_SUBMITTED_ON_VERSION` などで断られた。画面で、グループ・各サブスクリプション・買い切りのページから「審査用に追加」→ 同じ下書きを選んで通った。グループだけだと「グループのサブスクリプションと一緒に出す必要がある」と出る
  - 下書きのパネルは、追加したあと自動で開くことがある。開いたパネルの「審査へ提出」を誤って押さないよう、毎回スクリーンショットで位置を確かめる
- **公式**：課金は審査用スクリーンショットがないと「メタデータ不足」のまま
- 文字数の上限：アプリ名・サブタイトル30、キーワード100、プロモーション用テキスト170、説明文4000、課金の表示名35、課金の説明55
- **Yaylog で**：アプリ情報に言語を足すと、バージョンにも同じ言語が自動でできる（続けて POST すると 409）
- **Yaylog で**：買い切りには空の価格表が最初からある。「価格がある」ではなく、国と金額で比べる
- **Yaylog で**：`.p8` のパスの拡張子が二重（`.p8.p8`）になっていた
- ストアへの書き込みは、Claude の自動モードの安全チェックで止められることがある。そのときは何を書き込むかを説明し、人の承認をとる

### Info.plist の説明の文（ITMS-90683「Missing purpose string in Info.plist」）

何度も起きている。**ビルドのたびに、提出の前に `pnpm store:ipa:check` を流す**（Oriruyo の `mobile/scripts/store/ipa-usage-check.mjs`。ほかのアプリにはそのままコピーしてよい）。

- **しくみ**：Apple はアップロードのときにバイナリを調べる。プライバシーに関わる API（モーション、写真、ヘルスケアなど）を参照していれば、そのキー（`NS…UsageDescription`）を求める。**アプリで呼んでいなくても、ライブラリの中にコードがあるだけで要る**
- **気づくのが遅れる**：`eas submit` は成功と出る。そのあとメールで ITMS-90683 が届き、ビルドは `FAILED` で一覧に出てこない（理由は API の `/v1/apps/{id}/buildUploads` で読める）。ビルドし直しと提出のやり直しで、1時間ほど失う
- **確かめ方**：`pnpm store:ipa:check [<.ipa>]`。引数を省くと、EAS の最新の本番の iOS ビルドを落として調べる。本体と `Frameworks/` の各バイナリが参照するクラス（`nm -u`）を、「クラス → 要るキー」の表と突き合わせる。`MISSING` があれば終了コード 1
- **直し方**：
  - キーは `app.config.ts` で入れる（`ios/` は手で直さない）。そのライブラリの config プラグインに説明の文の設定があれば、それを使う。なければ `ios.infoPlist` に書く
  - 使わない機能のキーは、「使わない」と正直に書く。アプリから許可を求めないので、利用者に表示されることはない
  - 例（Oriruyo）：expo-location の `motionUsagePermission: 'このアプリはモーションとフィットネスのデータを使いません。位置情報の部品に含まれる機能のための表示です。'`
- **`false` で消さない**：config プラグインの「`false` でキーを入れない」設定（例：expo-location の `motionUsagePermission: false`）は、ITMS-90683 の原因になる。消してよいのは、`store:ipa:check` にそのクラスが出てこないときだけ
- **ライブラリを足したり上げたりしたとき**：新しい API が入ることがある。`store:ipa:check` で確かめ直す

実際に起きたこと・分かったこと（表はスクリプトの `RULES`・`ACCEPTED` にも書く）

| アプリ | ライブラリ | クラス | 要ったキー | 補足 |
|---|---|---|---|---|
| Oriruyo（2026-10-17） | expo-location | `CMMotionActivityManager` | `NSMotionUsageDescription` | モーションは使っていない。`motionUsagePermission: false` にしていた |
| Teraloo | HealthKit のライブラリ | `HKHealthStore` | `NSHealthUpdateUsageDescription` | 読むだけでも要った。ライブラリに書き込みの API があるため |
| Oriruyo（2026-10-17） | expo-file-system | `PHPhotoLibrary` | （なしで通った） | `NSPhotoLibraryUsageDescription` なしで `VALID`。表にあっても、必ず求められるとは限らない |

新しく却下されたら、表とスクリプトの `RULES` に足す。`MISSING` が出たのに通ったものは `ACCEPTED` に根拠と一緒に足す。

### App のプライバシー（RevenueCat）

- **公式**（[RevenueCat](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy)）：「購入」→「購入履歴」を集めると申告する。使い道は **「アナリティクス」と「アプリの機能」の両方**を必ず選ぶ
- 本人と結び付けるか：匿名の ID だけなら「いいえ」。独自のユーザー ID でログインさせるなら「はい」で、「ユーザ ID」も申告する
- トラッキング：RevenueCat だけなら「いいえ」。広告や分析の連携を足したら見直す
- プライバシーポリシーの文と食い違わないようにする
- **公式**：ストアの申告とは別に、アプリと SDK のプライバシーマニフェスト（`PrivacyInfo.xcprivacy`）と Required Reason API も要る。Expo の SDK はおおむね対応しているが、足したライブラリは確かめる

### EAS

- `app.config.ts`（動的な設定）には `eas init` が `projectId` を書けない。手で `extra.eas.projectId` を書く
- **Yaylog で**：`eas submit` はビルドのプロファイルの `env` を使わなかった。`APP_VARIANT=production` を付けないと開発版の Bundle ID を読んだ
- **Yaylog で**：`eas submit --non-interactive` は、API キーを自分では用意しなかった。対策は2つ
  - API キーを一度 EAS に預ける（`eas credentials -p ios` →「App Store Connect: Manage your API Key」）。これがおすすめ
  - `eas.json` に `ascApiKeyPath` などを一時的に書いて流し、commit せずに戻す
- 最初の本番ビルドの資格情報（配布用の証明書、プロビジョニングプロファイル）
  - Yaylog では、人が `eas build` を実行し、Apple ID でログインして作った
  - **要確認**：環境変数 `EXPO_ASC_API_KEY_PATH`、`EXPO_ASC_KEY_ID`、`EXPO_ASC_ISSUER_ID`、`EXPO_APPLE_TEAM_ID`、`EXPO_APPLE_TEAM_TYPE` で API キーを使えば、人のログインなしで作れる可能性がある。まず Claude が試し、だめなときだけ人に頼む
- EAS は、アップロードする中に `ios/` があると prebuild しない。`ios/` と `android/` を `.gitignore` に入れておく（Yaylog は入れていた）。手元の `ios/` は古いまま残るので、起動画面やアイコンを変えたら `pnpm expo prebuild --clean --platform ios` で作り直す
- 本番ビルドのあと、提出の前に `pnpm store:ipa:check`（「Info.plist の説明の文」）
- 本番ビルドの前に確かめる：本番の Bundle ID、EAS のプロジェクト ID、ASC のアプリ ID、RevenueCat の App Store 用の公開キー（Test Store 用のキーではない）、撮影用モード（`EXPO_PUBLIC_SCREENSHOTS`）が無効、開発用の「Plus にする」切り替えが無効

### Expo・アプリ

- **Yaylog で**：`app.config.ts` の `extra` に書いた `null` は、アプリでは `{}` になった。文字列のときだけ使う
- 課金の画面には、自動更新の説明、利用規約、プライバシーポリシー、購入の復元を置く。ストアの説明文の最後にも、利用規約とプライバシーポリシーの URL を書く（サブスクリプションの審査で必要）
- 輸出コンプライアンス：独自の暗号化がなければ `usesNonExemptEncryption: false`。足した SDK が暗号化を使うなら確かめる
- pnpm だけを使う（npx、npm は使わない）

### スクリーンショット

- 撮影用のビルド（`EXPO_PUBLIC_SCREENSHOTS=1`）で、起動の引数から言語・画面・見本のデータを決めると、全言語を自動で撮れる
- 撮影用のビルドは RevenueCat につながないので、課金の画面には見本の価格を出す。価格は App Store Connect の設定と同じにし、実際の表示は TestFlight で別に確かめる
- **Yaylog で**：シミュレータの通知（Apple Intelligence の案内）が写り込んだ。全部の画像を目で確かめ、`--only=` で撮り直す
- 文字入れは手元の Chrome と `playwright-core` を使う。最初に `pnpm install` が要る
- 見出しや補足が1語だけ次の行に落ちる言語は、`\n` で改行の位置を決める

### TestFlight と RevenueCat

- **Yaylog で**：TestFlight で、日本のアカウントでも価格がドルで出た。Sandbox ではよく報告されている。購入の確認画面の通貨、商品 ID、App Store Connect の価格もあわせて確かめる
- TestFlight の内部テストは審査がいらない。内部グループ（すべてのビルドを配る）を API で作り、アカウントの持ち主をテスターに入れる
- RevenueCat の SDK の公開キー（`appl_…`）は公開してよい。`app.config.ts` に書いて commit する。シークレットキーは `.env.local` だけ
- **要確認**：RevenueCat の CLI（`rc setup apple` など）で、キーの作成と登録をまとめてできる可能性がある。Apple へのログインは人が要る

## 7. TestFlight で確かめること（課金）

採用した商品の分だけ確かめる。

- [ ] 課金の画面に、全部の商品と価格が出る（通貨は「6. 落とし穴」を参照）
- [ ] 各商品を買える。確認画面の価格と通貨が正しい
- [ ] 買ったあと、有料の機能が全部使える
- [ ] 購入の確認画面でキャンセルしても、何も変わらない
- [ ] アプリを消して入れ直し、「購入を復元」で戻る
- [ ] サブスクリプションが更新される（TestFlight では数分ごと）
- [ ] 解約したあと、期限までは使え、期限が過ぎると無料に戻る（設定は残る）
- [ ] 通信できないとき、「今は購入できません」と出る
- [ ] RevenueCat に取引が記録されている（API で確かめる）
- [ ] 起動画面、アイコン、ライト／ダーク

## 8. Yaylog から使い回すもの

アプリの中身（多言語、課金、レビューのお願い、UI/UX、テーマカラー、サイト）の作り方は [app-common-features.md](./app-common-features.md) にまとめた。

| もの | 場所 |
|---|---|
| ストアと RevenueCat のスクリプト | `mobile/scripts/store/`（`config.mjs`、`listing/*.json`） |
| Info.plist の説明の文の確かめ（ITMS-90683 を防ぐ） | Oriruyo の `mobile/scripts/store/ipa-usage-check.mjs`（`pnpm store:ipa:check`）。アプリに依存しないので、そのままコピーする |
| スクリーンショットのスクリプト | `mobile/scripts/screenshots/`（`config.mjs`、`captions/*.json`） |
| 撮影用のモード | `mobile/src/lib/screenshot.ts`、`screenshotData.ts`、`screenshotMode.ts` |
| 宣伝用の動画（自動再生の録画 → 見出し・端末の枠・音楽） | `mobile/src/lib/demo.ts`、`mobile/scripts/promo/`、`docs/promo-video.md` |
| 宣伝用の動画（コードで作るモーショングラフィックス。Teraloo） | Teraloo の `video/`、`docs/video.md`。手順は [motion-promo-video.md](./motion-promo-video.md) |
| 課金のしくみと画面 | `mobile/src/lib/plus.ts`、`src/app/settings/plus.tsx` |
| 設定 | `mobile/app.config.ts`（variant、`owner`、`extra.eas.projectId`、RevenueCat の公開キー）、`mobile/eas.json` |
| 環境変数の名前（値は `.env.local`、commit しない） | `ASC_KEY_ID`、`ASC_ISSUER_ID`、`ASC_KEY_PATH`、`ASC_IAP_KEY_ID`、`ASC_IAP_KEY_PATH`、`ASC_VENDOR_NUMBER`、`REVENUECAT_SECRET_API_KEY`、`REVENUECAT_PROJECT_ID` |
| ドキュメントの型 | `docs/store-setup.md`、`revenuecat-setup.md`、`screenshots.md`、`development.md` |
| サイト | `site/`（Astro、Cloudflare Workers、`pnpm release`） |

**コピーしたあとに直すこと**（Yaylog のスクリプトは、Yaylog の状態を前提にしているところがある）
- アプリ名、サイトの URL、「Yaylog Plus」が、`asc-listing.mjs`・`asc-iap.mjs`・`rc-setup.mjs` に直接書かれている。`config.mjs` に集める
- `rc-setup.mjs` は、Offering とパッケージがないと止まる。作るところを足す（Offering を current にする）
- 著作権、審査の連絡先、公開の方法を入れるスクリプトがない（Yaylog では一度だけ手で API を呼んだ）。足す。`asc-review.mjs` は審査の連絡先があることを前提にしている
- `asc-iap.mjs` は買い切りがあることを前提にしている。サブスクリプションだけのアプリでは分ける
- 「違えば直す」になっていないところ：配信する国（あれば直さない）、サブスクリプションの価格（日本とアメリカしか比べない）、ストアのスクリーンショット（毎回全部消して上げ直す。途中で失敗すると欠ける）
- `lib.mjs` の ASC のトークンは、作り直さない。長い処理では期限が切れる。429 や 5xx のときの待ち直しもない
- 対象のバージョンを「編集できるものの先頭」で選んでいる。バージョン番号で選ぶ

## 9. Claude の約束事

- キーや秘密の値は表示しない。`.env.local` は commit しない。審査の連絡先の値はドキュメントに書かない
- パスワードや2ファクタ認証の入力はしない。ログインは人がする
- 公開・同意・提出のボタンは、人の承認をとってから押す。押す前にスクリーンショットで、押すものを確かめる
- commit は頼まれたときだけ
- 決めたこと、作った ID は、そのつど `docs/*.md` に書く
- iOS のビルドを提出する前に、毎回 `pnpm store:ipa:check` を流す。`MISSING` が出たら、キーを足してビルドし直してから提出する。config プラグインで説明の文を `false` にしない
- Expo と RevenueCat と Apple の仕様は変わるので、使う前に公式ドキュメント（Context7 など）で確かめる
- Codex CLI に頼むときは `--ephemeral` を付ける
