# iPhone PWA Test Guide

## 목적

Apple Developer 비용을 쓰기 전에 `오늘하나`를 iPhone Safari 홈화면 앱처럼 설치해서, 실제 사용 흐름과 체감 UX를 먼저 검증합니다.

## 준비물

- 배포 가능한 GitHub 저장소
- Vercel 계정 또는 GitHub Pages 저장소 설정 권한
- iPhone 14 Pro
- Safari

## Vercel 배포 방법

Vercel을 우선 추천합니다. 루트 경로 배포와 Vite 조합이 가장 단순하고, iPhone 홈화면 테스트도 바로 할 수 있습니다.

1. 프로젝트를 GitHub에 푸시합니다.
2. Vercel에서 `Add New Project`를 선택합니다.
3. 저장소를 import 합니다.
4. 아래 값이 맞는지 확인합니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

5. Deploy를 실행합니다.
6. 배포 완료 후 HTTPS URL을 받습니다.

## GitHub Pages 배포 방법

GitHub Pages는 선택지로는 가능하지만, Vercel보다 base path를 더 신경 써야 합니다.

현재 프로젝트는 `VITE_BASE_PATH` 환경변수로 Vite base를 바꿀 수 있습니다.

예시:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

설명:

- `whatsnext`는 GitHub Pages의 repository name 예시입니다.
- 저장소 이름이 다르면 base path도 같이 바꿔야 합니다.
- `manifest`, `service worker`, `apple-touch-icon`은 subpath 배포도 고려해 상대 경로 또는 base-aware 경로로 맞춰두었습니다.

Vercel을 우선 추천하는 이유:

- root 배포가 기본이라 설정이 단순합니다.
- iPhone 홈화면 테스트까지 가는 시간이 더 짧습니다.
- 재배포와 확인이 빠릅니다.

## iPhone 홈화면 추가 방법

1. iPhone Safari에서 배포 URL을 엽니다.
2. 하단 공유 버튼을 누릅니다.
3. `홈 화면에 추가`를 선택합니다.
4. 아이콘 이름이 `오늘하나`로 보이는지 확인합니다.
5. 추가 후 홈 화면의 아이콘을 탭해 다시 실행합니다.

확인 포인트:

- Safari 주소창 없이 standalone처럼 열리는지
- 배경색과 아이콘이 어색하지 않은지
- 홈화면에서 앱처럼 다시 열 수 있는지

## 테스트 체크리스트

### 설치 직후

- 홈 화면 아이콘이 깨지지 않는지
- 앱 이름이 너무 길게 잘리지 않는지
- standalone 실행이 되는지
- 첫 화면이 빈 상태가 아닌지

### 기본 흐름

- Today 화면에서 Now Card가 바로 보이는지
- 추천 이유가 너무 길지 않은지
- `완료`, `10분 뒤`, `오늘 말고`, `별로예요` 버튼이 엄지로 누르기 쉬운지
- 빠른 할 일 추가가 10초 안에 끝나는지

### 입력 흐름

- Add Task에서 제목만 입력해도 저장이 잘 되는지
- 저장 후 Today 화면으로 돌아와 Now Card가 바뀌는지
- Capture에서 문장을 붙여넣고 후보를 저장할 수 있는지

### 지속 사용 흐름

- 새로고침하거나 앱을 다시 열어도 데이터가 유지되는지
- 하루 2~3번 열었을 때 추천 흐름이 자연스러운지
- Settings에서 전체 데이터 삭제가 실제로 동작하는지

### 2~3일 실제 사용 체크

- 첫날: 설치 후 바로 첫 할 일을 넣고 추천이 납득되는지
- 둘째 날: 다시 열었을 때 홈화면 아이콘을 계속 누르고 싶어지는지
- 셋째 날: 미룸/완료 기록이 쌓였을 때 추천이 더 자연스러워지는지
- 반복 사용 중 텍스트가 잘리거나 버튼이 답답하지 않은지
- 홈화면 앱처럼 써도 큰 불편이 없는지

## PWA에서 확인 가능한 것

- 모바일 레이아웃 품질
- 홈화면 설치 경험
- standalone 실행 경험
- Today / Now Card / Add Task / Capture / Settings 기본 흐름
- localStorage 기반 데이터 유지
- 기본 service worker 등록 여부
- iPhone Safari에서의 실제 텍스트 크기와 터치감

## PWA로 확인 불가능한 것

- WidgetKit 위젯
- iOS 네이티브 알림 권한 UX
- App Store 배포 패키지 품질
- SwiftUI 네이티브 성능과 전환 감각
- App Group 공유 동작
- TestFlight 설치 흐름

## 네이티브 iOS 테스트로 넘어갈 조건

아래 조건이 만족되면 Apple Developer 등록과 네이티브 iOS 테스트로 넘어갈 근거가 충분합니다.

- iPhone 홈화면에서 2~3일 실제 사용해도 다시 열고 싶은 흐름이 있다
- Now Card 추천이 최소한 “쓸 만하다”는 판단이 든다
- Add Task와 Capture가 막히지 않는다
- 홈화면 아이콘과 standalone 실행 경험이 어색하지 않다
- 빈 화면, 저장 유실, 주요 버튼 오동작이 없다
- PWA 한계 때문에 막히는 지점이 명확해진다
