import SwiftUI

// MARK: - Tab enum

enum MVPTab: String, CaseIterable, Identifiable {
    case today
    case calendar
    case importTab   // "import" is a Swift keyword
    case inbox
    case settings

    var id: String { rawValue }

    var label: String {
        switch self {
        case .today:     "Today"
        case .calendar:  "Calendar"
        case .importTab: "Import"
        case .inbox:     "Inbox"
        case .settings:  "Settings"
        }
    }

    var systemImage: String {
        switch self {
        case .today:     "sun.max"
        case .calendar:  "calendar"
        case .importTab: "square.and.arrow.down"
        case .inbox:     "tray"
        case .settings:  "gearshape"
        }
    }
}

// MARK: - ViewModel

@MainActor
final class MVPAppViewModel: ObservableObject {

    // Navigation
    @Published var selectedTab: MVPTab = .importTab

    // Import state
    @Published var importText = ""

    // Candidates pending inbox review
    @Published var candidates: [ExtractedCandidate] = []

    // Saved schedule items (in-memory; persist via UserDefaults in a future pass)
    @Published var scheduleItems: [ScheduleItem] = []

    // Sheet control
    @Published var showReviewSheet = false

    // Toast
    @Published var toastMessage: String?

    // Services
    let permissionManager = EventKitPermissionManager()
    private let extractor = CandidateExtractionService()
    private lazy var calendarService  = CalendarService(eventStore: permissionManager.eventStore)
    private lazy var reminderService  = ReminderService(eventStore: permissionManager.eventStore)

    init() {
        scheduleItems = Self.sampleScheduleItems()
        candidates    = Self.sampleCandidates()
    }

    // MARK: - Extraction

    func extractCandidates(from text: String, source: ImportSourceType = .text) {
        let results = extractor.extract(from: text, source: source)
        if results.isEmpty {
            showToast("Nothing found. Try shorter lines or a clearer format.")
            return
        }
        candidates = results
        showReviewSheet = true
    }

    // MARK: - Save selected candidates

    func saveSelected() async {
        let selected = candidates.filter { $0.selected }
        guard !selected.isEmpty else { return }

        var saved = 0
        var newItems: [ScheduleItem] = []

        for candidate in selected {
            switch candidate.target {

            case .calendar:
                if !permissionManager.hasCalendarAccess {
                    let granted = await permissionManager.requestCalendarAccess()
                    guard granted else { continue }
                }
                do {
                    let eid = try calendarService.createEvent(from: candidate)
                    var item = ScheduleItem(from: candidate)
                    item.calendarEventID = eid
                    newItems.append(item)
                    saved += 1
                } catch {
                    showToast("Calendar save failed.")
                }

            case .reminders:
                if !permissionManager.hasRemindersAccess {
                    let granted = await permissionManager.requestRemindersAccess()
                    guard granted else { continue }
                }
                do {
                    let rid = try reminderService.createReminder(from: candidate)
                    var item = ScheduleItem(from: candidate)
                    item.reminderID = rid
                    newItems.append(item)
                    saved += 1
                } catch {
                    showToast("Reminders save failed.")
                }

            case .local:
                newItems.append(ScheduleItem(from: candidate))
                saved += 1
            }
        }

        scheduleItems.append(contentsOf: newItems)
        candidates.removeAll { $0.selected }
        showReviewSheet = false
        selectedTab     = .today
        showToast("Saved \(saved) item\(saved == 1 ? "" : "s").")
    }

    // MARK: - Computed helpers

    var todayItems: [ScheduleItem] {
        let cal = Calendar.current
        return scheduleItems
            .filter { $0.startDate.map { cal.isDateInToday($0) } ?? false }
            .sorted { ($0.startDate ?? .now) < ($1.startDate ?? .now) }
    }

    var needsReviewCount: Int {
        candidates.filter { !$0.isReady }.count
    }

    func items(on date: Date) -> [ScheduleItem] {
        let cal = Calendar.current
        return scheduleItems
            .filter { $0.startDate.map { cal.isDate($0, inSameDayAs: date) } ?? false }
            .sorted { ($0.startDate ?? .now) < ($1.startDate ?? .now) }
    }

    func hasItems(on date: Date) -> Bool {
        !items(on: date).isEmpty
    }

