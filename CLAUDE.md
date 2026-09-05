# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tegakari は、Webページ上の要素を選択し、そのコンテキスト情報（要素情報、フレームワーク、コンポーネント階層など）をMarkdownまたはJSONL形式で生成するChrome拡張機能。生成したテキストとスクリーンショットをクリップボードにコピーし、AIエディタ（Claude Code, Cursorなど）で活用することを目的とする。

## Commands

```bash
pnpm dev        # 開発モード（Plasmo dev server起動、ホットリロード対応）
pnpm build      # 本番ビルド（build/chrome-mv3-prod/に出力）
pnpm package    # ZIPパッケージ化（配布用）

pnpm lint       # Biome lint（lint:fix で自動修正、format でフォーマット）
pnpm test       # vitest（unit、jsdom環境）
pnpm test:coverage  # カバレッジ付き実行（閾値90%）
pnpm e2e        # Playwright E2E（headed必須・直列実行、初回は拡張を自動ビルド）
```

パッケージマネージャーは **pnpm** を使用。

### テスト・品質ゲート

- **unit**: vitest + Testing Library（jsdom）。テストは各ディレクトリの `__tests__/` に配置
- **e2e**: Playwright（`tests/e2e/`）。MV3 Service Worker の制約で headless 不可・`workers: 1` 固定。`tests/e2e/fixtures.ts` の拡張fixture経由で persistent context を作る。`E2E_REBUILD=1` で拡張を再ビルド
- **lefthook**: pre-commit で typecheck + test、pre-push でカバレッジ（90%閾値。`src/contents/` のUI系・`src/components/` は除外）
- **Biome**: 1ファイル300行制限（nursery rule）あり。超える場合はファイル分割する（例: `react-collector.source.test.ts` のようにテストを関心ごとに分ける）

## Architecture

Plasmoフレームワーク（Manifest V3）ベースのChrome拡張機能。3つの実行コンテキストが`window.postMessage`とChrome Runtime APIで連携する。

### 実行コンテキストと通信フロー

```
Background (Service Worker)
  │  chrome.tabs.sendMessage({ type: "TEGAKARI_TOGGLE" })
  │  chrome.tabs.captureVisibleTab() ← スクリーンショット撮影
  ▼
Content Script - Isolated World (overlay.tsx)
  │  UI描画・要素選択・ハイライト・アノテーション管理
  │  window.postMessage({ type: "TEGAKARI_COLLECT", selector })
  ▼
Content Script - Main World (main-world.ts)
  │  フレームワーク検出・コンポーネント情報収集
  │  window.postMessage({ type: "TEGAKARI_RESULT", framework, component })
  ▼
Content Script - Isolated World
    JSONL/Markdown生成 → クリップボードコピー
```

- **Background** (`src/background.ts`): 拡張アイコンクリック→TEGAKARI_TOGGLEを中継。TEGAKARI_CAPTUREリクエストでスクリーンショット撮影（`chrome.tabs.captureVisibleTab`）
- **Isolated World** (`src/contents/overlay.tsx`): React製オーバーレイUI。要素選択、ハイライト、アノテーション管理、出力生成を担当。ロジックは `use-overlay.ts` / `use-annotations.ts` / `overlay-helpers.ts` に分離
- **Main World** (`src/contents/main-world.ts`): ページのJSコンテキストに注入され、フレームワークのグローバル変数やReact Fiber/Vue内部構造にアクセス。Plasmoの`"world": "MAIN"`設定で実現
- **Options** (`src/options.tsx`, `src/options/`): プレフィックスルール（URLパターン→指示プレフィックス）の管理とテーマ設定。ルールはJSONでimport/export可能

### メッセージ型

| メッセージ | 経路 | 用途 |
|-----------|------|------|
| `TEGAKARI_TOGGLE` | Background → Isolated World (chrome.runtime) | 拡張ON/OFF切替 |
| `TEGAKARI_CAPTURE` | Isolated World → Background (chrome.runtime) | スクリーンショット要求 |
| `TEGAKARI_COLLECT` | Isolated World → Main World (postMessage) | 要素のフレームワーク情報収集要求 |
| `TEGAKARI_RESULT` | Main World → Isolated World (postMessage) | フレームワーク・コンポーネント情報の返却 |

