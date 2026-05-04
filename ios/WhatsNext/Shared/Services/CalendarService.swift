import Foundation
import EventKit

struct CalendarService {
    private let eventStore: EKEventStore

    init(eventStore: EKEventStore) {
        self.eventStore = eventStore
    }

    // Creates and saves an EKEvent from an extracted candidate.
    // Returns the eventIdentifier for storage.
    @discardableResult
    func createEvent(from candidate: ExtractedCandidate) throws -> String {
        let event       = EKEvent(eventStore: eventStore)
        event.title     = candidate.title
        event.notes     = candidate.notes.isEmpty ? nil : candidate.notes
        event.location  = candidate.location.isEmpty ? nil : candidate.location
        event.isAllDay  = false

        let start    = candidate.startDate ?? Date.now
        event.startDate = start
        event.endDate   = candidate.endDate ?? start.addingTimeInterval(3600)

        if let offset = candidate.alarmOption.offsetSeconds {
            event.addAlarm(EKAlarm(relativeOffset: offset))
        }

        event.calendar = eventStore.defaultCalendarForNewEvents
        try eventStore.save(event, span: .thisEvent)
        return event.eventIdentifier ?? ""
    }
}
