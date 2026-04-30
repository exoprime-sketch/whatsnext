# What's Next / 오늘하나

모바일 우선 PWA 생산성 앱입니다. 앱을 열면 복잡한 목록 대신 지금 할 일 하나를 먼저 보여주고, 완료·미룸·피드백에 따라 다음 행동을 정리해줍니다.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Vite production output directory는 `dist`입니다.

## Deploy

### Vercel (Recommended)

Vercel import 시 아래 값으로 설정하면 됩니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

루트 경로 배포가 기본값이라 추가 설정 없이 가장 안전합니다.

### GitHub Pages (Optional)

GitHub Pages를 `https://<account>.github.io/<repo>/` 형태의 project site로 쓸 경우 Vite `base`가 필요합니다. 현재 프로젝트는 `VITE_BASE_PATH` 환경변수로 이를 제어합니다.

예시:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

메모:

- Vercel은 `base` 설정 없이 바로 배포하는 방식을 우선 추천합니다.
- GitHub Pages를 쓰면 저장소 이름이 바뀔 때 `VITE_BASE_PATH`도 같이 바꿔야 합니다.

## Try On iPhone Before Apple Developer Enrollment

Apple Developer 등록 전에 iPhone Safari 홈화면에서 PWA 경험을 먼저 검증하는 것을 권장합니다.

빠른 순서:

1. Vercel로 배포합니다.
2. iPhone Safari에서 배포 URL을 엽니다.
3. 공유 버튼을 눌러 `홈 화면에 추가`를 선택합니다.
4. 홈화면 아이콘으로 앱을 실행합니다.
5. Today, Now Card, Add Task, Capture, Settings를 2~3일 실제로 써봅니다.

자세한 절차와 체크리스트는 [IPHONE_PWA_TEST_GUIDE.md](./IPHONE_PWA_TEST_GUIDE.md)를 참고하면 됩니다.
