import Foundation

enum RecommendationEngine {
    static func score(task: Task, now: Date) -> RecommendationResult? {
        guard task.status == .active else { return nil }

        let todayKey = now.dateKey
        if task.excludedToday && task.excludedOnDate == todayKey {
            return nil
        }

        if let snoozeUntil = task.snoozeUntil, snoozeUntil > now {
            return nil
        }

        var score = 0
        var reasons: [String] = []
        let timeBand = now.timeBand

        score += task.importance.score
        score += task.due.score

        switch task.due {
        case .today:
            reasons.append("오늘 마감인 작업입니다.")
        case .tomorrow:
            reasons.append("내일 전에 손대두면 훨씬 편해집니다.")
        case .thisWeek:
            reasons.append("이번 주 안에 끝내야 해서 미리 건드리는 편이 좋습니다.")
        case .none:
            break
        }

        switch task.importance {
        case .high:
            reasons.append("중요도가 높게 표시된 일입니다.")
        case .medium:
            reasons.append("오늘 흐름 안에서 챙겨두기 좋은 우선순위입니다.")
        case .low:
            break
        }

        if task.preferredTime.rawValue == timeBand.rawValue {
            score += 15
            reasons.append("\(timeBand.label)에 하기로 둔 일이라 지금 흐름과 맞습니다.")
        }

        if isDurationFit(task.durationMinutes, timeBand: timeBand) {
            score += 10
            reasons.append("\(task.durationMinutes)분이면 지금 시작하기 부담이 적습니다.")
        }

        if task.snoozeCount > 0 {
            score += task.snoozeCount * 5
            reasons.append("최근 \(task.snoozeCount)번 미뤄서 더 늦기 전에 처리하는 편이 좋습니다.")
        }

        if wasRecentlyRejected(task: task, now: now) {
            score -= 25
        }

        return RecommendationResult(task: task, score: score, reasons: Array(reasons.prefix(3)))
    }

    static func nowRecommendation(from tasks: [Task], now: Date = .now) -> RecommendationResult {
        let ranked = tasks.compactMap { score(task: $0, now: now) }.sorted { $0.score > $1.score }
        return ranked.first ?? RecommendationResult(task: nil, score: 0, reasons: [])
    }

    static func sortedTasks(_ tasks: [Task], now: Date = .now) -> [Task] {
        tasks.sorted { left, right in
            let leftScore = score(task: left, now: now)?.score ?? Int.min
            let rightScore = score(task: right, now: now)?.score ?? Int.min
            if leftScore != rightScore {
                return leftScore > rightScore
            }
            return left.createdAt > right.createdAt
        }
    }

    static func weeklyInsight(tasks: [Task], logs: [ActivityLog], now: Date = .now) -> WeeklyInsight {
        let calendar = Calendar.current
        let weekAgo = calendar.date(byAdding: .day, value: -7, to: now) ?? now
        let completed = tasks.filter {
            $0.status == .completed && ($0.completedAt ?? .distantPast) >= weekAgo
        }
        let postponed = tasks.filter { $0.postponeWeight > 0 }.sorted { $0.postponeWeight > $1.postponeWeight }

        let bestTimeBand = Dictionary(grouping: completed, by: { ($0.completedAt ?? .now).timeBand })
            .sorted { $0.value.count > $1.value.count }
            .first?
            .key

        let summary: String
        if completed.isEmpty {
            summary = "이번 주 완료 기록이 아직 많지 않습니다. 짧은 작업부터 시작하면 흐름이 붙기 쉽습니다."
        } else if let bestTimeBand {
            summary = "이번 주에는 \(completed.count)개를 완료했고, 특히 \(bestTimeBand.label)에 마무리가 잘 됐습니다."
        } else {
            summary = "이번 주에는 \(completed.count)개를 완료했습니다."
        }

        return WeeklyInsight(
            completedCount: completed.count,
            mostPostponedTitle: postponed.first?.title,
            bestTimeBand: bestTimeBand,
            summary: summary
        )
    }

    private static func isDurationFit(_ durationMinutes: Int, timeBand: TimeBand) -> Bool {
        switch timeBand {
        case .night:
            durationMinutes <= 15
        case .morning:
            durationMinutes <= 30
        case .afternoon:
            durationMinutes >= 15
        case .evening:
            durationMinutes <= 30
        }
    }

    private static func wasRecentlyRejected(task: Task, now: Date) -> Bool {
        guard task.lastFeedbackType == .negative, let lastFeedbackAt = task.lastFeedbackAt else {
            return false
        }

        return now.timeIntervalSince(lastFeedbackAt) < 60 * 60 * 24
    }
}
