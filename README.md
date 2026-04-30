# What's Next

What's Next is an English-first, mobile-first PWA for testing one product promise:

**Stop retyping tasks and plans.**

Core line: `Capture now. Decide later.`

The current PWA is an honesty-first capture test. You paste text manually for now, then What's Next turns it into tasks, reminders, and calendar-ready events.

## Product Direction

- Primary problem: people hate retyping their life into task lists and calendars
- Current PWA role: test extraction quality and capture flow with pasted text
- Native iOS role later: reduce input friction with Share Extension, EventKit, App Intents, widgets, and local notifications
- Local-first data only
- No account
- No server
- No automatic message reading in this PWA

This project is technically viable as both a PWA and a SwiftUI iOS candidate, but it is **not App Store ready yet**. The goal right now is to validate that capture meaningfully reduces manual entry before spending money on Apple Developer enrollment.

## Current App Shape

- `Capture` is the default and dominant flow
- `Now` is the follow-through layer
- `Tasks` shows saved tasks, events, and reminders
- `Settings` holds privacy notes, founder QA, and reset/sample tools
- `Add manually` is still available, but intentionally secondary

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

### Vercel

Use Vercel first. It is the fastest way to test the product on an iPhone Home Screen.

Vercel import settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### GitHub Pages

GitHub Pages works, but Vercel is still the better default for this capture test.

If you deploy to a project site like `https://<account>.github.io/<repo>/`, build with a base path:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

## What The PWA Validates

- Does pasted text become useful tasks, events, and reminders?
- Does capture clearly reduce retyping?
- Is paste still too annoying even when extraction is good?
- Would Share Sheet, Calendar save, or Reminders save be the missing piece?
- Does the product feel worth keeping on the iPhone Home Screen?

## Try On iPhone Before Native Spend

Recommended flow:

1. Deploy to Vercel.
2. Open the deployed URL in Safari on iPhone.
3. Add it to Home Screen.
4. Use it for 3 days as if it were already your app.
5. Decide whether the main remaining friction is native-only capture and save behavior.

See [IPHONE_PWA_TEST_GUIDE.md](./IPHONE_PWA_TEST_GUIDE.md) for the full test plan.

## Founder QA Mode

For a 2 to 3 day founder test, open the deployed app with `?qa=1`.

Example:

```text
https://whatsnext-zeta.vercel.app/?qa=1
```

This enables a local-only QA panel in `Settings`.

What it adds:

- capture opens
- extraction runs
- detected item totals
- saved detected item totals
- approximate manual entries avoided
- manual-add counts
- capture vs manual ratio
- event and reminder detection counts
- local founder notes
- plain-text summary copy
- JSON export for expert review

Exports do **not** include pasted message text or task titles by default.
