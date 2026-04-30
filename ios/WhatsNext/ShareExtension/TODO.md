# Share Extension TODO

v1.0에서는 텍스트 붙여넣기 기반 Capture 화면으로 충분합니다.

v1.1에서 아래 구조로 확장할 수 있습니다.

1. `NSExtensionContext`에서 공유 텍스트 수신
2. 앱 그룹 `WHATSNEXT_APP_GROUP_IDENTIFIER`로 임시 텍스트 저장
3. 메인 앱을 `whatsnext://capture`로 열고 후보 추출 실행
4. 카카오톡/메일/메모 공유 시 “오늘하나로 보내기” 노출
