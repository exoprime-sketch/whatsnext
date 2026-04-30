#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
IOS_DIR="$ROOT_DIR/ios/WhatsNext"
ARTIFACT_DIR="$ROOT_DIR/.artifacts/ios"
XCODEGEN_LOG="$ARTIFACT_DIR/xcodegen-generate.log"
XCODEBUILD_LOG="$ARTIFACT_DIR/xcodebuild-simulator.log"

mkdir -p "$ARTIFACT_DIR"

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "xcodegen is required. Install it first with 'brew install xcodegen'." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required. This script must run on macOS with Xcode installed." >&2
  exit 1
fi

cd "$IOS_DIR"

if [[ -f "./scripts/generate_app_icons.sh" ]]; then
  chmod +x ./scripts/generate_app_icons.sh
  ./scripts/generate_app_icons.sh
fi

set -o pipefail
xcodegen generate 2>&1 | tee "$XCODEGEN_LOG"

xcodebuild \
  -project WhatsNext.xcodeproj \
  -scheme WhatsNextApp \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "generic/platform=iOS Simulator" \
  -derivedDataPath build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  build 2>&1 | tee "$XCODEBUILD_LOG"
