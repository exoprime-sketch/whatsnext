# iPhone PWA Test Guide

## Purpose

Use the PWA like a real iPhone product before paying for Apple Developer enrollment.

The question is not "Does it technically run?"
The question is:

**Does What's Next reduce deciding enough that you would keep it on your home screen?**

## What You Need

- The GitHub repository
- A Vercel account or GitHub Pages setup
- An iPhone 14 Pro
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

## What To Check Immediately

- Does the icon look clean on the home screen?
- Does it open in standalone mode?
- Does the first screen explain itself in 5 seconds?
- Does the Now card feel like the product, not just another task list?

## 3-Day Test Plan

### Day 1

- Add 5 real tasks
- Use the Now Card once
- Add the app to Home Screen

### Day 2

- Open from Home Screen
- Complete or delay at least one task
- Try Capture with one real note

### Day 3

- Ask: did this reduce deciding?
- Ask: would I keep this on my home screen?
- Ask: is native iOS worth building?

## Test Checklist

### Core Value

- The first screen clearly says what to do now
- The recommendation feels reasonable
- Secondary information stays quiet
- The product feels calmer than a normal to-do app

### Daily Use

- Adding a task is fast
- Done / Later / Not today are enough to keep moving
- Opening the app on a new day still feels fresh
- Delayed tasks are handled cleanly

### Capture

- Pasting messy notes creates usable task suggestions
- The app does not overclaim AI
- The privacy message is clear: only pasted text is used

### Trust

- Your data persists between opens
- Reset data works
- The product feels local-first and lightweight

## What You Can Validate In The PWA

- Mobile layout quality
- Home screen install experience
- Standalone app feel
- Now card clarity
- Task entry speed
- Capture usefulness
- Local persistence
- Whether the product deserves repeated opens

## What You Cannot Validate In The PWA

- Native iOS widgets
- Native notification permission flow
- TestFlight install experience
- App Store packaging quality
- Native SwiftUI transitions and performance details

## When To Move To Native iOS

Move to native only if the PWA test shows clear product value.

Good signals:

- You open it repeatedly without forcing yourself
- The Now card reduces friction instead of creating more management work
- You would keep it on your home screen
- Capture is useful enough to use again
- The product feels meaningfully different from a generic to-do list

If those signals are weak, keep refining the PWA before spending money on Apple Developer enrollment.
