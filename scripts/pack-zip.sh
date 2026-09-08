#!/usr/bin/env bash
# 社内配布用の ZIP を生成する。各自が Chrome の「パッケージ化されていない拡張機能を
# 読み込む」で入れる想定。
#
#   ./scripts/pack-zip.sh
#
# 出力: docs/dist/tegakari.zip（GitHub Pages で配信）
set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="$PWD/docs/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

VERSION="$(node -p "require('./package.json').version")"

echo "==> ビルド (version $VERSION)"
pnpm build

echo "==> ZIP を作成"
# 解凍したときに tegakari/ が1つできるよう、トップレベルにフォルダを作ってから固める
mkdir -p "$STAGE/tegakari"
cp -R build/chrome-mv3-prod/. "$STAGE/tegakari/"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/tegakari.zip"
(cd "$STAGE" && zip -qr "$OUT_DIR/tegakari.zip" tegakari)

echo
echo "バージョン : $VERSION"
echo "ZIP        : $OUT_DIR/tegakari.zip"
echo "配布URL    : https://sugima.github.io/tegakari/dist/tegakari.zip"
echo
echo "docs/dist/ をコミットして push すると GitHub Pages に反映されます。"
