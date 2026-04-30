#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSET_DIR="$ROOT_DIR/App/Resources/Assets.xcassets/AppIcon.appiconset"
MASTER_PNG="$ROOT_DIR/App/Resources/AppIcon-master.png"
MASTER_SVG="$ROOT_DIR/../../public/icon.svg"
TMP_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ ! -f "$MASTER_PNG" ]]; then
  if [[ -f "$MASTER_SVG" ]]; then
    qlmanage -t -s 1024 -o "$TMP_DIR" "$MASTER_SVG" >/dev/null 2>&1
    GENERATED_PNG="$TMP_DIR/$(basename "$MASTER_SVG").png"
    if [[ -f "$GENERATED_PNG" ]]; then
      cp "$GENERATED_PNG" "$MASTER_PNG"
    else
      echo "Failed to rasterize $MASTER_SVG. Provide App/Resources/AppIcon-master.png manually."
      exit 1
    fi
  else
    echo "Missing AppIcon-master.png and public/icon.svg. Cannot generate App Icon set."
    exit 1
  fi
fi

mkdir -p "$ASSET_DIR"

generate_icon() {
  local size="$1"
  local name="$2"
  sips -z "$size" "$size" "$MASTER_PNG" --out "$ASSET_DIR/$name" >/dev/null
}

generate_icon 40 "Icon-App-20x20@2x.png"
generate_icon 60 "Icon-App-20x20@3x.png"
generate_icon 58 "Icon-App-29x29@2x.png"
generate_icon 87 "Icon-App-29x29@3x.png"
generate_icon 80 "Icon-App-40x40@2x.png"
generate_icon 120 "Icon-App-40x40@3x.png"
generate_icon 120 "Icon-App-60x60@2x.png"
generate_icon 180 "Icon-App-60x60@3x.png"
generate_icon 20 "Icon-App-20x20@1x-ipad.png"
generate_icon 40 "Icon-App-20x20@2x-ipad.png"
generate_icon 29 "Icon-App-29x29@1x-ipad.png"
generate_icon 58 "Icon-App-29x29@2x-ipad.png"
generate_icon 40 "Icon-App-40x40@1x-ipad.png"
generate_icon 80 "Icon-App-40x40@2x-ipad.png"
generate_icon 76 "Icon-App-76x76@1x.png"
generate_icon 152 "Icon-App-76x76@2x.png"
generate_icon 167 "Icon-App-83.5x83.5@2x.png"
generate_icon 1024 "Icon-App-1024x1024@1x.png"

echo "App icons generated in $ASSET_DIR"
