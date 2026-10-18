# 新しいアプリの宣伝動画を、コードで作る手順（Remotion）

Teraloo（`~/repository/github.com/hiro9nob/teraloo`）で 30 秒の宣伝動画を作ったときのやり方。2026-10-12 時点。見出しが1文字ずつ出て、3D のスマホや地図・地球儀が動く、白っぽい背景のモーショングラフィックス。X などに載せる。

- 動画はすべて React のコード（Remotion）で書く。After Effects などの画面の操作は使わない
- アプリの画面は、ストアのスクショのスクリプトで撮った画像を使う（[ios-app-playbook.md](./ios-app-playbook.md)「スクリーンショット」）
- Yaylog の宣伝動画（アプリの自動再生を録画して枠と音楽を付ける。`mobile/scripts/promo/`）とは別のやり方。こちらは画面の録画を使わず、静止したスクショを 3D で動かし、地図や数字は動画の中で描く
- 見本は Teraloo の `video/`（ソース）と `docs/video.md`（場面の並び）。書き出した動画は `video/out/promo.mp4`

**検証済みの環境**（変わっていたら、作業の前に Context7 で Remotion のドキュメントを確かめる）
- remotion・@remotion/cli・@remotion/three・@remotion/google-fonts 4.0.534（4つは同じ版にそろえる）、three 0.186、@react-three/fiber 9.8、React 19.2、TypeScript 5.9、Node 24、macOS、pnpm 10

## 0. 新しいセッションでの最初の一言（例）

> `~/repository/github.com/hiro9nob/teraloo/docs/common/motion-promo-video.md` を読んで、このアプリの宣伝動画を作って。見本は `~/repository/github.com/hiro9nob/teraloo/video/`。決めることは下に書いた。

そのあとに「1. 人が決めること」を埋めて渡す。空欄は、Claude がおすすめを出して確かめる。

## 1. 人が決めること

| 項目 | Teraloo の例 |
|---|---|
| 縦横と大きさ | 横長 1920×1080（X 向け）。縦長 1080×1920（リール・TikTok）も作れる |
| 長さ | 30 秒（8 場面、1 場面 3〜5 秒） |
| 言語 | 日本語だけ（英語版は見出しとスクショを差し替えて、もう1本書き出す） |
| 音 | なし（入れるなら、使ってよい音源を人が用意する） |
| 最後の案内 | 「App Store で「Teraloo」と検索」（公開前なら「近日公開」などに変える） |
| 一番伝えたいこと | 「いつもの歩数が、世界旅行に」 |

## 2. Claude が作って提案するもの（人は確かめるだけ）

1. **場面の並び**（表にして先に見せる）。1場面に「見出し（2行まで）＋右に絵1つ」。流れの型は次のとおり
   - 問いかけ（ユーザーの日常）→ アプリの核心 → 使っているところ（いちばん動きのある絵）→ うれしい瞬間 → 無料でできること → 有料でできること → キャッチコピー → 名前とアイコンと案内
2. **見出しと補足の文言**。ストアのスクショの見出しと説明文から作り、数字はそろえる
3. **右の絵**。アプリの実際の画面（スクショ）を 3D のスマホに入れるか、アプリのデータ（地点・コース・倍率など）から地図・グラフ・カードを描く
4. **色と文字**。アプリのテーマカラーとアイコンに合わせる。文字はサイトと同じフォント（Google Fonts）

**守ること**（ストアのスクショと同じ）
- アプリにない機能や、同時には出ない表示を見せない。数字はアプリとストアの説明に合わせる
- 有料のものは「〇〇 Plus（有料）」と書く
- 健康などの効果をうたわない
- **ほかの人の動画は、作り方と雰囲気だけを参考にする。** 文言・場面の組み立て・絵をそのまま写さない。他社のロゴやキャラクターを使わない

## 3. 手順

### 段階1：土台（Teraloo の `video/` をコピーする）

```bash
cp -R ~/repository/github.com/hiro9nob/teraloo/video ./video
rm -rf video/node_modules video/public video/out
cd video && pnpm install
```

`mobile/` と同じ階層に、独立した pnpm のプロジェクトとして置く（`pnpm-workspace.yaml` は `onlyBuiltDependencies: [esbuild]` だけ）。

| ファイル | 中身 | 新しいアプリで直すこと |
|---|---|---|
| `package.json` | `assets`・`studio`・`render`・`still`・`check` | `name` |
| `remotion.config.ts` | `setChromiumOpenGlRenderer('angle')`、JPEG 95 | なし |
| `.gitignore` | `public/`、`out/` | なし |
| `scripts/sync-assets.mjs` | mobile のスクショ・アイコン・絵を `public/` に写す | 写すファイルの一覧（`SHOTS` など） |
| `src/theme.ts` | 色、フォント、fps・大きさ | 色、フォント |
| `src/data.ts` | 動画に出すデータ（地点、倍率など） | 全部。アプリのデータから写し、元のファイルをコメントに書く |
| `src/anim.ts` | `ramp`（0→1）、`pop`（弾む）、`float`（揺れる） | なし |
| `src/components/Stage.tsx` | 背景、左の見出し、右の絵、終わりのフェード | 左右の幅を変えるならここ |
| `src/components/Caption.tsx` | 見出しを1文字ずつ出す | なし |
| `src/components/Phone.tsx` | 3D のスマホ（CSS の 3D、枠、影、照り返し） | スクショの縦横比（`RATIO`） |
| `src/components/Globe.tsx` | 3D の地球儀と点線のルート、ピン | 地球儀を使わないなら消す |
| `src/scenes/*.tsx` | 1場面ずつ | 全部作り直す |
| `src/Promo.tsx` | 場面の並びと長さ（`SCENES`） | 並び |

