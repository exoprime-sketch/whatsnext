import Foundation

enum CaptureParser {
    static func candidates(from text: String) -> [CaptureCandidate] {
        let fragments = text
            .replacingOccurrences(of: "\r", with: "\n")
            .components(separatedBy: CharacterSet(charactersIn: "\n.!?"))
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count >= 4 }

        let candidates: [CaptureCandidate] = fragments.compactMap { fragment -> CaptureCandidate? in
            let title = actionTitle(from: fragment)
            guard !title.isEmpty, title.count >= 3 else { return nil }

            return CaptureCandidate(
                title: title,
                durationMinutes: guessedDuration(from: fragment),
                importance: guessedImportance(from: fragment),
                due: guessedDue(from: fragment),
                preferredTime: guessedPreferredTime(from: fragment),
                rawText: fragment
            )
        }

        return Array(candidates.prefix(6))
    }

    private static func guessedDue(from text: String) -> DueBucket {
        if text.contains("오늘까지") || text.contains("오늘 중") || text.contains("오늘") {
            return .today
        }

        if text.contains("내일까지") || text.contains("내일") {
            return .tomorrow
        }

        if text.contains("이번 주") || text.contains("금주") || text.contains("주중") {
            return .thisWeek
        }

        return .none
    }

    private static func guessedPreferredTime(from text: String) -> PreferredTime {
        if text.contains("오전") || text.contains("아침") {
            return .morning
        }

        if text.contains("오후") || text.contains("점심") {
            return .afternoon
        }

        if text.contains("저녁") || text.contains("밤") {
            return .evening
        }

        return .anytime
    }

    private static func guessedImportance(from text: String) -> Importance {
        if text.contains("중요") || text.contains("급") || text.contains("우선") || text.contains("꼭") {
            return .high
        }

        return .medium
    }

    private static func guessedDuration(from text: String) -> Int {
        let pattern = #"(\d+)\s*분"#
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
           let range = Range(match.range(at: 1), in: text),
           let value = Int(text[range]) {
            return closestDuration(to: value)
        }

        if ["회의", "보고서", "자료", "초안", "작성"].contains(where: text.contains) {
            return 30
        }

        if ["답장", "확인", "정리", "챙기기"].contains(where: text.contains) {
            return 10
        }

        return 15
    }

    private static func closestDuration(to value: Int) -> Int {
        TaskDraft.durationOptions.min { abs($0 - value) < abs($1 - value) } ?? 15
    }

    private static func actionTitle(from fragment: String) -> String {
        let replacements: [(String, String)] = [
            ("내일까지", " "),
            ("내일", " "),
            ("오늘까지", " "),
            ("오늘", " "),
            ("이번 주", " "),
            ("오전", " "),
            ("아침", " "),
            ("오후", " "),
            ("점심", " "),
            ("저녁", " "),
            ("밤", " "),
            ("부탁드립니다", " "),
            ("부탁드려요", " "),
            ("부탁해요", " "),
            ("해주세요", " "),
            ("해 주세요", " "),
            ("주세요", " "),
            ("보내주세요", "보내"),
            ("보내 주세요", "보내"),
            ("확인 부탁드립니다", "확인"),
            ("확인 부탁드려요", "확인")
        ]

        var value = fragment
        for (from, to) in replacements {
            value = value.replacingOccurrences(of: from, with: to)
        }

        value = value
            .replacingOccurrences(of: "\"", with: " ")
            .replacingOccurrences(of: "“", with: " ")
            .replacingOccurrences(of: "”", with: " ")
            .replacingOccurrences(of: ",", with: " ")
            .replacingOccurrences(of: "  ", with: " ")
            .replacingOccurrences(of: "  ", with: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if value.hasPrefix("그리고 ") {
            value.removeFirst("그리고 ".count)
        }

        guard !value.isEmpty else { return "" }

        let endings: [(String, String)] = [
            ("보내", "보내기"),
            ("챙기", "챙기기"),
            ("답장", "답장하기"),
            ("확인", "확인하기"),
            ("정리", "정리하기"),
            ("준비", "준비하기"),
            ("공유", "공유하기")
        ]

        for (ending, replacement) in endings where value.hasSuffix(ending) {
            return String(value.dropLast(ending.count)) + replacement
        }

        if value.hasSuffix("하기") || value.hasSuffix("기") {
            return value
        }

        return value + "하기"
    }
}
