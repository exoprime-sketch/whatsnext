# iPhone PWA Test Guide

## Purpose

Use the PWA like a real iPhone product before paying for Apple Developer enrollment.

The question is no longer just:

**Does What's Next tell me what to do now?**

The better question is:

**Does What's Next reduce retyping enough to feel worth keeping?**

## What You Need

- The GitHub repository
- A Vercel account or GitHub Pages setup
- An iPhone
- Safari

## Recommended Deployment: Vercel

Use Vercel first.

Settings:

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Steps:

1. Push the project to GitHub.
2. Import the repo into Vercel.
3. Confirm the build settings above.
4. Deploy.
5. Open the HTTPS URL on iPhone Safari.

## Alternative Deployment: GitHub Pages

GitHub Pages is valid, but it is a little more fragile because it usually runs under a subpath.

If your Pages URL is `https://<account>.github.io/<repo>/`, build with:

```bash
VITE_BASE_PATH=/whatsnext/ npm run build
```

Use this only if you specifically want Pages. For fast iteration, Vercel is still the better choice.

## Add To Home Screen On iPhone

1. Open the deployed URL in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Confirm the icon name shows `What's Next`.
5. Launch the app from the Home Screen icon.

## Enable Founder QA Mode

1. Open the deployed URL with `?qa=1` at the end.
   Example: `https://whatsnext-zeta.vercel.app/?qa=1`
2. Let the app load once in Safari. This stores `qaMode=true` locally on the device.
3. Add the app to Home Screen after enabling QA mode, or open it again from the Home Screen if it is already installed.
4. Open `Settings` inside the app.
5. Confirm the `Founder QA` panel appears.

## What To Check Immediately

- Does the first screen explain itself in 5 seconds?
- Does `Capture` feel like the product?
- Is the privacy line honest and reassuring?
- Is it clear that the PWA only uses pasted text for now?
- Does the native roadmap feel like an upgrade path rather than an apology?

## 3-Day Test Plan

### Day 1

- Paste one real meeting note or message
- Save detected items
- Check whether this avoided manual entry
- Use `Now` once

### Day 2

- Paste a real plan or appointment message
- Check event detection
- Edit one detected item before saving
- Reopen from Home Screen

### Day 3

- Export the QA summary
- Answer:
  1. Did this reduce retyping?
  2. Was paste still too annoying?
  3. Would Share Sheet make this worth using?
  4. Would Calendar or Reminders save make this worth paying for?
  5. What was still too manual?

## Test Checklist

### Core Value

- The first screen says `Stop retyping tasks and plans`
- The paste flow feels like the primary job
- Extraction makes messy text feel lighter to manage
- The app feels more like input reduction than task administration

### Capture Quality

- Pasting messy notes creates usable tasks
- Appointment-style messages can become event-shaped items
- Reminder-like text becomes reminder-shaped items
- You can edit or deselect bad detections before saving

### Honesty And Trust

- The app does not claim to read messages automatically
- The privacy line is clear: only pasted text is used
- The native iOS direction sounds plausible but not overclaimed
- QA export does not include pasted text by default

### Daily Use

- `Now` still helps with follow-through after capture
- Manual add is available but not competing with capture
- Reopening from Home Screen still feels good
- Local persistence works without accounts or sync

## What You Can Validate In The PWA

- Mobile layout quality
- Home Screen install experience
- Standalone app feel
- Capture-first messaging
- Extraction usefulness
- Local save flow for tasks, reminders, and calendar-ready events
- Whether capture meaningfully reduces manual entry
- Local-only QA event signals

## What You Cannot Validate In The PWA

- Native Share Extension capture
- Real Calendar write
- Real Reminders write
- Native widgets
- Native notification permission flow
- TestFlight install experience
- App Store packaging quality

## What To Export After 3 Days

From `Settings > Founder QA`:

- Tap `Copy QA summary` for a plain-text review summary
- Tap `Download QA JSON` for the raw local event log
- Keep one short founder note about what still felt too manual

Share the summary, JSON export, and one written conclusion:

- Did this reduce retyping?
- Was paste still too annoying?
- Would Share Sheet make this clearly better?
- Would Calendar or Reminders save make this worth paying for?
- What was still too manual?

## Apple Developer Spending Criteria

Only spend money on native iOS if all of these are true:

- extraction is useful
- manual entry is clearly reduced
- the main remaining complaint is `I wish this had Share Sheet / Calendar save / Reminder save`

If those signals are weak, keep refining the PWA before paying for Apple Developer enrollment.
