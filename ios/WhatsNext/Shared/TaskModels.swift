import Foundation

enum ReleaseConfiguration {
    static let appGroupIdentifier = Bundle.main.object(forInfoDictionaryKey: "WHATSNEXT_APP_GROUP_IDENTIFIER") as? String
    ?? "group.com.todayone.whatsnext"
    static let supportEmail = Bundle.main.object(forInfoDictionaryKey: "WHATSNEXT_SUPPORT_EMAIL") as? String
    ?? "support@example.com"
    static let privacyPolicyURL = Bundle.main.object(forInfoDictionaryKey: "WHATSNEXT_PRIVACY_POLICY_URL") as? String
    ?? "https://example.com/privacy"
    static let operatorName = Bundle.main.object(forInfoDictionaryKey: "WHATSNEXT_OPERATOR_NAME") as? String
    ?? "YOUR_COMPANY_NAME"
}

enum Importance: String, Codable, CaseIterable, Identifiable {
    case low
    case medium
    case high

    var id: String { rawValue }

    var label: String {
        switch self {
        case .low: "낮음"
        case .medium: "보통"
        case .high: "높음"
        }
    }

    var score: Int {
        switch self {
        case .low: 5
        case .medium: 15
        case .high: 30
        }
    }
}

enum DueBucket: String, Codable, CaseIterable, Identifiable {
    case today
    case tomorrow
    case thisWeek
    case none

    var id: String { rawValue }

    var label: String {
        switch self {
        case .today: "오늘"
        case .tomorrow: "내일"
        case .thisWeek: "이번 주"
        case .none: "없음"
        }
    }

    var score: Int {
        switch self {
        case .today: 35
        case .tomorrow: 20
        case .thisWeek: 10
        case .none: 0
        }
    }
}

enum PreferredTime: String, Codable, CaseIterable, Identifiable {
    case morning
    case afternoon
    case evening
    case anytime

    var id: String { rawValue }

    var label: String {
        switch self {
        case .morning: "아침"
        case .afternoon: "오후"
        case .evening: "저녁"
        case .anytime: "상관없음"
        }
    }
}

enum TimeBand: String, Codable {
    case morning
    case afternoon
    case evening
    case night

    var label: String {
        switch self {
        case .morning: "아침"
        case .afternoon: "오후"
        case .evening: "저녁"
        case .night: "밤"
        }
    }
}

enum TaskStatus: String, Codable {
    case active
    case completed
}

enum TaskFeedbackType: String, Codable {
    case snooze
    case skipToday
    case negative
}

enum TaskSource: String, Codable {
    case manual
    case capture
    case sample
}

enum AppTab: String, CaseIterable, Identifiable {
    case today
    case add
    case list
    case capture
    case settings

    var id: String { rawValue }

    var label: String {
        switch self {
        case .today: "오늘"
        case .add: "추가"
        case .list: "목록"
        case .capture: "캡처"
        case .settings: "설정"
        }
    }

    var systemImage: String {
        switch self {
        case .today: "sun.max"
        case .add: "plus.circle"
        case .list: "checklist"
        case .capture: "text.badge.plus"
        case .settings: "gearshape"
        }
    }
}

enum TaskFilter: String, CaseIterable, Identifiable {
    case all
    case today
    case completed
    case postponed

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all: "전체"
        case .today: "오늘"
        case .completed: "완료"
        case .postponed: "미룸"
        }
    }
}

enum NotificationSlot: String, Codable, CaseIterable, Identifiable {
    case morning
    case afternoon
    case evening

    var id: String { rawValue }

    var label: String {
        switch self {
        case .morning: "아침"
        case .afternoon: "점심"
        case .evening: "저녁"
        }
    }

    var defaultHour: Int {
        switch self {
        case .morning: 8
        case .afternoon: 13
        case .evening: 20
        }
    }

    var defaultMinute: Int { 30 }

    var title: String {
        switch self {
        case .morning: "오늘하나 아침 브리핑"
        case .afternoon: "10분짜리 일 하나 해볼 시간이에요"
        case .evening: "내일을 가볍게 만드는 정리 시간이에요"
        }
    }

    var body: String {
        switch self {
        case .morning: "오늘 첫 할 일 하나를 준비해뒀어요."
        case .afternoon: "지금 10분짜리 일 하나만 끝내볼까요?"
        case .evening: "내일이 편해지도록 하나만 정리해둘까요?"
        }
    }
}

