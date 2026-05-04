import Foundation

struct ScheduleItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var notes: String = ""
    var startDate: Date? = nil
    var endDate: Date? = nil
    var location: String = ""
    var itemType: String        // "event" | "reminder" | "task"
    var sourceType: String      // matches ImportSourceType.rawValue
    var calendarEventID: String? = nil
    var reminderID: String? = nil
    var savedAt: Date = .now

    init(
        title: String,
        notes: String = "",
        startDate: Date? = nil,
        endDate: Date? = nil,
        location: String = "",
        itemType: String,
        sourceType: String,
        calendarEventID: String? = nil,
        reminderID: String? = nil
    ) {
        self.title = title
        self.notes = notes
        self.startDate = startDate
        self.endDate = endDate
        self.location = location
        self.itemType = itemType
        self.sourceType = sourceType
        self.calendarEventID = calendarEventID
        self.reminderID = reminderID
    }
}

extension ScheduleItem {
    init(from candidate: ExtractedCandidate) {
        self.init(
            title: candidate.title,
            notes: candidate.notes,
            startDate: candidate.startDate,
            endDate: candidate.endDate,
            location: candidate.location,
            itemType: candidate.itemType.rawValue,
            sourceType: candidate.sourceType.rawValue
        )
    }
}
