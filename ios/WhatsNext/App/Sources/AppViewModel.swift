import Foundation
import SwiftUI
import WidgetKit

@MainActor
final class AppViewModel: ObservableObject {
    @Published var tasks: [Task]
    @Published var logs: [ActivityLog]
    @Published var settings: AppSettings
    @Published var metrics: LocalMetrics
    @Published var selectedTab: AppTab = .today
    @Published var taskFilter: TaskFilter = .all
    @Published var editingTask: Task?
    @Published var captureText = ""
    @Published var captureCandidates: [CaptureCandidate] = []
    @Published var onboardingDraft = OnboardingDraft()
    @Published var toast: ToastMessage?

    private let repository: AppRepository
    private let notificationManager = NotificationManager()

    init(repository: AppRepository = AppRepository()) {
        self.repository = repository
        let snapshot = repository.load()
        self.tasks = snapshot.tasks
        self.logs = snapshot.logs
        self.settings = snapshot.settings
        self.metrics = snapshot.metrics
        normalizeTasks()
        recordAppOpen()
    }

    var now: Date { .now }

    var isOnboardingRequired: Bool {
        !settings.hasCompletedOnboarding
    }

    var greetingTitle: String {
        switch now.timeBand {
        case .morning:
            "좋은 아침이에요"
        case .afternoon:
            "오후 흐름이 올라왔어요"
        case .evening:
            "저녁에는 가볍게 정리해두기 좋아요"
        case .night:
            "늦은 시간에는 짧은 일이 잘 맞아요"
        }
    }

    var greetingSubtitle: String {
        switch now.timeBand {
        case .morning:
            "머리가 맑을 때 하나 먼저 끝내볼까요?"
        case .afternoon:
            "생각은 줄이고, 지금 할 일 하나만 남겼어요."
        case .evening:
            "부담 적은 일부터 마무리하기 좋은 시간입니다."
        case .night:
            "오늘을 닫기 전에 가볍게 하나만 처리해볼까요?"
        }
    }

    var todayRecommendation: RecommendationResult {
        RecommendationEngine.nowRecommendation(from: tasks, now: now)
    }

    var nextCandidates: [Task] {
        RecommendationEngine.sortedTasks(tasks, now: now)
            .filter { $0.status == .active && $0.id != todayRecommendation.task?.id }
            .prefix(3)
            .map { $0 }
    }

    var remainingActiveTasks: [Task] {
        tasks.filter { $0.status == .active }
    }

    var postponedTasks: [Task] {
        tasks.filter { $0.status == .active && $0.postponeWeight > 0 }
            .sorted { $0.postponeWeight > $1.postponeWeight }
    }

    var completedToday: [Task] {
        tasks.filter {
            $0.status == .completed &&
            ($0.completedAt?.dateKey == now.dateKey)
        }
        .sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
    }

    var recentCompleted: [Task] {
        tasks.filter { $0.status == .completed }
            .sorted { ($0.completedAt ?? .distantPast) > ($1.completedAt ?? .distantPast) }
            .prefix(5)
            .map { $0 }
    }

    var weeklyInsight: WeeklyInsight {
        RecommendationEngine.weeklyInsight(tasks: tasks, logs: logs, now: now)
    }

    var usageSummaryLines: [String] {
        [
            "이번 주 완료: \(weeklyInsight.completedCount)개",
            "가장 많이 미룬 일: \(weeklyInsight.mostPostponedTitle ?? "없음")",
            "활성 일수: \(metrics.activeDays.count)일",
            "Now Card 완료: \(metrics.nowCardCompletedCount)회"
        ]
    }

    var filteredTasks: [Task] {
        let ranked = RecommendationEngine.sortedTasks(tasks, now: now)

        switch taskFilter {
        case .all:
            return ranked
        case .today:
            return ranked.filter { task in
                task.status == .active &&
                (!task.excludedToday || task.excludedOnDate != now.dateKey) &&
                (task.snoozeUntil == nil || task.snoozeUntil! <= now)
            }
        case .completed:
            return ranked.filter { $0.status == .completed }
        case .postponed:
            return ranked.filter { $0.status == .active && $0.postponeWeight > 0 }
        }
    }

    func refreshForForeground() {
        recordAppOpen()
        normalizeTasks()
        persistState()
    }

    func addTask(draft: TaskDraft, source: TaskSource = .manual) {
        let task = Task(draft: draft, source: source, now: now)
        guard !task.title.isEmpty else { return }
        tasks.insert(task, at: 0)
        appendLog(type: source == .capture ? .captured : .created, taskID: task.id)
        if metrics.firstTaskCreatedAt == nil {
            metrics.firstTaskCreatedAt = now
        }
        selectedTab = .today
        showToast("할 일을 저장했어요.")
        persistState()
    }

