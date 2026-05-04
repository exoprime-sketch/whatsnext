import Foundation
import EventKit

struct ReminderService {
    private let eventStore: EKEventStore

    init(eventStore: EKEventStore) {
        self.eventStore = eventStore
    }

    // Creates and saves an EKReminder from an extracted candidate.
    // Returns the calItemIdentifier for storage.
    @discardableResult
    func createReminder(from candidate: ExtractedCandidate) throws -> String {
        let reminder       = EKReminder(eventStore: eventStore)
        reminder.title     = candidate.title
        reminder.notes     = candidate.notes.isEmpty ? nil : candidate.notes

        if let due = candidate.startDate {
            reminder.dueDateComponents = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute], from: due
            )
            if let offset = candidate.alarmOption.offsetSeconds {
                reminder.addAlarm(EKAlarm(relativeOffset: offset))
            }
        }

        reminder.calendar = eventStore.defaultCalendarForNewReminders()
        try eventStore.save(reminder, commit: true)
        return reminder.calItemIdentifier
    }
}
