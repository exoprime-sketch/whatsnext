import Foundation

enum CandidateItemType: String, Codable, CaseIterable, Identifiable {
    case event
    case reminder
    case task

    var id: String { rawValue }

    var label: String {
        switch self {
        case .event:    "Event"
        case .reminder: "Reminder"
        case .task:     "Task"
        }
    }

    var systemImage: String {
        switch self {
        case .event:    "calendar"
        case .reminder: "bell"
        case .task:     "checkmark.circle"
        }
    }
}

enum CandidateTarget: String, Codable, CaseIterable, Identifiable {
    case calendar
    case reminders
    case local

    var id: String { rawValue }

    var label: String {
        switch self {
        case .calendar:  "Calendar"
        case .reminders: "Reminders"
        case .local:     "Local"
        }
    }
}

enum CandidateConfidence: String, Codable, CaseIterable {
    case low
    case medium
    case high
}

struct ExtractedCandidate: Identifiable, Hashable {
    var id: UUID = UUID()
    var sourceType: ImportSourceType = .text
    var itemType: CandidateItemType = .task
    var title: String = ""
    var notes: String = ""
    var dateText: String = ""
    var timeText: String = ""
    var startDate: Date? = nil
    var endDate: Date? = nil
    var location: String = ""
    var person: String = ""
    var confidence: CandidateConfidence = .medium
    var needsDateReview: Bool = false
    var needsTimeReview: Bool = false
    var alarmOption: AlarmOption = .none
    var target: CandidateTarget = .local
    var originalText: String = ""
    var selected: Bool = true
}

extension ExtractedCandidate {
    var reviewGroup: String {
        if confidence == .low  { return "Low confidence" }
        if needsDateReview     { return "Needs date" }
        if needsTimeReview     { return "Needs time" }
        return "Ready"
    }

    var isReady: Bool {
        confidence != .low && !needsDateReview && !needsTimeReview
    }
}
