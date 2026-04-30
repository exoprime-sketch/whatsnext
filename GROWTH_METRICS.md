# Growth Metrics

## Activation
- 첫 실행 후 10초 안에 첫 할 일을 추가한 사용자 비율
- 첫 Now Card를 본 사용자 비율
- 첫 버튼 클릭 도달률
- 알림 시간대 선택 또는 나중에 선택 완료율

## Engagement
- DAU
- WAU
- MAU
- DAU / MAU

## Retention
- D1 retention
- D7 retention
- 첫 주 알림 허용률
- 위젯 설치 후 재방문율

## Core Product Metrics
- 생성된 할 일 수
- 완료한 Now Card 수
- 완료 전 평균 미룸 횟수
- Capture 화면 사용률
- 위젯 딥링크 진입 수

## Local Metrics Stored On Device
- `firstLaunchAt`
- `onboardingCompletedAt`
- `firstTaskCreatedAt`
- `firstNowCardViewedAt`
- `firstInteractionAt`
- `nowCardCompletedCount`
- `snoozedCount`
- `skippedTodayCount`
- `negativeFeedbackCount`
- `captureUsedCount`
- `notificationEnabledAt`
- `widgetDeepLinkOpenedCount`
- `lastActiveAt`
- `activeDays`

## Suggested v1.0 Event Map
- `onboarding_started`
- `onboarding_completed`
- `first_task_created`
- `first_now_card_viewed`
- `now_card_completed`
- `now_card_snoozed`
- `now_card_skipped_today`
- `now_card_negative_feedback`
- `capture_candidates_created`
- `notification_opt_in`
- `widget_deep_link_opened`

## Note
v1.0은 외부 분석 SDK 없이 로컬 기록만 저장합니다. 실제 MAU/DAU 추적을 서버 기반으로 도입하려면 별도 고지와 App Privacy 재검토가 필요합니다.
