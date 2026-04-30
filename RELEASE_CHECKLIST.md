# Release Checklist

## 1. 로컬 빌드
- GitHub Actions `CI` 워크플로 green 확인
- App Store 제출 직전 `Release Readiness` 수동 워크플로 green 확인
- macOS에서 `xcodegen generate` 실행
- `WhatsNext.xcodeproj` 생성 확인
- iPhone 시뮬레이터 Debug 빌드 확인
- Release 빌드 확인

## 2. Signing
- `ios/WhatsNext/ReleaseConfig.example.md` 기준으로 placeholder 교체 위치 확인
- `YOUR_TEAM_ID`를 실제 Team ID로 교체
- App target / Widget target Signing 확인
- Archive 시 signing 오류 없는지 확인

## 3. App Group
- `WHATSNEXT_APP_GROUP_IDENTIFIER`를 실제 값으로 교체
- App entitlements / Widget entitlements / `ReleaseConfiguration` 값이 같은지 확인
- App Group 없이도 앱 단독 실행이 fallback으로 동작하는지 확인

## 4. 앱 아이콘
- `App/Resources/AppIcon-master.png` 확인 또는 교체
- `scripts/generate_app_icons.sh` 실행
- `AppIcon.appiconset` PNG 세트 생성 확인
- App Store 1024 아이콘 품질 확인

## 5. 개인정보 처리방침 URL
- `WHATSNEXT_PRIVACY_POLICY_URL` 실제 값으로 교체
- 앱 내 링크가 열리는지 확인
- 운영 주체 / 문의 이메일 placeholder 제거

## 6. App Privacy
- `APP_PRIVACY_ANSWERS.md` 기준으로 App Store Connect 입력
- Tracking = No 확인
- Third-party advertising = No 확인
- 데이터가 기기 밖으로 전송되지 않는다는 설명 확인

## 7. Screenshots
- 6.7", 6.5", 5.5" 스크린샷 준비
- 위젯 화면 포함 여부 결정
- 한국어 스크린샷 카피 반영

## 8. TestFlight
- 내부 테스터 배포
- 첫 실행 온보딩 확인
- 첫 할 일 생성 후 Now Card 노출 확인
- 알림 허용/거부 흐름 확인
- 위젯 설치 및 딥링크 확인
- GitHub Actions artifact의 `ios-build-logs` 확인

## 9. App Review
- `REVIEW_NOTES.md` 복사
- 로그인 없음 / 결제 없음 / 외부 서버 없음 명시
- Capture가 직접 붙여넣기 방식임을 명시
- 문자/메일/메신저 자동 수집이 없음을 명시
- `npm run check:release:strict` 또는 `Release Readiness` 워크플로가 hard blocker 없이 통과했는지 확인

## 10. 출시 후 모니터링
- 로컬 사용 기록 요약 확인
- 첫 할 일 생성률 점검
- Now Card 완료 수 점검
- 미룸/별로예요 비율 확인
- 알림 시간대 선택률 점검
