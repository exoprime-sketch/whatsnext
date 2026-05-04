# What's Next — Native iOS MVP

## Product direction

The main product is now the native iOS app.

**Core promise:** Don't type your schedule. Drop a screenshot, file, or recording. Confirm once. Done.

**Flow:**  
Input evidence → Extract candidates → Review before saving → Choose alarm → Save to Calendar or Reminders → Show in Today and Calendar

The PWA (`/src`) remains as a reference implementation and is not deleted.

---

## Screens

| Tab | File | Status |
|-----|------|--------|
| Today | `App/Sources/TodayView.swift` | Implemented |
| Calendar | `App/Sources/CalendarView.swift` | Implemented |
| Import | `App/Sources/ImportView.swift` | Implemented |
| Inbox | `App/Sources/InboxView.swift` | Implemented |
| Settings | `App/Sources/SettingsView.swift` | Implemented |

### Import sub-screens

| Screen | File | Status |
|--------|------|--------|
| Screenshot → OCR | `App/Sources/ScreenshotImportView.swift` | Implemented (Vision) |
| Meeting file | `App/Sources/FileImportView.swift` | Implemented (.txt/.md) |
| Text paste | `App/Sources/TextImportView.swift` | Implemented |
| Recording | — | Scaffolded — not yet functional |

---

## Models (`Shared/Models/`)

| File | Contents |
|------|----------|
| `AlarmOption.swift` | Alarm timing enum with `offsetSeconds` |
| `ImportSource.swift` | `ImportSourceType`: screenshot / meetingFile / recording / text |
| `ExtractedCandidate.swift` | `ExtractedCandidate` struct + `CandidateItemType` / `CandidateTarget` / `CandidateConfidence` |
| `ScheduleItem.swift` | Saved item referencing optional EK identifiers |

---

## Services (`Shared/Services/`)

> **Widget note:** `Shared/Services/` is excluded from the Widget target in `project.yml` because EventKit, Vision, and Speech are unavailable in app extensions.

| File | Framework | Status |
|------|-----------|--------|
| `EventKitPermissionManager.swift` | EventKit | Implemented — write-only calendar, full reminders |
| `CalendarService.swift` | EventKit | Implemented — creates `EKEvent` with alarm |
| `ReminderService.swift` | EventKit | Implemented — creates `EKReminder` with due date |
| `OCRService.swift` | Vision | Implemented — `VNRecognizeTextRequest`, accurate mode, on-device |
| `SpeechTranscriptionService.swift` | Speech | Scaffolded — authorization + file transcription wired; live recording is a TODO |
| `CandidateExtractionService.swift` | Foundation | Implemented — rule-based parser, replaceable |

---

## View model

`App/Sources/MVPAppViewModel.swift`

Holds: candidates, schedule items, permission manager, extraction, save-to-EventKit flow, sample data, tab navigation, toast.

---

## Design system

`App/Sources/WNDesignSystem.swift`

| Token | Value |
|-------|-------|
| Background | `#F7F4EF` |
| Surface | `#FFFFFF` |
| Accent | `#5B6CFF` |
| Text | `#1E1C1A` |
| Muted | `#706A63` |

Components: `WNCard`, `WNPrimaryButtonStyle`, `WNSecondaryButtonStyle`, `TypeBadge`, `ReviewBadge`, `TargetChip`.

---

## EventKit notes

- **Calendar:** uses `requestWriteOnlyAccessToEvents()` (iOS 17+). The app never reads the calendar — only adds events.
- **Reminders:** uses `requestFullAccessToReminders()` (iOS 17+).
- Both services share the `EKEventStore` from `EventKitPermissionManager`.
- `NSCalendarsWriteOnlyAccessUsageDescription` and `NSRemindersUsageDescription` are in `App/Info.plist`.

---

## Vision OCR notes

- `OCRService` uses `VNRecognizeTextRequest` with `.accurate` recognition level.
- Processing is entirely on-device — no data leaves the device.
- `NSPhotoLibraryUsageDescription` is in `App/Info.plist`.
- `ScreenshotImportView` uses `PhotosPicker` (PhotosUI framework).

---

## Speech notes

- `SpeechTranscriptionService` handles `SFSpeechRecognizer` authorization and transcribes local audio files via `SFSpeechURLRecognitionRequest`.
- Live microphone recording is **not implemented** — a TODO comment marks the extension point.
- `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription` are in `App/Info.plist`.
- The recording card in `ImportView` is visible but non-interactive.

---

## What is implemented vs scaffolded

| Feature | State |
|---------|-------|
| Today view with agenda + NowCard | Implemented |
| Calendar month grid + day agenda | Implemented |
| Import card grid (4 types) | Implemented |
| File import (.txt/.md) | Implemented |
| Screenshot import + Vision OCR | Implemented |
| Text paste + extraction | Implemented |
| Inbox grouped by review status | Implemented |
| ReviewCandidatesSheet | Implemented |
| Alarm picker per candidate | Implemented |
| Target picker (Calendar/Reminders/Local) | Implemented |
| EventKit calendar save | Implemented |
| EventKit reminder save | Implemented |
| Sample data (visible on first launch) | Implemented |
| Design system (colors, cards, buttons) | Implemented |
| Settings + permission rows | Implemented |
| Rule-based candidate extraction | Implemented |
| Live recording transcription | Scaffolded (TODO) |
| Local persistence (UserDefaults/JSON) | Not yet — in-memory only |
| PDF / DOCX import | Not yet |
| Widget update after save | Not yet |

---

## How to generate the Xcode project

Requires [XcodeGen](https://github.com/yonaskolb/XcodeGen) 2.45.4+ and macOS.

```bash
cd ios/WhatsNext
xcodegen generate
open WhatsNext.xcodeproj
```

Set your Development Team in Xcode (or replace `YOUR_TEAM_ID` in `project.yml`).

---

## How to build

1. Generate project (above)
2. Open `WhatsNext.xcodeproj` in Xcode 16+
3. Select `WhatsNextApp` scheme, iPhone 17 simulator or physical device
4. Product → Build (Cmd+B)

iOS compile was **not run** in this session (Windows environment, no Xcode). All Swift files target iOS 17 SDK and are written to compile correctly, but must be verified on macOS.

---

## Next step for native iOS testing

1. On a Mac: `cd ios/WhatsNext && xcodegen generate`
2. Open in Xcode 16, select iPhone simulator (iOS 17+)
3. Build and run
4. Verify: Today opens with sample items, Import shows 4 cards, tap Text → paste → Extract → Inbox groups appear → Save → Today shows items
5. On device: grant Calendar + Reminders in Settings tab, confirm items appear in Calendar.app and Reminders.app
