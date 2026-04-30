# What's Next

What's Next is an English-first, mobile-first PWA built to reduce decision fatigue.

Core tagline: `One thing to do now.`

This is not another heavy todo dashboard. The product goal is simple: open the app, see one clear recommendation, and do it.

## Product Direction

- English-first product test
- PWA first for iPhone home screen validation
- Local-first data only
- No account
- No server
- No tracking

This project is technically viable as both a PWA and a SwiftUI iOS candidate, but it is **not App Store ready yet**. The current goal is to validate repeat-use value on iPhone before spending money on Apple Developer enrollment.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Vite production output directory: `dist`

## Deploy

### Vercel (Recommended)

Use Vercel first. It is the fastest way to test the product on an iPhone home screen.

Vercel import settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### GitHub Pages (Optional)

GitHub Pages works, but Vercel is still the better default for this product test.

If you deploy to a project site like `https://<account>.github.io/<repo>/`, build with a base path:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

Notes:

- `VITE_BASE_PATH` is only needed for subpath hosting.
- If the repository name changes, the base path must change too.
- `manifest`, `service worker`, and home screen icon references are already base-aware.

## Try On iPhone Before Apple Developer Enrollment

Recommended flow:

1. Deploy to Vercel.
2. Open the deployed URL in Safari on iPhone.
3. Add it to Home Screen.
4. Use it for 3 days as if it were already your app.
5. Decide whether the value is strong enough to justify native iOS work.

See [IPHONE_PWA_TEST_GUIDE.md](./IPHONE_PWA_TEST_GUIDE.md) for the full test plan.
