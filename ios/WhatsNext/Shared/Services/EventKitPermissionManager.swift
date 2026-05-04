import Foundation
import EventKit

// Centralises EventKit permission checks. iOS 17+ write-only calendar access keeps
// the permission prompt minimal — we only add events, never read them.
@MainActor
final class EventKitPermissionManager: ObservableObject {
    let eventStore = EKEventStore()

    @Published var calendarStatus: EKAuthorizationStatus
    @Published var remindersStatus: EKAuthorizationStatus

    init() {
        calendarStatus  = EKEventStore.authorizationStatus(for: .event)
        remindersStatus = EKEventStore.authorizationStatus(for: .reminder)
    }

    // MARK: - Calendar

    func requestCalendarAccess() async -> Bool {
        do {
            // iOS 17+: write-only is sufficient — we never read calendar events
            let granted = try await eventStore.requestWriteOnlyAccessToEvents()
            calendarStatus = EKEventStore.authorizationStatus(for: .event)
            return granted
        } catch {
            return false
        }
    }

    var hasCalendarAccess: Bool {
        calendarStatus == .fullAccess || calendarStatus == .writeOnly
    }

    // MARK: - Reminders

    func requestRemindersAccess() async -> Bool {
        do {
            let granted = try await eventStore.requestFullAccessToReminders()
            remindersStatus = EKEventStore.authorizationStatus(for: .reminder)
            return granted
        } catch {
            return false
        }
    }

    var hasRemindersAccess: Bool {
        remindersStatus == .fullAccess
    }

    // MARK: - Refresh (call on Settings appear)

    func refreshStatuses() {
        calendarStatus  = EKEventStore.authorizationStatus(for: .event)
        remindersStatus = EKEventStore.authorizationStatus(for: .reminder)
    }
}
