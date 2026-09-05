<div align="center">
  <img src="assets/icon.png" alt="tegakari" width="96" height="96" />
  <h1>tegakari</h1>
</div>

<div align="center">

[English](./README.md) | **日本語**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/phobgclkkcnkmmfnmloganoefjifnidp?label=Chrome%20Web%20Store&color=2563eb)](https://chromewebstore.google.com/detail/tegakari/phobgclkkcnkmmfnmloganoefjifnidp)
[![CI](https://github.com/iemong/tegakari/actions/workflows/ci.yml/badge.svg)](https://github.com/iemong/tegakari/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-2563eb)](LICENSE)

</div>

Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdownまたはJSONL形式で生成するChrome拡張機能です。

生成したテキストをクリップボードにコピーし、AIエディタ（Claude Code、Cursorなど）に貼り付けて活用できます。

![tegakari demo](docs/assets/demo.gif)

## 機能

- 🧩 **Agent Skills 同梱** — `gh skill` でインストールできる。`tegakari-prefix-rules` は URL とリポジトリの対応づけ（Prefix Rules）を対話形式で設定でき、`tegakari-fix` は Claude Code などのエージェントが tegakari の出力をパースし、対象のソースファイルを特定した上で修正・検証するのを助ける。詳細は [`skills/README.md`](skills/README.md)
- ページ上の複数要素をクリックして選択・アノテーション
- `\`（または `↑` / `↓`）で選択対象を親・子要素へ階層移動（狙い撃ちが難しい要素も選択しやすい）
- 同一オリジン iframe 内の要素も選択（Options で有効化。GAS の Web アプリなど iframe 描画ページ向け）
- 右クリックメニュー「tegakari: この要素を選択」から、その場で要素をアノテーション（トップフレームのみ）
- 選択要素にピンマーカーを表示し、ピン横のポップオーバーで指示テキストを入力
- クイック指示チップ（Spacing / Color / Text / Size / Align / Remove）をアノテーションに付与し、意図を構造化して一目でわかるように（出力にはタグとして反映）
- ピンのポップオーバーから「Adjust styles」パネルを開き、8種類のスタイル（margin, padding, font-size, line-height, color, background-color, border-radius, gap）をライブプレビューしながら変更前後の値を正確に記録
- 2つのピンを「Relation（Link）」で結び、2要素にまたがる指示（例:「この2つの間隔を揃えて」）をSVGの線付きで記録し、出力に含める
- Inbox の行をドラッグ&ドロップで並び替え。番号は常に表示順どおりに振り直され、削除しても欠番が残らない
- リロード後にアノテーションを保持するかを Options で切り替え。保存済みのアノテーションは Options から一括削除もできる
- 要素クリック時にスクリーンショットを自動キャプチャ（要素周辺をクロップ）
- 選択要素のHTML情報（タグ、属性、テキスト）を取得
- 選択要素の実効スタイル（タグ既定値との computed style 差分）を取得し、「余白を詰めて」「色を変えて」にAIが実測値で応えられる
- 選択要素にマッチする同一オリジンCSSルール（ファイル・セレクタ・宣言・`@media`条件）とCSSカスタムプロパティの解決値を収集し、そのスタイルがどこから来ているかをAIに伝える
- React / Vue のコンポーネント階層・Props・Stateを自動検出。Svelte / SvelteKit はコンポーネント階層とソース位置を検出
- コンポーネントのソース位置（`file:line`）を解決して出力に含める（取得できる場合・dev build）
- Next.js / Nuxt / SvelteKit などのメタフレームワークを検出
- ページメタデータ（Viewport、UserAgent、Language）を自動収集して出力に含める
- Toolbar のドロップダウンから出力プリセットを選択 — **Minimal**（レビューコメント形式の *Feedback Report*、デフォルト）/ JSONL / Markdown / **Claude Code**（XML形式、`tegakari-fix`スキルの自動起動マーカー付き）/ **Cursor**（簡潔版）。選択したプリセットはセッションをまたいで保持される
- `{{instruction}}` 等のプレースホルダーで、自分のワークフロー向けの出力テンプレートを定義（Options ページで管理、最大10件、JSON import/export）
- 全アノテーションのスクリーンショットを1枚のコンタクトシート画像としてコピー
- アノテーションセットを JSON ファイル（`tegakari-annotations-*.json`）として export / import（共有・バックアップ用）
- URL パターン別のプレフィックス設定（例: `[repo=my-app]`）
- アノテーションをURL単位で永続化（最大50件、ページ再読み込み後も復元）
- アノテーションのアーカイブ管理（Active / Archived）
- Dark / Light テーマ切り替え対応。Options ページは英語 / 日本語に対応

## 導入方法

### Chrome ウェブストアから（推奨）

Chrome ウェブストアからインストールできます。

<a href="https://chromewebstore.google.com/detail/tegakari/phobgclkkcnkmmfnmloganoefjifnidp" target="_blank">
  <img src="https://developer.chrome.com/static/docs/webstore/branding/image/HRs9MPufa1J1h5glNhut.png" alt="Available in the Chrome Web Store" width="206" />
</a>

### ソースからビルドして読み込む

1. このリポジトリをクローン

   ```bash
   git clone https://github.com/iemong/tegakari.git
   cd tegakari
   pnpm install
   pnpm build
   ```

2. Chromeで `chrome://extensions` を開く

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. クローンしたリポジトリ内の `build/chrome-mv3-prod` フォルダを選択

## 使い方

1. 任意のWebページで拡張機能アイコンをクリック（カーソルが十字に変わります）
   - キーボードショートカット `Ctrl+Shift+Y`（Mac は `Command+Shift+Y`）でもオン/オフを切り替えられます。割り当ては `chrome://extensions/shortcuts` から変更できます
2. 調べたい要素にマウスを合わせるとハイライト表示されます
   - 狙った要素にうまく当たらないときは、`\`（または `↑`）で1つ上の親要素へ、`↓` で子要素へハイライトを移動できます。位置が決まったら `Enter` で確定（クリックでも可）
3. 要素をクリックすると、ピンマーカーが配置されポップオーバーが開きます
4. ポップオーバー内で指示テキストを入力し、**Save** または `Cmd+Enter` で保存します
   - クイック指示チップ（Spacing / Color / Text / Size / Align / Remove）で定型的なヒントを追加したり、**Adjust styles** を開いてスタイル変更をライブプレビューしながら正確な変更前後の値を記録できます
   - ピンのポップオーバーで **Link** をクリックし、別のピンをクリックすると、その2要素にまたがる指示（例:「この2つの間隔を揃えて」）を線で結んで記録できます
5. 複数の要素を続けてクリックすることで、複数要素を同時にアノテーションできます
6. 画面下部のツールバーで操作します：
   - **Inbox**: アノテーション一覧の表示（Active / Archived タブ切替）
   - **Copy**: 全アノテーションをクリップボードにコピー
   - **Copy Image**: 全アノテーションのスクリーンショットを1枚のコンタクトシート画像としてコピー
   - **プリセットドロップダウン**: 出力形式の切り替え — Minimal（デフォルト）/ JSONL / Markdown / Claude Code / Cursor、または Options で定義したカスタムテンプレート
7. Inbox 内の各項目にはコピーボタン（単体コピー）とアーカイブボタンがあります
8. Inbox のインポート / エクスポートボタンで、アノテーションセットを JSON ファイル（`tegakari-annotations-*.json`）として保存・復元できます
9. AIエディタに貼り付けて活用してください
10. `Esc` キーでツールバーを閉じます（アノテーションは保持されます）

### プレフィックス設定

Options ページ（Chrome ツールバーの tegakari アイコンを右クリック →「オプション」）から、URLパターンごとにプレフィックスを設定できます。テーマ（ダーク / ライト）やカスタム出力テンプレートの管理も同じ Options ページで行います。

- **ホスト名マッチ**: `localhost:3000` → そのホストで自動適用
- **正規表現マッチ**: `https?://staging\.example\.com/.*` → URL全体に対してマッチ
- ルールは上から順に評価され、最初にマッチしたものが使われます

設定したプレフィックスはコピー時に出力の先頭に付与されます。

### iframe 内の要素を選択する

Options ページの **Behavior** セクションで「Select inside iframes」を有効にすると、**同一オリジンの iframe** 内の要素も選択できるようになります。Google Apps Script の Web アプリのように、コンテンツを iframe で描画するページのフィードバックに便利です。

- 既定はオフ（通常のページでは不要なため）
- **クロスオリジンの iframe** はブラウザのセキュリティ制約によりアクセスできず、選択対象外です
- iframe 内のさらに入れ子になった iframe（多重 iframe）は対象外（1段のみ）
- iframe 内の要素はフレームワーク／コンポーネント情報の収集は行いません（要素情報・スクリーンショットは取得されます）

### リロード後にアノテーションを保持する / しない

アノテーションはページ単位で保存され、リロードや再訪時にピンが復元されます（長いレビューがリロードで消えないのはこのため）。毎回まっさらな状態から始めたい場合は、Options ページの **Behavior** セクションで「Keep annotations after a reload」をオフにします。オフの間はタブのメモリ上にだけ存在し、ストレージには書き込まれません。

- 既定はオン
- オフにしても保存済みのページはそのまま残り、オンに戻すと復元されます
- 同じセクションの「Stored annotations → Delete all」で、全ページ分の保存済みアノテーションを削除できます（1回目のクリックは確認、2回目で実行）。プレフィックスルール・出力テンプレート・テーマなど他の設定は消えません

正規表現がわからない場合は、`gh skill` で導入できる [`tegakari-prefix-rules` スキル](skills/tegakari-prefix-rules/SKILL.md) を使うと、アプリの URL とリポジトリ名を答えるだけで取り込み用の JSON を対話生成できます。詳細は [`skills/README.md`](skills/README.md) を参照してください。

## 出力例

以下はMarkdown/JSONLのフル出力形式の例です（クイック指示チップ、スタイル変更差分、CSS出所情報、アノテーション間のリレーションを含む）。出力プリセット（Minimal / Claude Code / Cursor）やカスタムテンプレートについては [`docs/output-spec.md`](docs/output-spec.md) を参照してください。

### Markdown形式

```markdown
[repo=my-app]

## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: 設定 | Example App
- **Viewport**: 1920x1080
- **Language**: ja
- **User Agent**: Mozilla/5.0 ...

## Annotation #1
**Instruction**: この保存ボタンの余白を詰めて、角をもう少しシャープにしてほしい
**Tags**: spacing
**Style changes**:
  - padding: 8px 16px → 6px 12px
  - border-radius: 8px → 4px
- **Selector**: `#settings-form > div:nth-child(2) > button.btn-primary`
- **Tag**: `<button>`
- **Text**: "保存する"
- **Attributes**:
  - class: `btn btn-primary px-4 py-2`
  - data-testid: `settings-submit-btn`
  - type: `submit`
- **Styles**:
  - padding: `8px 16px`
  - border-radius: `8px`
  - background-color: `rgb(37, 99, 235)`
  - color: `rgb(255, 255, 255)`
- **CSS Rules**:
  - `.btn-primary` (app.css)
    - background-color: `rgb(37, 99, 235)`
    - border-radius: `8px`
- **Component**: `SettingsPage` → `SettingsForm` → `SubmitButton`
- **Source**: `src/components/SubmitButton.tsx:42`
- **Props**: `{ variant: "primary", disabled: false, onClick: fn }`
- **State**: `{ isSubmitting: false }`

## Annotation #2
**Instruction**: このキャンセルボタンをクリックしたら、変更を破棄する前に確認ダイアログを表示したい
- **Selector**: `#settings-form > div:nth-child(2) > button.btn-secondary`
- **Tag**: `<button>`
- **Text**: "キャンセル"
- **Attributes**:
  - class: `btn btn-secondary px-4 py-2`
  - type: `button`

## Relations
- [#1 ↔ #2] この2つのボタンの横方向の間隔を揃えて
```

### JSONL形式（デフォルト）

```jsonl
{"type":"prefix","content":"[repo=my-app]"}
{"type":"pageContext","url":"https://example.com/dashboard/settings","pageTitle":"設定 | Example App","framework":"React","metaFramework":"Next.js (App Router)","viewport":"1920x1080","language":"ja","userAgent":"Mozilla/5.0 ..."}
{"type":"annotation","id":1,"instruction":"この保存ボタンの余白を詰めて、角をもう少しシャープにしてほしい","tags":["spacing"],"styleDelta":[{"property":"padding","before":"8px 16px","after":"6px 12px"},{"property":"border-radius","before":"8px","after":"4px"}],"element":{"selector":"#settings-form > div:nth-child(2) > button.btn-primary","tag":"button","text":"保存する","attributes":{"class":"btn btn-primary px-4 py-2","data-testid":"settings-submit-btn","type":"submit"},"styles":{"padding":"8px 16px","border-radius":"8px","background-color":"rgb(37, 99, 235)","color":"rgb(255, 255, 255)"},"cssRules":[{"selector":".btn-primary","source":"app.css","declarations":["background-color: rgb(37, 99, 235)","border-radius: 8px"]}]},"component":{"framework":"react","hierarchy":["SettingsPage","SettingsForm","SubmitButton"],"source":"src/components/SubmitButton.tsx:42","props":{"variant":"primary","disabled":false,"onClick":"fn"},"state":{"isSubmitting":false}}}
{"type":"annotation","id":2,"instruction":"このキャンセルボタンをクリックしたら、変更を破棄する前に確認ダイアログを表示したい","element":{"selector":"#settings-form > div:nth-child(2) > button.btn-secondary","tag":"button","text":"キャンセル","attributes":{"class":"btn btn-secondary px-4 py-2","type":"button"}}}
{"type":"relation","id":1,"from":1,"to":2,"instruction":"この2つのボタンの横方向の間隔を揃えて"}
```

## 対応フレームワーク

| フレームワーク | 検出内容 |
|---|---|
| React | コンポーネント階層、Props、State（Hooks） |
| Vue 2 / 3 | コンポーネント階層、Props、Data |
| Svelte | コンポーネント階層、ソース位置（`file:line`、dev buildのみ） |
| Next.js | App Router / Pages Router の検出 |
| Nuxt | フレームワーク検出 |
| SvelteKit | フレームワーク検出 |

## 開発

```bash
pnpm dev        # 開発モード（ホットリロード対応）
pnpm build      # 本番ビルド
pnpm test       # テスト実行
pnpm package    # ZIP パッケージ化（配布用）
```

## コントリビューション

バグ報告・機能要望・プルリクエストを歓迎します。大きな変更よりも、
小さく焦点を絞ったPRを推奨します。開発環境のセットアップ、品質ゲート、
PRの出し方は [CONTRIBUTING.md](CONTRIBUTING.md)（英語）を参照してください。

## 開発を応援する

tegakari は無料・オープンソースで開発しています。便利だと感じていただけたら、
GitHub Sponsors からの応援をいただけると開発の励みになります 🙏

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-db61a2?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/iemong)

> Sponsor ボタンが表示されない場合は、GitHub Sponsors の登録・承認が完了するまで
> お待ちください。

## ライセンス

[MIT License](LICENSE)
