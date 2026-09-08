#!/usr/bin/env bash
# 社内配布用の署名済み CRX と更新マニフェストを生成する。
#
#   ./scripts/pack-crx.sh
#   BASE_URL=https://example.com/tegakari ./scripts/pack-crx.sh
#
# 出力: docs/dist/tegakari-<version>.crx, docs/dist/update.xml（GitHub Pages で配信）
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
KEY="${KEY:-$PWD/key.pem}"
BASE_URL="${BASE_URL:-https://sugima.github.io/tegakari/dist}"
OUT_DIR="$PWD/docs/dist"

if [ ! -f "$KEY" ]; then
  echo "秘密鍵が見つかりません: $KEY" >&2
  echo "拡張機能IDは鍵から決まります。既存の鍵を復元してください（新規生成するとIDが変わり、配布済みの拡張が更新されなくなります）。" >&2
  exit 1
fi
if [ ! -x "$CHROME" ]; then
  echo "Chrome が見つかりません: $CHROME" >&2
  exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
EXT_ID="$(openssl rsa -in "$KEY" -pubout -outform DER 2>/dev/null \
  | openssl dgst -sha256 -binary | head -c 16 | xxd -p -c 32 | tr '0-9a-f' 'a-p')"

echo "==> ビルド (version $VERSION)"
pnpm build

echo "==> CRX を署名"
rm -f build/chrome-mv3-prod.crx
"$CHROME" --pack-extension="$PWD/build/chrome-mv3-prod" \
          --pack-extension-key="$KEY" --no-message-box >/dev/null 2>&1

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.crx
CRX_NAME="tegakari.crx"
mv build/chrome-mv3-prod.crx "$OUT_DIR/$CRX_NAME"

echo "==> update.xml を生成"
cat > "$OUT_DIR/update.xml" <<XML
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${EXT_ID}'>
    <updatecheck codebase='${BASE_URL}/${CRX_NAME}' version='${VERSION}' />
  </app>
</gupdate>
XML

echo
echo "拡張機能ID : $EXT_ID"
echo "CRX        : $OUT_DIR/$CRX_NAME"
echo "更新URL    : $BASE_URL/update.xml"
echo
echo "docs/dist/ をコミットして push すると GitHub Pages に反映されます。"