### 段階2：素材

1. ストアのスクショのスクリプトで、使う画面を撮る（`mobile` で `pnpm screenshots:capture ja`）。動画用に別の画面が要るなら、撮影用のモードに場面を足す
2. `scripts/sync-assets.mjs` に、写すファイルを並べる。`pnpm studio` と `pnpm render` のたびに写すので、スクショを撮り直せば動画にも入る
3. スクショは mobile でも commit しないので、`video/public/` も commit しない

### 段階3：場面を作る

- 1場面ずつ作り、`pnpm still --frame=<コマ> <出力>.png` で途中のコマを画像にして確かめる。全部の場面の途中のコマを並べた1枚を作って、まとめて見ると速い（ffmpeg の `tile`）
- 見ながら直すときは `pnpm studio`（ブラウザで、コマを前後に動かせる）
- `pnpm check` で型を確かめる

### 段階4：書き出して確かめる

```bash
pnpm render                     # out/promo.mp4（Teraloo の 30 秒で 20 秒ほど）
ffmpeg -i out/promo.mp4 -vf "fps=1,scale=384:-1,tile=5x6" -frames:v 1 sheet.jpg  # 1秒ごとのコマを1枚に
```

1秒ごとのコマを並べて、文字の切れ・はみ出し・数字・場面のつなぎを確かめる。最後は人が通して見る。

### 段階5：記録する

- アプリの `docs/video.md` に、場面の並び（見出しと絵の表）、数字の出どころ、作り方のコマンドを書く（Teraloo の `docs/video.md` が型）
- commit は頼まれたときだけ

## 4. 作り方の決まり

- **動きはすべて `useCurrentFrame()` から決める。** React Three Fiber の `useFrame`、`setTimeout`、CSS の animation は使わない（書き出すと動きがずれる・ちらつく）
- 3D は `@remotion/three` の `<ThreeCanvas>` に、`width` と `height` を必ず渡す
- 画像は `<Img src={staticFile('...')}>` で読む（`<img>` だと、読み終わる前のコマが書き出されることがある）
- フォントは `@remotion/google-fonts/<名前>` の `loadFont`。日本語のフォントはファイルが多いので `ignoreTooManyRequestsWarning: true` を付ける
- 場面は `<Series>` で並べ、長さはコマ数で持つ。全体の長さは足し算で出す

## 5. 落とし穴（Teraloo で起きたこと）

- **`<AbsoluteFill style={{ left: 880 }}>` は幅が 100% のまま**で、右へはみ出す。`width` も一緒に書く
- **地球儀が大きすぎて切れた。** fov 32 のとき、カメラの距離 3.6 では半径 1 の球が画面の縦いっぱいになる。4.4〜4.9 にした
- **地球儀の裏に回ったピンが、縁からはみ出して浮いて見えた。** 回したあとの向き（カメラ側の成分）が小さいピンは出さない
- **陸の縁取りに、日付変更線と極に沿った横線が出た。** 陸の形（world-atlas）は、形を閉じるために経度 ±180 と極を通る。縁取りは、経度が 180 度以上飛ぶところと、緯度 84 度より極に近いところで線を切る（塗りは今までどおり閉じる）
- 球に緯度・経度の点を置くときは、three の `SphereGeometry` の貼り方に合わせる：`phi = (90 - 緯度)`、`theta = (経度 + 180)`、`x = -sin(phi)cos(theta)`、`y = cos(phi)`、`z = sin(phi)sin(theta)`。経度 L を正面に向けるには、Y 軸で `-90 - L` 度回す
- `topojson-client` の型は `@types/topojson-specification` も入れないと通らない（pnpm は間接の依存を見せない）
- 地図のラベルは、点の位置によっては枠の外に切れる。ラベルを上下左右のどちらに置くかを地点ごとに決め、枠の余白を広くとる
- 補足が2行になるときは、自分で `<br />` で改行する。自動の折り返しだと「（有料）」だけが次の行に落ちる
- 狭い範囲（1つの街）の地図は、経度に cos(緯度) を掛けるだけで十分。川などの形を描くときは「正確な形ではない」とコメントに書く

## 6. よく使う動き

| 動き | 書き方（`src/anim.ts`） |
|---|---|
| 出てくる | `pop(frame, 遅れ)` を `scale` と `opacity` に |
| 移る | `ramp(frame, 始め, 終わり)` を位置や角度に |
| ふわふわ揺れる | `float(frame, 幅, 周期)` を `y` に |
| 線が端から伸びる | SVG の `strokeDasharray={長さ}`、`strokeDashoffset={長さ * (1 - t)}` |
| 数字が減る・増える | `Math.round(終わり * t)` を `toLocaleString` で |
| 点線のルート | 弧の上に小さい球を等間隔に置き、進み具合までの数だけ出す |

## 7. Claude の約束事

- ほかの人の動画・画像・音楽を素材に使わない。参考にした動画は、作り方の説明にだけ使う
- 使う前に、Remotion と Three.js の今の書き方を Context7 で確かめる
- 書き出したら、途中のコマを自分で見てから人に渡す。見ていないものを「できた」と言わない
- commit は頼まれたときだけ
