# tegakari 出力仕様書

English version: [output-spec.en.md](./output-spec.en.md)

## 概要

Chrome拡張機能「tegakari」は、Webページ上の要素を選択し、そのコンテキスト情報をMarkdownまたはJSONL形式で生成する。
生成されたテキストはクリップボードにコピーされ、Claude CodeやCursorなどのAIエディタに貼り付けて使用する。

## 対象フレームワーク

- React (Next.js含む)
- Vue (Nuxt含む)
- Svelte (SvelteKit含む)。コンポーネント情報の収集はdev buildのみ（詳細は[Component Tree](#4-component-tree)参照）
- フレームワーク未検出の場合も動作する（一部セクション省略）

## 出力形式

Toolbarのドロップダウンから5つの組み込み出力プリセット（`jsonl` / `markdown` / `claude-code` / `cursor` / `minimal`）に加え、ユーザーが定義した[カスタムテンプレート](#カスタムテンプレート)を選択できる。クリップボードにコピーして使用する。デフォルトは`minimal`。各プリセットの詳細は[出力プリセット](#出力プリセット)を参照。

## セクション構成

### 1. User Instruction

ユーザーが自由入力したテキスト。選択した要素に対してどのような変更・確認を行いたいかの指示。
出力の先頭に配置し、AIエディタに貼り付けたとき「何をしたいか → その対象のコンテキスト」の順で読めるようにする。

- UIにはテキストエリアを設ける
- クリップボードコピー時に他のセクションと一緒にコピーされる

#### Tags（クイック指示チップ）

ピンのポップオーバーに、指示テキストエリアの周辺に固定6種のカテゴリチップを配置する。非エンジニアでも定型カテゴリを選んで一言添えるだけで構造化された指示を作れるようにするための機能。

| id | 表示ラベル |
|---|---|
| `spacing` | Spacing |
| `color` | Color |
| `text` | Text |
| `size` | Size |
| `align` | Align |
| `remove` | Remove |

- 複数選択可・トグル式。選択順を保持する
- `Annotation.tags?: string[]`（選択されたチップの`id`配列）として保存される。未設定・空配列は「タグなし」として扱われ、出力上も同じ（該当行/タグが省略される）
- ポップオーバーを閉じて再度開いたとき、選択状態が復元される
- 出力への反映（内容は`id`をそのまま使用し、表示ラベルではない）:
  - **JSONL**: `annotation`オブジェクトに`"tags":["spacing","color"]`を追加（空なら`tags`キー自体を省略）
  - **Markdown**（full/cursor共通）: `**Instruction**`行の直後に`**Tags**: spacing, color`を追加（空なら行ごと省略）
  - **minimal（Feedback Report）**: 引用ブロックの直後・`- Element:`行の上に`- Tags: \`spacing, color\``を追加（空なら行ごと省略。[minimalプリセットの形式](#minimalプリセットの形式)参照）
  - **claude-code（XML）**: `<instruction>`の直後に`<tags>spacing, color</tags>`を追加（instructionが空でtagsのみある場合もこの位置に出力し、tagsが空なら省略）

#### Style changes（ページ上スタイル調整モード）

ピンのポップオーバーに「Adjust styles」トグルで開く調整パネルを設け、対象要素のスタイルをその場でプレビューしながら調整できる。v1の対象プロパティ（この順で固定）: `margin` / `padding` / `font-size` / `line-height` / `color` / `background-color` / `border-radius` / `gap`。

- 入力変更で対象要素にインラインスタイルとして即時プレビューを適用する。プレビューの適用/解除は要素の元のinline style値を退避してから行い、reset時に正確に復元する（元々inline styleが設定されていた要素を破壊しない）
- Save時、変更前後が同一の行は含めずに `Annotation.styleDelta?: StyleDelta[]`（`{ property, before, after }`の配列。`property`はユニーク、配列順は編集順）として保存される。未設定・空配列は「変更なし」として扱われ、出力上も同じ（該当セクションが省略される）
- ページ再訪時（ピン復元時）にプレビューは自動再適用しない。記録（styleDelta）は残るが見た目は素のままで、ポップオーバーを開くと保存済みの値が行に復元される
- 出力への反映:
  - **JSONL**: `annotation`オブジェクトに`"styleDelta":[{"property":"margin","before":"16px","after":"8px"}]`を追加（空なら`styleDelta`キー自体を省略）
  - **Markdown**（full/cursor共通。minimalは[Feedback Report形式](#minimalプリセットの形式)のため省略）: `**Tags**`行の直後に以下を追加（styleDeltaが無ければセクションごと省略）
    ```
    **Style changes**:
      - margin: 16px → 8px
      - color: rgb(51, 51, 51) → #2563eb
    ```
  - **claude-code（XML）**: `<tags>`の直後（tagsが無い場合もこの位置）に以下を追加（styleDeltaが無ければタグごと省略）
    ```
    <style-changes>
    margin: 16px → 8px
    </style-changes>
    ```
    既存の`<style-diff>`（Selected ElementのStylesと同じ内容＝現状の実効スタイル）とは別物なので混同しないこと

### 2. Page Context

| 項目 | 内容 | 取得方法 |
|---|---|---|
| URL | ページのURL | `location.href` |
| Framework | 検出されたフレームワーク名（検出時のみ。React/Vueはバージョン無し、Svelteのみメジャーバージョン込み） | グローバル変数チェック |
| Meta Framework | 検出されたメタフレームワーク名（検出時のみ。例: `Next.js (App Router)` / `Nuxt` / `SvelteKit`）。Framework行とは別行 | グローバル変数・DOM要素チェック |
| Page Title | ページタイトル | `document.title` |

**フレームワーク検出方法:**

- **React**: `__REACT_DEVTOOLS_GLOBAL_HOOK__` の存在
- **Next.js**: `__NEXT_DATA__` の存在（App Router / Pages Router判定含む）
- **Vue**: `__vue__` または `__VUE__` の存在
- **Nuxt**: `__NUXT__` の存在
- **Svelte**: `window.__svelte.v`（バージョン登録用Set、dev/prod両対応）を優先し、取得できればメジャーバージョンを`Svelte 5`のように付与。無ければ`svelte-`ハッシュクラス名や要素の`__svelte_meta`（dev buildのみ）にフォールバック
- **SvelteKit**: `#svelte-announcer`要素、`data-sveltekit-*`属性、`__sveltekit_`で始まるグローバル変数の存在

### 3. Selected Element

| 項目 | 内容 | 取得方法 |
|---|---|---|
| Selector | 一意なCSSセレクターパス | 要素から上方向トラバース |
| Tag | HTMLタグ名 | `element.tagName` |
| Text | テキストコンテンツ | `element.innerText` |
| Attributes | 主要な属性一覧（class, id, data-*, role, aria-*, name, type, href等） | `element.attributes` |
| Styles | 実際に効いているスタイルの抜粋（後述） | `getComputedStyle` のデフォルト値とのdiff |
| CSS Rules | 選択要素にマッチする同一オリジンCSSルール（後述） | `document.styleSheets` のCSSOM走査 + `element.matches()` |

#### Styles（スタイル差分）

「ここの余白を詰めて」「色を変えて」といったUI修正指示にAIが実測値で応えられるよう、選択要素の computed style を出力に含める。ただし全プロパティ（300個超）を出力するとノイズになるため、次の2段階で圧縮する。

1. **厳選プロパティのみ対象**: layout（display, position, flex/grid系等）・box model（width, height, margin, padding, border, border-radius等）・typography（font系, color等）・visual（background, opacity, box-shadow等）の約40プロパティ
2. **タグデフォルトとのdiff**: 同タグの素の要素（`display: none` のラッパー内に生成）の computed style をベースラインとし、一致する値は省略。ページルートから単純に継承しただけの値もベースライン側に含まれるため除外される

**出力条件**: diff結果が1件以上ある場合のみ。`Attributes` の後に配置する。

#### CSS Rules（CSS出所）

Styles（computed styleの差分）だけでは、その値が**どのCSSルールから来たか**が分からない。AIが「どのファイルのどのセレクタを直せばよいか」を事実で判断できるよう、同一オリジンのスタイルシートのCSSOMを走査し、選択要素にマッチするCSSルールをその出所（ファイル名・セレクタ・宣言・@media/@supports条件）とともに出力する。

- **走査対象**: `document.styleSheets`（同一オリジン iframe 内の要素の場合はそのiframeのdocument）。`<style>`/`<link>` を問わず走査し、`@media`/`@supports` などのグルーピングルールの中も再帰的に走査する
- **マッチ判定**: 各 `CSSStyleRule` について `element.matches(rule.selectorText)`
- **クロスオリジン制約**: 別オリジンのスタイルシート（CDN配信のCSS等）は `cssRules` アクセス時にブラウザのセキュリティ制約で例外が発生するため、静かにスキップする（出力からは単に除外される）
- **収集内容**（ルールごと）:
  - `selector`: `selectorText`
  - `source`: スタイルシートのhrefのファイル名部分（例: `app.css`）。`<style>`タグ由来は`inline`
  - `declarations`: そのルールが宣言する`property: value`の一覧（`!important`は値に含める）
  - `media`: `@media`/`@supports`のネスト内にある場合のみ、その条件文
- **上限**: ルール数は最大10件（詳細度ではなく**文書内出現の逆順＝後勝ち優先**で新しい方から10件）、1ルールあたりの宣言数は最大15件。超過分は切り捨てる
- **パフォーマンス制約**: ページ全体のCSSルール総数が5,000件を超える場合は走査を打ち切り、そこまでの部分結果を返す

##### CSS Variables（CSSカスタムプロパティの解決）

収集した`declarations`の値に`var(--x)`が含まれる場合、`getComputedStyle(element).getPropertyValue("--x")`で解決した最終値を`customProperties`として別途収集する（最大10件）。`var()`の参照チェーンの中間値は出力せず、最終的に解決された値のみを出力する。

**出力条件**: マッチしたルールが1件以上ある場合のみ`CSS Rules`を、参照されたカスタムプロパティが1件以上ある場合のみ`CSS Variables`を出力する。`Styles`の直後に配置する。

### 4. Component Tree

**表示条件**: React・Vue・Svelte のいずれかが検出された場合のみ。未検出時はセクション自体を省略する。

#### React の場合

- コンポーネントの階層パス（`Parent` → `Child` → `GrandChild`）
- Source（取得できた場合のみ）
- Props
- State

**取得方法**: React Fiber（`__reactFiber$*`, `__reactProps$*`）経由。Main World injection が必要。

#### Vue の場合

- コンポーネントの階層パス
- Source（取得できた場合のみ）
- Props
- Data

**取得方法**: `__vue__` または `__vueParentComponent` 経由。Main World injection が必要。

#### Svelte の場合

- コンポーネントの階層パス（クリック要素から祖先方向にDOMを辿り、各要素の`__svelte_meta.loc.file`のファイル名から拡張子を除いたものをルート→末端順・重複除去で構築。Svelteはコンポーネントの実行時「名前」を持たないため、ソースファイル名を代用する）
- Source（最も近い祖先の`loc.file:line`）
- Props / State は取得しない（Svelte 4のクロージャとSvelte 5のシグナルで内部構造が異なり、安全にシリアライズできる共通の実行時表現が無いため）

**取得方法**: DOM要素の`__svelte_meta`（dev buildのみ付与される）を要素自身から祖先方向に探索。fiber/vnodeのような仮想ツリーが存在しないため実DOMを直接辿る。prod buildでは`__svelte_meta`が付与されないため、Svelte自体の検出はできてもComponent Treeセクションは省略される。

#### Source（ソースコード位置）

選択要素に対応するソースファイルパス（取得できれば行番号付き）を `path/to/file.tsx:42` 形式で出力する。AIエディタが対象ファイルを探索する手間を省くための情報。

| フレームワーク | 取得方法 | 備考 |
|---|---|---|
| React | Fiber の `_debugSource`（要素のJSX記述位置）。要素自身になければ祖先・`_debugOwner` をフォールバック探索 | dev build のみ。React 19 では `_debugSource` が削除されたため取得不可 |
| Vue 3 | コンポーネントの `type.__file`（SFCコンパイラが付与） | dev build のみ。行番号なし |
| Vue 2 | `$options.__file` | dev build のみ。行番号なし |
| Svelte | 要素の `__svelte_meta.loc`（`file`/`line`） | dev build のみ。祖先方向に最も近い要素のlocを採用 |

**出力条件**: 取得できた場合のみ。prod build では通常取得できないため省略される。

### 5. Relations（要素間リレーション注釈）

「この2つの間隔を揃えて」「AをBと同じ幅に」のような**2要素にまたがる指示**を表現する。既存アノテーション（ピン）2つを関連付け、リレーション自体に指示テキストを持たせる。

- ピンのポップオーバーの「Link」ボタンでリンクモードに入り、別のピンをクリックすると2ピン間のリレーションが作られる（指示は空不可）
- `Relation`: `{ id, fromId, toId, instruction }`（`fromId`/`toId` は `Annotation.id`。順序は区別しない）
- 同じペア（順序不問）の重複リレーションは作成不可。アノテーション削除時、そのIDを含むリレーションも連動して削除される（カスケード削除）
- 画面上は関連付いたピン同士をSVGの線で結び、線の中点の番号付きラベルをクリックすると指示の編集・削除ができる

**出力条件**: **バッチ出力のみ**（単体コピー・個別ピンコピーには含まれない）。リレーションが1件も無ければ、以下いずれの形式でも該当セクション/行/タグを一切出力しない。

- **Markdown**（full/cursor共通。minimalは[Feedback Report形式](#minimalプリセットの形式)のため省略）: 全 `## Annotation` セクションの後に追加
  ```
  ## Relations
  - [#1 ↔ #2] Make the spacing between these equal
  ```
- **JSONL**: `annotation` 行の後に、リレーション1件につき1行
  ```jsonl
  {"type":"relation","id":1,"from":1,"to":2,"instruction":"Make the spacing between these equal"}
  ```
- **claude-code（XML）**: `</annotation>` 群の後・`</tegakari-output>` の前に、リレーション1件につき1ブロック
  ```
  <relation id="1" from="1" to="2">
  Make the spacing between these equal
  </relation>
  ```

## 出力例

実際にUIからコピーされる出力は、ピン（アノテーション）が1件だけでも常に**バッチ形式**（`## Page Context` を先頭に1回、`## Annotation #N` をピンごとに繰り返す形）になる。単一オブジェクト形式（`## User Instruction` + `## Selected Element` のように `id` を持たない形）は生成コードに現存しない。

### React (Next.js) サイト

```markdown
## Page Context
- **URL**: https://example.com/dashboard/settings
- **Framework**: React
- **Meta Framework**: Next.js (App Router)
- **Page Title**: 設定 | Example App

## Annotation #1
**Instruction**: この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい
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
  - font-size: `14px`
- **Component**: `SettingsPage` → `SettingsForm` → `SubmitButton`
- **Source**: `src/components/SubmitButton.tsx:42`
- **Props**: `{ variant: "primary", disabled: false, onClick: fn }`
- **State**: `{ isSubmitting: false }`
```

### フレームワーク未検出の静的サイト（Component情報省略）

```markdown
## Page Context
- **URL**: https://corporate.example.com/about
- **Page Title**: 会社概要 | Example Corp

## Annotation #1
**Instruction**: このリンクの遷移先を /members/tanaka/profile に変更したい
- **Selector**: `.about-section > .team-list > li:nth-child(3) > a`
- **Tag**: `<a>`
- **Text**: "田中太郎"
- **Attributes**:
  - class: `team-member__link`
  - href: `/members/tanaka`
```

### Vue (Nuxt) サイト

```markdown
## Page Context
- **URL**: https://shop.example.com/products/123
- **Framework**: Vue
- **Meta Framework**: Nuxt
- **Page Title**: 商品詳細 | Example Shop

## Annotation #1
**Instruction**: 割引価格の表示フォーマットをカンマ区切りに変更したい
- **Selector**: `.product-card > .price-section > span.price`
- **Tag**: `<span>`
- **Text**: "¥1,980"
- **Attributes**:
  - class: `price price--discount`
  - data-original-price: `2,480`
- **Component**: `ProductDetail` → `PriceSection` → `PriceDisplay`
- **Props**: `{ price: 1980, originalPrice: 2480, currency: "JPY" }`
- **Data**: `{ showDiscount: true }`
```

より実際のコピー結果に近い例（複数ピン・Component情報込み）は `docs/store-assets/sample-output.md` / `docs/store-assets/sample-output.jsonl` を参照。

## JSONL出力形式

JSONL（JSON Lines）形式では、各セクションが独立したJSON行として出力される。AIエディタが構造化データとしてパースしやすい形式。UIからのコピーは常に**バッチ形式**であり、ピン1件のみのコピーでも`annotation`行が1件（`id`付き）入る形になる。

### 行構成

| 行 | type | 出力条件 |
|---|---|---|
| 1 | `prefix` | プレフィックスルールがマッチした場合のみ（先頭） |
| 2 | `pageContext` | 常に1回出力 |
| 3〜 | `annotation` | ピンごとに1行（`id`付き、1件以上） |
| 末尾 | `relation` | リレーションがある場合のみ、1件につき1行（**バッチ出力のみ**。詳細は[Relations](#5-relations要素間リレーション注釈)参照） |

`annotation`行の構成キー: `id`（必須）、`instruction`（あれば）、`tags`（あれば）、`styleDelta`（あれば）、`element`（必須）、`component`（フレームワーク検出時のみ）。

`element`は、マッチしたCSSルールがあれば`cssRules`、参照されたCSSカスタムプロパティがあれば`customProperties`キーを追加で持つ（詳細は[CSS Rules（CSS出所）](#css-rulescss出所)参照）。いずれも無ければキー自体を省略する。

### JSONL出力例

#### React (Next.js) サイト

```jsonl
{"type":"pageContext","url":"https://example.com/dashboard/settings","pageTitle":"設定 | Example App","framework":"React","metaFramework":"Next.js (App Router)"}
{"type":"annotation","id":1,"instruction":"この保存ボタンをクリックしたらconfirmダイアログを表示するようにしたい","element":{"selector":"#settings-form > div:nth-child(2) > button.btn-primary","tag":"button","text":"保存する","attributes":{"class":"btn btn-primary px-4 py-2","data-testid":"settings-submit-btn","type":"submit"},"styles":{"padding":"8px 16px","border-radius":"8px","background-color":"rgb(37, 99, 235)","color":"rgb(255, 255, 255)","font-size":"14px"}},"component":{"framework":"react","hierarchy":["SettingsPage","SettingsForm","SubmitButton"],"source":"src/components/SubmitButton.tsx:42","props":{"variant":"primary","disabled":false,"onClick":"fn"},"state":{"isSubmitting":false}}}
```

#### フレームワーク未検出の静的サイト

```jsonl
{"type":"pageContext","url":"https://corporate.example.com/about","pageTitle":"会社概要 | Example Corp"}
{"type":"annotation","id":1,"instruction":"このリンクの遷移先を /members/tanaka/profile に変更したい","element":{"selector":".about-section > .team-list > li:nth-child(3) > a","tag":"a","text":"田中太郎","attributes":{"class":"team-member__link","href":"/members/tanaka"}}}
```

#### Vue (Nuxt) サイト

```jsonl
{"type":"pageContext","url":"https://shop.example.com/products/123","pageTitle":"商品詳細 | Example Shop","framework":"Vue","metaFramework":"Nuxt"}
{"type":"annotation","id":1,"instruction":"割引価格の表示フォーマットをカンマ区切りに変更したい","element":{"selector":".product-card > .price-section > span.price","tag":"span","text":"¥1,980","attributes":{"class":"price price--discount","data-original-price":"2,480"}},"component":{"framework":"vue","hierarchy":["ProductDetail","PriceSection","PriceDisplay"],"props":{"price":1980,"originalPrice":2480,"currency":"JPY"},"data":{"showDiscount":true}}}
```

## 出力プリセット

Toolbarの形式ドロップダウンでは、上記のMarkdown/JSONLに加えて3つのプリセットを選択できる。プリセットは「ベース形式＋セクションの取捨・深さ」の組み合わせとして定義されており、単体コピー・一括コピー・個別ピンコピーのいずれの経路でも選択中のプリセットが適用される。プレフィックスルール（`[repo=...]`）は従来どおりプリセットに関わらず出力全体の先頭に付与される。

| preset id | ベース形式 | 内容 |
|---|---|---|
| `jsonl` | JSONL | 既存のフル出力（デフォルト） |
| `markdown` | Markdown | 既存のフル出力 |
| `claude-code` | XMLタグ構造 | 下記のXMLラッパー形式。tegakari-fixスキルの自動起動マーカーを兼ねる |
| `cursor` | Markdown | 簡潔版。Page Contextはurl/title/frameworkのみ（バッチ時のmetadataは省略）、Component Treeは名前（選択要素に近い最大3階層）とSourceのみでProps/Stateは省略 |
| `minimal` | Markdown（独自構造） | レビューコメント形式の**Feedback Report**（デフォルト）。指示を引用、続けてTagsと要素のElement/Selector/Classes/Textの行のみ。Attributes全体・Styles・CSS Rules/CSS Variables・Component Tree・Style changes・Relationsは省略。下記[minimalプリセットの形式](#minimalプリセットの形式)参照 |

### minimalプリセットの形式

`src/lib/feedback-generator.ts`が生成する。他のプリセットと違い、Markdown生成器のセクション構造ではなく専用のレビューコメント形式を持つ。

```
[repo=my-app]            ← プレフィックスルールがマッチした場合のみ
---

# Feedback Report
URL: <ページURL>

## Feedback #1
> ユーザー指示テキスト

- Tags: `spacing, color`
- Element: `<button>`
- Selector: `button.btn`
- Classes: `btn, btn-ghost, btn-lg, btn-block`
- Text: "別のアカウントでログインする"

## Feedback #2
...
```

- セクション番号`#N`はアノテーションの`id`（ページ上のピン番号と一致する。配列内の位置ではない）
- 指示テキストは各行の先頭に`> `を付ける（複数行でも引用が崩れない）。指示が空の場合は引用ブロックごと省略し、見出しは残す
- `Tags`は選択されたクイック指示チップの`id`をカンマ区切りにし、リスト全体を1つのコード記法で囲む（表示ラベルではない）。要素の各行より上に置く。タグが無い場合は行ごと省略
- `Classes`は`class`属性を空白で分割してカンマ区切りにし、リスト全体を1つのコード記法（バッククォート）で囲む。クラスが無い場合は行ごと省略
- `Text`が空の場合は行ごと省略。`Element`と`Selector`は常に出力される
- アノテーションが0件の場合はヘッダー（`---`〜`URL:`）のみを出力する
- プレフィックスルール（`[repo=...]`）は`---`より前、出力全体の先頭に付与される

### claude-code プリセットの形式

```
[repo=my-app]            ← プレフィックスルールがマッチした場合のみ
<tegakari-output version="1" preset="claude-code">
<page-context>
（Page Context セクションと同じ内容行）
</page-context>
<annotation id="1">
<instruction>
（ユーザー指示テキスト。無い場合はタグごと省略）
</instruction>
<tags>spacing, color</tags>  ← 選択されたクイック指示チップがある場合のみ
<style-changes>
（Style changes と同じ内容。styleDeltaが無ければタグごと省略。<style-diff>とは別物）
</style-changes>
<element>
（Selected Element セクションと同じ内容行。Stylesは含まないが、CSS Rules/CSS Variablesは含む）
</element>
<component>
（Component Tree セクションと同じ内容行。componentInfoが無い場合はタグごと省略）
</component>
<style-diff>
（Selected Element の Styles と同じ内容行。無い場合はタグごと省略）
</style-diff>
</annotation>
<annotation id="2">
...
</annotation>
<relation id="1" from="1" to="2">
（リレーションの指示テキスト）
</relation>  ← リレーションがある場合のみ、全annotationの後・</tegakari-output>の前
</tegakari-output>
```

- 先頭マーカー行 `<tegakari-output version="1" preset="claude-code">` は不変の契約であり、tegakari-fixスキルはこの文字列で自動起動する
- 内側の各タグの本文は既存Markdown生成器の対応セクションと同等の情報量（見出し記法`##`は無く、キー:値の行形式のみ）
- 単体コピー・個別ピンコピーでも同じラッパーを使い、`<annotation>`は1つだけになる
- `<tags>`は選択されたクイック指示チップ（「1. User Instruction」内のTags節を参照）がある場合のみ、`<instruction>`の直後（instructionが無い場合もこの位置）に出力される
- `<style-changes>`は`<tags>`の直後（tagsが無い場合もこの位置）に、styleDeltaがある場合のみ出力される（詳細は[Style changes](#style-changesページ上スタイル調整モード)参照）

### カスタムテンプレート

組み込み5プリセットに加え、ユーザーが自分のAIワークフロー向けに出力形式を定義できる。Options画面の「Output Templates」セクションで作成し、Toolbarのプリセットドロップダウンに組み込み5件の下へ列挙される。

- **データモデル**（`src/lib/output-templates.ts`の`OutputTemplate`）: `{ id, name, header, annotation }`。`header`はコピー1回につき先頭に1度だけ、`annotation`はアノテーションごとに繰り返し描画されるテンプレート文字列
- **保存**: `chrome.storage.local`キー`tegakariOutputTemplates`（配列）。上限**10件**（`MAX_OUTPUT_TEMPLATES`）
- **選択値**: 保存済みプリセット設定の値空間は組み込み5値に加えて`custom:<id>`形式の文字列を取る（`id`は該当`OutputTemplate.id`）
- **描画**: `header`を描画 → 各`annotation`を順に描画 → それぞれ前後の空白をtrimし、空になったパートは除いてから`\n\n`で連結する。プレフィックスルール（`[repo=...]`）は、`header`テンプレートに`{{prefix}}`が**含まれない場合のみ**従来どおり出力全体の先頭に自動付与される（含まれる場合はユーザーの配置を尊重）
- **プレースホルダー**（mustache風`{{key}}`。条件分岐・ループは無し。値が無い場合は空文字に置換、未知のプレースホルダーはそのまま残す。エスケープ処理は行わない）
  - `header`用: `{{prefix}}` `{{page.url}}` `{{page.title}}` `{{page.framework}}` `{{page.metaFramework}}` `{{annotationCount}}`
  - `annotation`用: `{{id}}` `{{instruction}}` `{{tags}}`（カンマ区切り） `{{selector}}` `{{tag}}` `{{classes}}`（カンマ区切り。装飾なし） `{{text}}` `{{attributes}}`（`key: value`の行群） `{{styles}}`（`key: value`の行群） `{{component.hierarchy}}`（`A → B → C`） `{{component.name}}`（末端のコンポーネント名） `{{component.source}}` `{{component.props}}`（JSON文字列）
  - v1では`styleDelta`（Style changes）・`cssRules`・`customProperties`・Relations用のプレースホルダーは提供しない
- **フォールバック挙動**: コピー時に`custom:<id>`が参照するテンプレート実体が見つからない場合（削除済みなど）は、`jsonl`プリセットのバッチ出力にフォールバックする
- Import/Export: `OutputTemplate[]`のJSON配列。不正な要素はスキップされ警告される（Prefix Rulesのインポート挙動を踏襲）

## 技術的制約

- Content ScriptはIsolated Worldで動作するため、ページのJSコンテキストに直接アクセスできない
- React Fiber や Vue インスタンスなどフレームワーク固有情報の取得には **Main World injection**（`world: "MAIN"`）が必要
- Main Worldスクリプトとの通信は `window.postMessage` または Plasmo の Relay Flow を使用する
- スタイル情報は computed style の差分抽出（Selected Element の Styles 参照）に加え、同一オリジンスタイルシートのCSSOM走査によるCSS出所情報（Selected Element の CSS Rules 参照）を含む。クロスオリジンのスタイルシート（CDN配信のTailwind等）は `cssRules` アクセスがブラウザのセキュリティ制約で例外になるため出力に含まれない。CSSカスタムプロパティは `var()` の最終解決値のみを収集し、参照チェーンの中間値は出力しない