    func updateTask(_ task: Task, with draft: TaskDraft) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].title = draft.trimmedTitle
        tasks[index].memo = draft.trimmedMemo
        tasks[index].durationMinutes = draft.durationMinutes
        tasks[index].importance = draft.importance
        tasks[index].due = draft.due
        tasks[index].preferredTime = draft.preferredTime
        appendLog(type: .edited, taskID: task.id)
        editingTask = nil
        showToast("할 일을 수정했어요.")
        persistState()
    }

    func deleteTask(_ task: Task) {
        tasks.removeAll { $0.id == task.id }
        appendLog(type: .deleted, taskID: task.id)
        showToast("할 일을 삭제했어요.")
        persistState()
    }

    func completeTask(_ task: Task) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].status = .completed
        tasks[index].completedAt = now
        tasks[index].excludedToday = false
        tasks[index].excludedOnDate = nil
        tasks[index].snoozeUntil = nil
        appendLog(type: .completed, taskID: task.id)
        if metrics.firstInteractionAt == nil {
            metrics.firstInteractionAt = now
        }
        metrics.nowCardCompletedCount += 1
        showToast(["좋아요. 하나 끝냈습니다.", "작게라도 앞으로 갔어요.", "다음 할 일도 준비해둘게요."].randomElement() ?? "좋아요. 하나 끝냈습니다.")
        persistState()
    }

    func snoozeTask(_ task: Task) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].snoozeCount += 1
        tasks[index].snoozeUntil = now.addingTimeInterval(10 * 60)
        tasks[index].excludedToday = false
        tasks[index].excludedOnDate = nil
        tasks[index].lastFeedbackType = .snooze
        tasks[index].lastFeedbackAt = now
        appendLog(type: .snoozed, taskID: task.id)
        if metrics.firstInteractionAt == nil {
            metrics.firstInteractionAt = now
        }
        metrics.snoozedCount += 1
        showToast("10분 뒤에 다시 보여드릴게요.")
        persistState()
    }

    func skipToday(_ task: Task) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].excludedToday = true
        tasks[index].excludedOnDate = now.dateKey
        tasks[index].snoozeUntil = nil
        tasks[index].lastFeedbackType = .skipToday
        tasks[index].lastFeedbackAt = now
        appendLog(type: .excludedToday, taskID: task.id)
        if metrics.firstInteractionAt == nil {
            metrics.firstInteractionAt = now
        }
        metrics.skippedTodayCount += 1
        showToast("오늘 추천에서는 빼둘게요.")
        persistState()
    }

    func negativeFeedback(_ task: Task) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        tasks[index].negativeFeedbackCount += 1
        tasks[index].lastFeedbackType = .negative
        tasks[index].lastFeedbackAt = now
        appendLog(type: .negativeFeedback, taskID: task.id)
        if metrics.firstInteractionAt == nil {
            metrics.firstInteractionAt = now
        }
        metrics.negativeFeedbackCount += 1
        showToast("다른 후보를 먼저 살펴볼게요.")
        persistState()
    }

    func parseCaptureText() {
        captureCandidates = CaptureParser.candidates(from: captureText)
        if captureCandidates.isEmpty {
            showToast("할 일 후보를 찾지 못했어요. 문장을 조금 더 잘게 넣어보세요.")
        } else {
            metrics.captureUsedCount += 1
            showToast("\(captureCandidates.count)개의 후보를 만들었어요.")
            persistState()
        }
    }

    func saveSelectedCandidates() {
        let selected = captureCandidates.filter(\.isSelected)
        guard !selected.isEmpty else {
            showToast("저장할 후보를 하나 이상 선택해 주세요.")
            return
        }

        for candidate in selected {
            let draft = TaskDraft(
                title: candidate.title,
                memo: candidate.memo,
                durationMinutes: candidate.durationMinutes,
                importance: candidate.importance,
                due: candidate.due,
                preferredTime: candidate.preferredTime
            )
            addTask(draft: draft, source: .capture)
        }

        captureText = ""
        captureCandidates = []
        showToast("\(selected.count)개의 할 일을 저장했어요.")
    }

    func restoreSampleData() {
        tasks = SampleData.tasks(now: now)
        logs.insert(ActivityLog(type: .restoredSamples, createdAt: now), at: 0)
        settings.hasCompletedOnboarding = true
        if metrics.firstTaskCreatedAt == nil {
            metrics.firstTaskCreatedAt = now
        }
        selectedTab = .today
        showToast("샘플 데이터를 다시 불러왔어요.")
        persistState()
    }

    func clearAllData() {
        tasks = []
        logs = [ActivityLog(type: .clearedAll, createdAt: now)]
        captureText = ""
        captureCandidates = []
        settings = AppSettings()
        metrics = LocalMetrics()
        metrics.markActive(on: now)
        onboardingDraft = OnboardingDraft()
        repository.clearAll()
        showToast("모든 데이터를 삭제했어요.")
        persistState()
    }

    func toggleNotification(_ slot: NotificationSlot, isEnabled: Bool) {
        if isEnabled {
            if !settings.enabledNotificationSlots.contains(slot) {
                settings.enabledNotificationSlots.append(slot)
            }
        } else {
            settings.enabledNotificationSlots.removeAll { $0 == slot }
        }

        persistState()
    }

    func updateNotificationHour(_ hour: Int, for slot: NotificationSlot) {
        settings.setNotificationHour(hour, for: slot)
        persistState()
    }

    func finishOnboarding(usingSampleData: Bool = false) async {
        if usingSampleData {
            tasks = SampleData.tasks(now: now)
            if metrics.firstTaskCreatedAt == nil {
                metrics.firstTaskCreatedAt = now
            }
        } else {
            let firstTask = TaskDraft(
                title: onboardingDraft.firstTaskTitle,
                memo: "",
                durationMinutes: 10,
                importance: .high,
                due: .today,
                preferredTime: preferredTimeForCurrentMoment()
            )
            addTask(draft: firstTask, source: .manual)
        }

        settings.hasCompletedOnboarding = true
        settings.enabledNotificationSlots = onboardingDraft.selectedChoice.slots
        if metrics.onboardingCompletedAt == nil {
            metrics.onboardingCompletedAt = now
        }
        onboardingDraft = OnboardingDraft()
        selectedTab = .today
        showToast("첫 추천을 준비해뒀어요.")
        persistState()
    }

    func handleDeepLink(_ url: URL) {
        guard url.scheme == "whatsnext" else { return }
        selectedTab = .today
        metrics.widgetDeepLinkOpenedCount += 1
        persistState()
    }

    private func preferredTimeForCurrentMoment() -> PreferredTime {
        switch now.timeBand {
        case .morning: .morning
        case .afternoon: .afternoon
        case .evening: .evening
        case .night: .anytime
        }
    }

    private func normalizeTasks() {
        tasks = tasks.map { task in
            var normalized = task

            if task.excludedToday && task.excludedOnDate != now.dateKey {
                normalized.excludedToday = false
                normalized.excludedOnDate = nil
            }

            if let snoozeUntil = task.snoozeUntil, snoozeUntil <= now {
                normalized.snoozeUntil = nil
            }

            return normalized
        }
    }

    private func appendLog(type: ActivityLog.Kind, taskID: UUID? = nil, meta: String? = nil) {
        logs.insert(ActivityLog(taskID: taskID, type: type, createdAt: now, meta: meta), at: 0)
        if logs.count > 300 {
            logs = Array(logs.prefix(300))
        }
    }

    private func showToast(_ text: String) {
        toast = ToastMessage(text: text)
    }

    private func recordAppOpen() {
        metrics.markActive(on: now)
        if metrics.firstNowCardViewedAt == nil, todayRecommendation.task != nil {
            metrics.firstNowCardViewedAt = now
        }
    }

    private func persistState() {
        recordAppOpen()
        let snapshot = AppStateSnapshot(version: "1.0", tasks: tasks, logs: logs, settings: settings, metrics: metrics)
        repository.save(snapshot)
        WidgetCenter.shared.reloadAllTimelines()

        let recommendation = todayRecommendation
        let context = NotificationContext(
            morningBody: recommendation.task.map { "오늘 첫 할 일 '\($0.title)'를 준비해뒀어요." } ?? "오늘 첫 할 일 하나를 준비해뒀어요.",
            afternoonBody: recommendation.task.map { "지금 '\($0.title)'처럼 10분 안에 시작할 수 있는 일 하나만 끝내볼까요?" } ?? "지금 10분짜리 일 하나만 끝내볼까요?",
            eveningBody: remainingActiveTasks.isEmpty ? "내일이 편해지도록 하나만 정리해둘까요?" : "내일이 편해지도록 남은 일 \(remainingActiveTasks.count)개 중 하나만 정리해둘까요?"
        )
        let currentSettings = settings
        let notificationManager = self.notificationManager
        let repository = self.repository

        _Concurrency.Task {
            let didEnable = await notificationManager.refreshNotifications(settings: currentSettings, context: context)
            guard didEnable else { return }

            await MainActor.run {
                if metrics.notificationEnabledAt == nil {
                    metrics.notificationEnabledAt = now
                    let refreshedSnapshot = AppStateSnapshot(version: "1.0", tasks: tasks, logs: logs, settings: settings, metrics: metrics)
                    repository.save(refreshedSnapshot)
                }
            }
        }
    }
}