### 主要モジュール（src/lib/）

| モジュール | 役割 |
|-----------|------|
| `framework-detector.ts` | React, Vue, Next.js, Nuxtの検出（グローバル変数・DOM要素ベース） |
| `react-collector.ts` | React Fiberからコンポーネント階層・Props・State（Hooks経由）を収集 |
| `vue-collector.ts` | Vue 2/3の内部構造からコンポーネント情報を収集 |
| `selector.ts` | 要素からユニークなCSSセレクターを生成（ID → クラス → nth-child フォールバック） |
| `markdown-generator.ts` | 収集情報をMarkdown形式にフォーマット（単体・バッチ両対応） |
| `jsonl-generator.ts` | 収集情報をJSONL形式にフォーマット（単体・バッチ両対応） |
| `serialize.ts` | Fiber/Vue内部オブジェクトの安全なシリアライズ（深度・キー数・配列長制限） |
| `annotation-order.ts` | アノテーション番号の振り直し（表示順で1..N、欠番なし）・並び替え・安定ID（`uid`）の生成 |
| `annotation-store.ts` | アノテーションのURL単位永続化（`chrome.storage.local`、上限50件） |
| `prefix-rules.ts` | URLパターン→プレフィックスのルール管理・マッチング・JSONシリアライズ |
| `theme.ts` | ダーク/ライトテーマ定義、ThemeContext、`chrome.storage.local`で永続化 |
| `types.ts` | メッセージ型・Annotation・BatchInput等の型定義 |

### UIコンポーネント（src/components/）

- `Toolbar.tsx`: 画面下部の操作バー。Inbox開閉、一括コピー、フォーマット切替（JSONL/MD）、拡張OFF
- `InboxPanel.tsx` + `annotation-list.tsx` + `annotation-row.tsx`: アノテーション一覧パネル。プレフィックス入力、個別コピー・削除、全削除、行のドラッグ&ドロップ並び替え
- `AnnotationPin.tsx`: 各アノテーションの番号付きピン（クリック位置に配置）。ポップオーバーで指示テキスト編集
- `HighlightBox.tsx`: マウスオーバー時の要素ハイライト表示
- `icons.tsx`: SVGアイコン集

クリップボード操作は `src/hooks/use-clipboard.ts`（Clipboard API + execCommandフォールバック）。

### マルチ要素アノテーション

メインのワークフロー。複数要素を順次クリックしてアノテーション（ID付き）を収集し、一括でエクスポートする。

- **Annotation型**: ID、ElementInfo、FrameworkInfo、ComponentInfo、instruction（ユーザー指示）、クリック座標、自動クロップ済みスクリーンショットを保持
- **非同期フレームワーク収集**: 要素クリック→Annotation即時作成→Main Worldへフレームワーク情報を非同期リクエスト（`pendingIdRef`で対応するAnnotationを追跡）→結果受信でAnnotation更新
- **永続化**: URL単位（hash除外）で `chrome.storage.local` に保存され、再訪時にピンが復元される（`annotation-store.ts`）
- **出力形式**: JSONL（デフォルト）またはMarkdown。バッチ出力ではPage Contextを共有し、各Annotationを個別セクションとして出力。プレフィックスルールにマッチするURLでは指示プレフィックスが自動付与される

### テーマシステム

- ダーク（デフォルト）/ ライトモード。クールブルー（`#2563eb`）をアクセントカラーとして使用
- `ThemeContext`経由で全コンポーネントに配布、`useTheme()`フックでアクセス
- `chrome.storage.local`（キー: `tegakariTheme`）で永続化

## Key Technical Details

- **Isolated World と Main World の分離**: Content ScriptはIsolated Worldで動作するため、ページのフレームワーク情報にアクセスするにはMain World注入が必須
- **安全なシリアライズ**: React Fiber/Vue内部オブジェクトは循環参照を含むため、深度制限（最大3階層）・キー数制限（最大20）・配列要素制限（最大10）を適用してシリアライズ
- **出力仕様**: `docs/output-spec.md` にMarkdown/JSONL出力形式の詳細仕様が定義されている。変更時は参照必須
- **UIイベント分離**: オーバーレイUI上のクリックがページ要素のアノテーション作成を誤発火しないよう、`e.stopPropagation()`とdata属性チェックで制御