    // MARK: - Toast

    func showToast(_ message: String) {
        toastMessage = message
        Swift.Task {
            try? await Swift.Task.sleep(for: .seconds(2.5))
            if toastMessage == message { toastMessage = nil }
        }
    }

    // MARK: - Sample data

    private static func sampleScheduleItems() -> [ScheduleItem] {
        let cal = Calendar.current
        let now = Date.now

        func todayAt(_ h: Int, _ m: Int = 0) -> Date {
            cal.date(bySettingHour: h, minute: m, second: 0, of: now) ?? now
        }
        func tomorrowAt(_ h: Int, _ m: Int = 0) -> Date {
            let tmr = cal.date(byAdding: .day, value: 1, to: now)!
            return cal.date(bySettingHour: h, minute: m, second: 0, of: tmr) ?? tmr
        }

        var standup = ScheduleItem(title: "Team standup", itemType: "event", sourceType: "meetingFile")
        standup.startDate = todayAt(9, 0)
        standup.endDate   = todayAt(9, 30)

        var review = ScheduleItem(title: "Design review", itemType: "event", sourceType: "text")
        review.startDate = todayAt(14, 0)
        review.endDate   = todayAt(15, 0)

        var report = ScheduleItem(
            title: "Send revised report", notes: "By end of day",
            itemType: "reminder", sourceType: "text"
        )
        report.startDate = todayAt(17, 0)

        var dinner = ScheduleItem(
            title: "Dinner with Mina", location: "Near Gangnam Station",
            itemType: "event", sourceType: "screenshot"
        )
        dinner.startDate = tomorrowAt(19, 0)
        dinner.endDate   = tomorrowAt(21, 0)

        return [standup, review, report, dinner]
    }

    private static func sampleCandidates() -> [ExtractedCandidate] {
        let cal = Calendar.current
        let now = Date.now

        // calendar-ready event
        var c1 = ExtractedCandidate()
        c1.sourceType   = .screenshot
        c1.itemType     = .event
        c1.title        = "Dinner with Mina"
        c1.dateText     = "Saturday"
        c1.timeText     = "7 PM"
        c1.location     = "Near Gangnam Station"
        c1.startDate    = cal.nextDate(after: now, matching: DateComponents(weekday: 7), matchingPolicy: .nextTime)
            .flatMap { cal.date(bySettingHour: 19, minute: 0, second: 0, of: $0) }
        c1.endDate      = c1.startDate.map { $0.addingTimeInterval(7200) }
        c1.alarmOption  = .thirtyMinutesBefore
        c1.confidence   = .high
        c1.target       = .calendar
        c1.originalText = "Dinner with Mina on Saturday at 7 PM near Gangnam Station."

        // reminder — needs time review
        var c2 = ExtractedCandidate()
        c2.sourceType     = .meetingFile
        c2.itemType       = .reminder
        c2.title          = "Send revised report"
        c2.dateText       = "by Friday"
        c2.startDate      = cal.nextDate(after: now, matching: DateComponents(weekday: 6), matchingPolicy: .nextTime)
        c2.needsTimeReview = true
        c2.confidence     = .medium
        c2.target         = .reminders
        c2.originalText   = "Please send the revised report by Friday."

        // event with date + time
        var c3 = ExtractedCandidate()
        c3.sourceType   = .screenshot
        c3.itemType     = .event
        c3.title        = "Call Alex — confirm schedule"
        c3.dateText     = "tomorrow"
        c3.timeText     = "3 PM"
        c3.startDate    = {
            let tmr = cal.date(byAdding: .day, value: 1, to: now)!
            return cal.date(bySettingHour: 15, minute: 0, second: 0, of: tmr)
        }()
        c3.confidence   = .high
        c3.target       = .calendar
        c3.originalText = "Call Alex tomorrow at 3 PM to confirm the schedule."

        // low-confidence task — needs date
        var c4 = ExtractedCandidate()
        c4.sourceType     = .text
        c4.itemType       = .task
        c4.title          = "Budget approval follow-up"
        c4.needsDateReview = true
        c4.confidence     = .low
        c4.target         = .local
        c4.originalText   = "Follow up on budget approval."

        return [c1, c2, c3, c4]
    }
}
