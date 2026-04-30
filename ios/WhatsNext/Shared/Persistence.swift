import Foundation

enum AppConstants {
    static let snapshotKey = "whatsnext.snapshot.v1"
    static let widgetSnapshotKey = "whatsnext.widget.v1"
}

final class AppRepository {
    private let defaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(suiteName: String = ReleaseConfiguration.appGroupIdentifier) {
        self.defaults = UserDefaults(suiteName: suiteName) ?? .standard
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    func load() -> AppStateSnapshot {
        guard let data = defaults.data(forKey: AppConstants.snapshotKey),
              let snapshot = try? decoder.decode(AppStateSnapshot.self, from: data) else {
            return AppStateSnapshot(version: "1.0", tasks: [], logs: [], settings: AppSettings(), metrics: LocalMetrics())
        }

        return snapshot
    }

    func save(_ snapshot: AppStateSnapshot) {
        if let data = try? encoder.encode(snapshot) {
            defaults.set(data, forKey: AppConstants.snapshotKey)
        }

        if let widgetData = try? encoder.encode(widgetSnapshot(from: snapshot)) {
            defaults.set(widgetData, forKey: AppConstants.widgetSnapshotKey)
        }
    }

    func clearAll() {
        defaults.removeObject(forKey: AppConstants.snapshotKey)
        defaults.removeObject(forKey: AppConstants.widgetSnapshotKey)
    }

    func loadWidgetSnapshot() -> WidgetSnapshot {
        guard let data = defaults.data(forKey: AppConstants.widgetSnapshotKey),
              let snapshot = try? decoder.decode(WidgetSnapshot.self, from: data) else {
            return .placeholder
        }

        return snapshot
    }

    private func widgetSnapshot(from snapshot: AppStateSnapshot) -> WidgetSnapshot {
        let recommendation = RecommendationEngine.nowRecommendation(from: snapshot.tasks, now: .now)
        let activeCount = snapshot.tasks.filter { $0.status == .active }.count

        if let task = recommendation.task {
            return WidgetSnapshot(
                title: task.title,
                subtitle: "지금 할 일 하나",
                durationMinutes: task.durationMinutes,
                remainingCount: activeCount,
                reasons: recommendation.reasons,
                updatedAt: .now,
                deepLink: "whatsnext://today"
            )
        }

        return WidgetSnapshot(
            title: "지금 추천할 일이 없습니다",
            subtitle: "첫 할 일을 추가하면 바로 추천해드릴게요.",
            durationMinutes: 10,
            remainingCount: activeCount,
            reasons: ["생각은 줄이고, 다음 행동만 남겼어요."],
            updatedAt: .now,
            deepLink: "whatsnext://today"
        )
    }
}
