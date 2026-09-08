# 社内配布ガイド（ZIP + 開発者モード）

ビルド済みの ZIP を GitHub Pages に置き、各自が Chrome の「パッケージ化されていない
拡張機能を読み込む」で導入する。管理者権限もデベロッパー登録料も不要。

Chrome ウェブストアに公開する場合は [`publishing.md`](./publishing.md) を参照。

## 配布URL

```
https://sugima.github.io/tegakari/dist/tegakari.zip
```

バージョンが上がっても変わらない。周知したURLをそのまま使い続けてよい。

## 1. GitHub Pages（設定済み）

`Sugima/tegakari` の Settings → Pages が `main` / `/docs` を配信するよう設定済み。
サイトルートは `https://sugima.github.io/tegakari/`。

## 2. リリース手順

```bash
# package.json の version を上げてから
./scripts/pack-zip.sh
git add docs/dist && git commit -m "chore: publish zip x.y.z" && git push
```

`docs/dist/tegakari.zip` が更新され、push すると GitHub Pages に反映される
（反映まで1分程度）。反映後、Slack などで更新を周知する。

自動更新はないので、各自に入れ直してもらう必要がある。

## 3. 各自の導入手順

以下をそのまま周知してよい。

1. <https://sugima.github.io/tegakari/dist/tegakari.zip> をダウンロード
2. 解凍する。`tegakari` フォルダができる
3. **このフォルダを消さない場所に移動する**（例: `~/chrome-extensions/tegakari`）
   拡張機能はこのフォルダを直接読むため、消したり移動したりすると動かなくなる
4. Chrome で `chrome://extensions` を開く
5. 右上の **「デベロッパー モード」** をONにする
6. **「パッケージ化されていない拡張機能を読み込む」** をクリックし、`tegakari` フォルダを選ぶ
7. ツールバーに tegakari のアイコンが出れば完了。`Cmd+Shift+Y`（Windowsは `Ctrl+Shift+Y`）で起動

Chrome の起動時に **「デベロッパー モードの拡張機能を無効にする」** という警告が出るが、
**「キャンセル」** を選べば使い続けられる。

## 4. 各自の更新手順

1. 新しい ZIP をダウンロードして解凍
2. 手順3で置いたフォルダの中身を、解凍した中身で置き換える
3. `chrome://extensions` の tegakari の **更新ボタン（⟳）** を押す

フォルダのパスを変えなければ、拡張機能の設定（プレフィックスルール等）は保持される。

## 補足

- tegakari は全ページに content script を注入し、`chrome.tabs.captureVisibleTab` で
  表示中の画面を撮影する。周知の際に何をする拡張なのかを説明しておく。
- 拡張の設定は各自の `chrome.storage.local` に入る。初期値の配布は行っていない。
- 人数が増えて版ズレが問題になったら、Chrome ウェブストアの限定公開に移す。
  自動更新が効くようになる。手順は [`publishing.md`](./publishing.md)。
