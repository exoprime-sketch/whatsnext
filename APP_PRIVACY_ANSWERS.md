# App Privacy Answers Draft

## Summary
오늘하나 v1.0은 사용자가 입력한 데이터를 기기 밖으로 전송하지 않습니다. 계정, 동기화, 분석 SDK, 광고 SDK가 없습니다.

## Recommended App Store Connect Answers

### Third-Party Advertising
- No

### Tracking
- No

### Data Linked to the User
- No

### Data Used to Track the User
- No

### Data Collected
- 권장 답변: `No data collected`

## Why `No data collected` is reasonable
- 사용자가 입력한 할 일/메모/피드백은 기기 안에만 저장됩니다.
- 외부 서버로 전송되지 않습니다.
- 제3자 SDK가 없습니다.
- 계정 생성이나 사용자 식별이 없습니다.

## Conservative Review Note
Apple의 App Privacy는 일반적으로 “개발자 또는 제3자에게 전송되는 데이터”를 중심으로 봅니다. 오늘하나 v1.0은 데이터가 기기 밖으로 나가지 않으므로 `No data collected` 방향이 타당합니다.

## Re-check Required If Added Later
다음 기능이 추가되면 App Privacy 답변을 다시 작성해야 합니다.

- 계정/로그인
- 클라우드 백업 또는 동기화
- 외부 AI API
- 분석 SDK
- 광고 SDK
- 크래시 리포팅 서비스
