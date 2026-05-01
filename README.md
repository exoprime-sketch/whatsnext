# What's Next

What's Next is an English-first, mobile-first PWA for one practical promise:

**Stop retyping tasks and plans.**

Core lines:

- `Capture the plan. Keep the reminder.`
- `Messages in. Tasks, events, and reminders out.`

The current product is no longer just a capture prototype. It is a small working PWA for turning pasted notes, messages, and meeting text into saved follow-ups you can review and act on today.

## What The PWA Does Today

Workflow:

1. Paste a meeting note, message, email snippet, or plan
2. Extract tasks, events, and reminders
3. Review and edit the detected items
4. Save selected items locally
5. Check `Upcoming` to see what might be missed
6. Download a `.ics` calendar file when an event is clear enough
7. Copy details when calendar export is not ready

Current tabs:

- `Capture`
- `Upcoming`
- `Now`
- `Tasks`
- `Settings`

`Add manually` still exists, but it is intentionally a fallback rather than the main path.

## Practical Features In This Version

- Capture-first home screen
- Rule-based extraction for tasks, events, and reminders
- Editable candidate cards before save
- `Needs date` and `Needs time` review states
- Alarm options for calendar export
- Calendar-ready event and reminder records
- Downloadable `.ics` files when date and time are clear
- `Copy details` fallback when export is awkward or ambiguous
- Local `Upcoming` view for `Today`, `Tomorrow`, `This week`, `Needs review`, and `Later / No date`
- Local-only founder QA mode

## PWA Reality

This app is honest about what it can and cannot do today.

The PWA does support:

- pasted-text capture
- local task, reminder, and event storage
- calendar-ready records
- alarm choices for calendar export
- `.ics` download when date and time are clear
- copied event details
- local upcoming review

The PWA does not yet support:

- direct iOS Calendar write
- direct iOS Reminders write
- guaranteed system notifications
- background message reading
- automatic KakaoTalk, Mail, or Messages import

Native iOS later can add:

- Share Extension
- EventKit Calendar save
- EventKit Reminder save
- native alarms
- widgets
- local notifications

## Privacy

- No account
- No server
- No automatic message reading
- We only use what you paste here

Founder QA exports do **not** include pasted message text or task titles by default.

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

Recommended for fast iPhone testing.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

### GitHub Pages

If you deploy to a project site like `https://<account>.github.io/<repo>/`, build with:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

## Closed Test Goal

- Does capture reduce retyping?
- Do extracted items feel usable after light editing?
- Do `Upcoming` and `Needs review` help avoid misses?
- Is `.ics` download useful enough to bridge the PWA limitation?
- Is the main remaining complaint native-only capture and save friction?

## Founder QA Mode

Enable local-only QA with:

```text
https://whatsnext-zeta.vercel.app/?qa=1
```

Tracked signals include:

- extraction runs
- detected items
- saved detected items
- manual entries avoided approx
- manual add count
- capture vs manual ratio
- calendar-ready items
- calendar file downloads
- copied event details
- items needing review
- alarm selections
- upcoming views

See [IPHONE_PWA_TEST_GUIDE.md](/F:/whatsnext-git/IPHONE_PWA_TEST_GUIDE.md) for the 3-day iPhone test plan.
