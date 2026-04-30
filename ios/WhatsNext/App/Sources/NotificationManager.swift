import Foundation
import UserNotifications

struct NotificationContext {
    var morningBody: String
    var afternoonBody: String
    var eveningBody: String
}

final class NotificationManager {
    private let center = UNUserNotificationCenter.current()

    func requestAuthorizationIfNeeded() async -> Bool {
        let settings = await center.notificationSettings()
        switch settings.authorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        case .denied:
            return false
        case .notDetermined:
            return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        @unknown default:
            return false
        }
    }

    func refreshNotifications(settings: AppSettings, context: NotificationContext) async -> Bool {
        center.removePendingNotificationRequests(withIdentifiers: NotificationSlot.allCases.map(\.rawValue))

        guard !settings.enabledNotificationSlots.isEmpty else { return false }
        guard await requestAuthorizationIfNeeded() else { return false }

        for slot in settings.enabledNotificationSlots {
            let content = UNMutableNotificationContent()
            content.title = slot.title
            content.body = body(for: slot, context: context)
            content.sound = .default

            var components = DateComponents()
            components.hour = settings.notificationHour(for: slot)
            components.minute = slot.defaultMinute

            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
            let request = UNNotificationRequest(identifier: slot.rawValue, content: content, trigger: trigger)
            try? await center.add(request)
        }

        return true
    }

    private func body(for slot: NotificationSlot, context: NotificationContext) -> String {
        switch slot {
        case .morning:
            return context.morningBody
        case .afternoon:
            return context.afternoonBody
        case .evening:
            return context.eveningBody
        }
    }
}
