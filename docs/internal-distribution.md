# 社内配布ガイド（自前ホスト + 強制インストール）

Chrome ウェブストアを経由せず、Google Workspace の管理コンソールから社内メンバーへ
tegakari を配布する手順。ストアのデベロッパー登録料は不要。

ストアへ公開する場合は [`publishing.md`](./publishing.md) を参照。

## 前提

- Google Workspace の管理者権限
- 署名用の秘密鍵 `key.pem`（リポジトリ直下、gitignore 済み）
- `Sugima/tegakari` の GitHub Pages（配信元）

> このリポジトリは `iemong/tegakari` のフォーク。配信URLと `manifest.update_url` は
> **必ず `Sugima/tegakari` 側を指すこと。** フォーク元を指すと、こちらの管理外の
> サーバーから更新を受け取ることになる。

## 拡張機能ID

```
gdhhjkdkljcpdhnkaiomkffeckjhcogh
```

IDは `key.pem` から決まる。`package.json` の `manifest.key` に同じ鍵の公開鍵を入れて
あるため、`pnpm dev` で読み込んだ場合も同じIDになる。

> **`key.pem` をパスワードマネージャにバックアップすること。** 失うと同じIDで署名できず、
> 配布済みの拡張は更新を受け取れなくなる（全員に入れ直してもらうことになる）。

## 1. GitHub Pages を有効化（初回のみ）

`Sugima/tegakari` → **Settings** → **Pages** → Source を **Deploy from a branch**、
ブランチ `main` / フォルダ `/docs` にして保存。

公開されるサイトルートは `https://sugima.github.io/tegakari/`、配布物はその下の
`dist/` に置く。

## 2. 配布物の生成と公開

```bash
./scripts/pack-crx.sh
git add docs/dist && git commit -m "chore: publish crx <version>" && git push
```

`docs/dist/` に `tegakari-<version>.crx` と `update.xml` が出力され、push すると
GitHub Pages に反映される（反映まで1分程度）。配信元を変える場合:

```bash
BASE_URL=https://example.com/tegakari ./scripts/pack-crx.sh
```

リポジトリは public なので CRX は誰でもダウンロードできるが、ポリシーなしに
インストールすることはChromeが禁止しているため、第三者が勝手に導入することはできない。

## 3. 管理コンソールで強制インストール

1. [管理コンソール](https://admin.google.com) → **デバイス** → **Chrome** → **アプリと拡張機能** → **ユーザーとブラウザ**
2. 左のツリーで配布対象の組織部門を選ぶ
3. 右下の **「+」** → **「Chrome アプリまたは拡張機能を ID で追加」**
4. 入力する値
   - 拡張機能ID: `gdhhjkdkljcpdhnkaiomkffeckjhcogh`
   - 取得元: **「カスタム URL から」** を選び、`https://sugima.github.io/tegakari/dist/update.xml` を入力
5. 追加された行の **インストールポリシー** を **「強制インストール」** に設定
6. 保存

対象ユーザーがChromeにログインすると自動でインストールされ、ユーザー側では削除できない。
自分で入れるかどうか選ばせたい場合は「インストールを許可」にする。

## 4. 更新の流し方

1. `package.json` の `version` を上げる
2. `./scripts/pack-crx.sh`（古い `.crx` は自動で消える）
3. `docs/dist/` をコミットして push

管理コンソール側の再設定は不要。Chromeが `update.xml` を数時間おきに見に行き、
`version` が上がっていれば差し替える。即座に確認したいときは `chrome://extensions` の
**「更新」** ボタンを押す。

## 補足

- 強制インストールでは `<all_urls>` などの権限がユーザーの同意なしに付与される。
  何を読み取る拡張なのかは事前に周知しておく。
- 拡張の設定（プレフィックスルール等）は各自の `chrome.storage.local` に入る。
  管理コンソールから初期値を配ることはこの構成では行っていない。
