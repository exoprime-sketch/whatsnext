# Build On Mac

```bash
cd ios/WhatsNext
xcodegen generate
open WhatsNext.xcodeproj
```

## Prerequisites

```bash
xcode-select --install
brew install xcodegen
```

## First-Time Setup

1. `ReleaseConfig.example.md`를 열어 placeholder 교체 위치를 먼저 확인합니다.
2. Xcode에서 `Signing & Capabilities`를 열어 Team을 설정합니다.
3. `YOUR_TEAM_ID`를 실제 Team ID로 바꿉니다.
4. `WHATSNEXT_APP_BUNDLE_IDENTIFIER`, `WHATSNEXT_WIDGET_BUNDLE_IDENTIFIER`, `WHATSNEXT_APP_GROUP_IDENTIFIER`를 실제 값으로 바꿉니다.
5. `WHATSNEXT_SUPPORT_EMAIL`, `WHATSNEXT_PRIVACY_POLICY_URL`, `WHATSNEXT_OPERATOR_NAME`를 실제 값으로 바꿉니다.

## App Icon

```bash
cd ios/WhatsNext
./scripts/generate_app_icons.sh
```

## CI-Equivalent Local Check

```bash
cd <repo-root>
npm run check:release
bash scripts/ci/build-ios-simulator.sh
```

## Simulator Build

```bash
xcodebuild \
  -project WhatsNext.xcodeproj \
  -scheme WhatsNextApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build
```

## Archive Build

```bash
xcodebuild \
  -project WhatsNext.xcodeproj \
  -scheme WhatsNextApp \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  archive
```

## What To Verify
- 온보딩 완료 후 Today 화면으로 이동하는지
- 첫 Now Card가 바로 보이는지
- 위젯 타임라인이 갱신되는지
- 알림 거부 시 앱이 깨지지 않는지
- `전체 데이터 삭제` 후 온보딩으로 자연스럽게 돌아가는지
- GitHub Actions `CI` 워크플로와 `Release Readiness` 워크플로가 모두 green인지
