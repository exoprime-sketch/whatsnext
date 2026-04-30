# 오늘하나 iOS

이 폴더는 App Store 출시를 위한 SwiftUI 네이티브 앱 소스와 위젯 구조입니다.

## 구성

- `Shared/`: 앱과 위젯이 함께 쓰는 모델, 저장소, 추천 엔진, 캡처 파서
- `App/`: SwiftUI 앱 소스, 온보딩, 알림, 설정, 탭 UI
- `Widget/`: 홈 화면 Small Widget
- `ShareExtension/`: v1.1용 공유 확장 TODO 구조

## 생성 방법

1. macOS에서 Xcode와 XcodeGen을 설치합니다.
2. 이 폴더에서 `xcodegen generate`를 실행합니다.
3. 생성된 `WhatsNext.xcodeproj`를 Xcode로 엽니다.
4. `PRODUCT_BUNDLE_IDENTIFIER`, Team, App Group 값을 실제 값으로 맞춥니다.
5. `BUILD_ON_MAC.md`와 `ReleaseConfig.example.md`를 따라 placeholder를 교체합니다.

## 현재 상태

- SwiftUI 앱 소스 생성 완료
- 위젯 타임라인 구조 생성 완료
- UserNotifications 기반 로컬 알림 구조 생성 완료
- App Store 제출 문서 초안 생성 완료
- App Icon asset 세트 및 생성 스크립트 추가 완료
- GitHub Actions용 PWA build / iOS simulator build CI 워크플로 추가 완료
- `scripts/ci/check-release-readiness.mjs`로 제출 전 blocker를 경고 또는 실패로 분리해 점검 가능
- 현재 작업 환경이 Windows라 Xcode 빌드는 이 자리에서 검증하지 못했습니다
