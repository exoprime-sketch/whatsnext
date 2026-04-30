# Release Config Example

출시 전 아래 placeholder를 실제 값으로 교체하세요.

## Required Values
- `YOUR_TEAM_ID`
- `com.todayone.whatsnext`
- `com.todayone.whatsnext.widget`
- `group.com.todayone.whatsnext`
- `support@example.com`
- `https://example.com/privacy`
- `YOUR_COMPANY_NAME`
- `YYYY-MM-DD`

## Where They Are Used

### `YOUR_TEAM_ID`
- `ios/WhatsNext/project.yml`

### Bundle IDs
- `ios/WhatsNext/project.yml`

### App Group
- `ios/WhatsNext/project.yml`
- `ios/WhatsNext/App/WhatsNext.entitlements`
- `ios/WhatsNext/Widget/WhatsNextWidget.entitlements`
- `ios/WhatsNext/Shared/TaskModels.swift`

### Support Email / Privacy Policy / Operator
- `ios/WhatsNext/project.yml`
- `ios/WhatsNext/App/Info.plist`
- `ios/WhatsNext/Shared/TaskModels.swift`
- `PRIVACY_POLICY.md`

## Important
Bundle ID를 바꾸면 Widget Bundle ID와 App Group도 같이 바꿔야 합니다.
