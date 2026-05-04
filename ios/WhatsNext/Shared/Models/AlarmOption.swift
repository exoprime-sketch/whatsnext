import Foundation

enum AlarmOption: String, Codable, CaseIterable, Identifiable {
    case none
    case atTime
    case tenMinutesBefore
    case thirtyMinutesBefore
    case oneHourBefore
    case oneDayBefore

    var id: String { rawValue }

    var label: String {
        switch self {
        case .none:               "No alarm"
        case .atTime:             "At time"
        case .tenMinutesBefore:   "10 min before"
        case .thirtyMinutesBefore:"30 min before"
        case .oneHourBefore:      "1 hour before"
        case .oneDayBefore:       "1 day before"
        }
    }

    // Negative value = before event start, nil = no alarm
    var offsetSeconds: TimeInterval? {
        switch self {
        case .none:               nil
        case .atTime:             0
        case .tenMinutesBefore:   -10 * 60
        case .thirtyMinutesBefore:-30 * 60
        case .oneHourBefore:      -60 * 60
        case .oneDayBefore:       -24 * 60 * 60
        }
    }
}
