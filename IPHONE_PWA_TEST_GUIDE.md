# iPhone PWA Test Guide

## URLs

- Main app: `https://whatsnext-zeta.vercel.app/`
- QA mode: `https://whatsnext-zeta.vercel.app/?qa=1`

## Purpose

Use the PWA like a real iPhone tool before paying for Apple Developer enrollment.

The question is now:

**Does What's Next reduce retyping enough to be worth using today?**

This version should feel like:

- a small working tool
- a capture inbox
- a message-to-action converter
- a lightweight follow-up system

## What The Current PWA Supports

- pasted-text capture
- extracted tasks, events, and reminders
- editing before save
- saved local records
- `Upcoming` review
- `Needs date` and `Needs time` states
- alarm options for calendar export
- `.ics` downloads when date and time are clear
- `Copy event details` fallback

## What The Current PWA Does Not Support Yet

- direct iOS Calendar write
- direct iOS Reminders write
- guaranteed system notifications
- automatic message reading
- Share Extension capture

## Add To Home Screen

1. Open the main app URL in Safari.
2. Tap the Share button.
3. Choose `Add to Home Screen`.
4. Confirm the icon name shows `What's Next`.
5. Launch it from the Home Screen icon.

## Enable Founder QA Mode

1. Open the QA URL in Safari once.
2. Let the app finish loading so `qa=1` is stored locally.
3. Add the app to Home Screen after that, or reopen the existing Home Screen install.
4. Open `Settings`.
5. Confirm the `Founder QA` panel appears.

## Immediate Check

- Does `Capture` explain the product in 5 seconds?
- Does the app feel useful before native iOS features exist?
- Is `Upcoming` easy to scan on iPhone?
- Are `Download calendar file` and `Copy event details` honest and usable?
- Do `Needs date` and `Needs time` help rather than confuse?

## 3-Day Test Plan

### Day 1

- Paste one real meeting note
- Save detected items
- Download one calendar file if available
- Check `Upcoming`

### Day 2

- Paste one real appointment or friend plan
- Adjust an alarm option
- Copy event details or download `.ics`
- Reopen from Home Screen

### Day 3

- Export the QA summary
- Answer:
  1. Did this reduce retyping?
  2. Did `Upcoming` help you avoid missing something?
  3. Was `.ics` download useful or awkward?
  4. Would Share Sheet make this worth using?
  5. Would direct Calendar or Reminder save justify Apple Developer spending?

## Test Checklist

### Capture Value

- Meeting notes become usable tasks
- Appointment-style text becomes event-like items
- Reminder-like text becomes reminder-like items
- Bad extractions can be edited or deselected quickly

### Date And Time Quality

- Deadlines like `by Friday` are detected
- Plans like `Saturday at 7 PM` become calendar-ready
- Ambiguous times like `morning` stay visible as review items
- The app does not hallucinate false precision

### Practical Follow-Through

- `Upcoming` makes missed items visible
- `Now` helps with prep, review, or follow-up
- Calendar-ready items are obvious
- Copy and download actions are easy to tap on iPhone

### Honesty And Trust

- The app does not claim native calendar sync
- The app does not claim automatic message reading
- The privacy line is clear
- QA export excludes pasted text and titles by default

## Founder QA Export

From `Settings > Founder QA`:

- Tap `Copy QA summary` for a readable summary
- Tap `Download QA JSON` for the raw local event log
- Save one short note about what still felt too manual

Useful QA questions:

- Did capture reduce manual typing?
- Did the user save extracted items?
- Did the user use calendar export?
- Did the user view `Upcoming`?
- Did the user still need manual add?

## Apple Developer Spending Criteria

Spend on native iOS next only if most of these feel true:

- extraction is useful
- manual entry is clearly reduced
- `Upcoming` makes misses less likely
- `.ics` or copied details are usable enough to bridge the gap
- the main complaint becomes `I wish this had Share Sheet / direct Calendar save / direct Reminder save`

If 4 or more of these are effectively `Yes`, the case for Apple Developer spending is much stronger.