enum NotificationOnboardingChoice: String, CaseIterable, Identifiable {
    case morning
    case lunch
    case evening
    case later

    var id: String { rawValue }

    var label: String {
        switch self {
        case .morning: "아침"
        case .lunch: "점심"
        case .evening: "저녁"
        case .later: "나중에"
        }
    }

    var slots: [NotificationSlot] {
        switch self {
        case .morning: [.morning]
        case .lunch: [.afternoon]
        case .evening: [.evening]
        case .later: []
        }
    }
}

struct TaskDraft: Codable, Hashable {
    var title: String = ""
    var memo: String = ""
    var durationMinutes: Int = 15
    var importance: Importance = .medium
    var due: DueBucket = .none
    var preferredTime: PreferredTime = .anytime

    static let durationOptions = [5, 10, 15, 30, 60]

    var trimmedTitle: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var trimmedMemo: String {
        memo.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct Task: Identifiable, Codable, Hashable {
    var id: UUID
    var title: String
    var memo: String
    var durationMinutes: Int
    var importance: Importance
    var due: DueBucket
    var preferredTime: PreferredTime
    var status: TaskStatus
    var snoozeCount: Int
    var negativeFeedbackCount: Int
    var createdAt: Date
    var completedAt: Date?
    var excludedToday: Bool
    var excludedOnDate: String?
    var lastFeedbackAt: Date?
    var lastFeedbackType: TaskFeedbackType?
    var snoozeUntil: Date?
    var source: TaskSource

    init(
        id: UUID = UUID(),
        title: String,
        memo: String = "",
        durationMinutes: Int,
        importance: Importance,
        due: DueBucket,
        preferredTime: PreferredTime,
        status: TaskStatus = .active,
        snoozeCount: Int = 0,
        negativeFeedbackCount: Int = 0,
        createdAt: Date = .now,
        completedAt: Date? = nil,
        excludedToday: Bool = false,
        excludedOnDate: String? = nil,
        lastFeedbackAt: Date? = nil,
        lastFeedbackType: TaskFeedbackType? = nil,
        snoozeUntil: Date? = nil,
        source: TaskSource = .manual
    ) {
        self.id = id
        self.title = title
        self.memo = memo
        self.durationMinutes = durationMinutes
        self.importance = importance
        self.due = due
        self.preferredTime = preferredTime
        self.status = status
        self.snoozeCount = snoozeCount
        self.negativeFeedbackCount = negativeFeedbackCount
        self.createdAt = createdAt
        self.completedAt = completedAt
        self.excludedToday = excludedToday
        self.excludedOnDate = excludedOnDate
        self.lastFeedbackAt = lastFeedbackAt
        self.lastFeedbackType = lastFeedbackType
        self.snoozeUntil = snoozeUntil
        self.source = source
    }

    var postponeWeight: Int {
        snoozeCount + negativeFeedbackCount + (excludedToday ? 1 : 0)
    }
}

struct ActivityLog: Identifiable, Codable, Hashable {
    enum Kind: String, Codable {
        case created
        case completed
        case snoozed
        case excludedToday
        case negativeFeedback
        case edited
        case deleted
        case restoredSamples
        case clearedAll
        case captured
    }

    var id: UUID = UUID()
    var taskID: UUID?
    var type: Kind
    var createdAt: Date = .now
    var meta: String?
}

struct AppSettings: Codable, Hashable {
    var hasCompletedOnboarding = false
    var enabledNotificationSlots: [NotificationSlot] = []
    var morningHour = NotificationSlot.morning.defaultHour
    var afternoonHour = NotificationSlot.afternoon.defaultHour
    var eveningHour = NotificationSlot.evening.defaultHour
    var version = "1.0"
    var contactEmail = ReleaseConfiguration.supportEmail
    var privacyPolicyURL = ReleaseConfiguration.privacyPolicyURL
    var operatorName = ReleaseConfiguration.operatorName

    func notificationHour(for slot: NotificationSlot) -> Int {
        switch slot {
        case .morning: morningHour
        case .afternoon: afternoonHour
        case .evening: eveningHour
        }
    }

    mutating func setNotificationHour(_ hour: Int, for slot: NotificationSlot) {
        switch slot {
        case .morning: morningHour = hour
        case .afternoon: afternoonHour = hour
        case .evening: eveningHour = hour
        }
    }
}

struct LocalMetrics: Codable, Hashable {
    var firstLaunchAt: Date = .now
    var onboardingCompletedAt: Date?
    var firstTaskCreatedAt: Date?
    var firstNowCardViewedAt: Date?
    var firstInteractionAt: Date?
    var nowCardCompletedCount = 0
    var snoozedCount = 0
    var skippedTodayCount = 0
    var negativeFeedbackCount = 0
    var captureUsedCount = 0
    var notificationEnabledAt: Date?
    var widgetDeepLinkOpenedCount = 0
    var lastActiveAt: Date?
    var activeDays: [String] = []

    mutating func markActive(on date: Date) {
        lastActiveAt = date
        let key = date.dateKey
        if !activeDays.contains(key) {
            activeDays.append(key)
            activeDays.sort()
        }
    }
}

struct AppStateSnapshot: Codable {
    var version: String
    var tasks: [Task]
    var logs: [ActivityLog]
    var settings: AppSettings
    var metrics: LocalMetrics

    init(
        version: String,
        tasks: [Task],
        logs: [ActivityLog],
        settings: AppSettings,
        metrics: LocalMetrics = LocalMetrics()
    ) {
        self.version = version
        self.tasks = tasks
        self.logs = logs
        self.settings = settings
        self.metrics = metrics
    }

    enum CodingKeys: String, CodingKey {
        case version
        case tasks
        case logs
        case settings
        case metrics
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        version = try container.decodeIfPresent(String.self, forKey: .version) ?? "1.0"
        tasks = try container.decodeIfPresent([Task].self, forKey: .tasks) ?? []
        logs = try container.decodeIfPresent([ActivityLog].self, forKey: .logs) ?? []
        settings = try container.decodeIfPresent(AppSettings.self, forKey: .settings) ?? AppSettings()
        metrics = try container.decodeIfPresent(LocalMetrics.self, forKey: .metrics) ?? LocalMetrics()
    }
}

struct RecommendationResult: Hashable {
    var task: Task?
    var score: Int
    var reasons: [String]
}

struct CaptureCandidate: Identifiable, Hashable {
    var id: UUID = UUID()
    var title: String
    var memo: String = ""
    var durationMinutes: Int
    var importance: Importance
    var due: DueBucket
    var preferredTime: PreferredTime
    var rawText: String
    var isSelected = true
}

struct WeeklyInsight: Hashable {
    var completedCount: Int
    var mostPostponedTitle: String?
    var bestTimeBand: TimeBand?
    var summary: String
}

struct WidgetSnapshot: Codable, Hashable {
    var title: String
    var subtitle: String
    var durationMinutes: Int
    var remainingCount: Int
    var reasons: [String]
    var updatedAt: Date
    var deepLink: String

    static let placeholder = WidgetSnapshot(
        title: "지금 할 일 하나를 정해둘게요",
        subtitle: "앱을 열어 첫 할 일을 추가해보세요.",
        durationMinutes: 10,
        remainingCount: 0,
        reasons: ["모든 데이터는 기기 안에만 저장됩니다."],
        updatedAt: .now,
        deepLink: "whatsnext://today"
    )
}

struct ToastMessage: Identifiable, Equatable {
    let id = UUID()
    let text: String
}

struct OnboardingDraft: Hashable {
    var selectedChoice: NotificationOnboardingChoice = .later
    var firstTaskTitle = ""
}

extension Task {
    init(draft: TaskDraft, source: TaskSource = .manual, now: Date = .now) {
        self.init(
            title: draft.trimmedTitle,
            memo: draft.trimmedMemo,
            durationMinutes: draft.durationMinutes,
            importance: draft.importance,
            due: draft.due,
            preferredTime: draft.preferredTime,
            createdAt: now,
            source: source
        )
    }
}

extension Date {
    var dateKey: String {
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day], from: self)
        return String(format: "%04d-%02d-%02d", components.year ?? 0, components.month ?? 0, components.day ?? 0)
    }

    var timeBand: TimeBand {
        let hour = Calendar.current.component(.hour, from: self)
        switch hour {
        case 5..<12: .morning
        case 12..<18: .afternoon
        case 18..<24: .evening
        default: .night
        }
    }
}
