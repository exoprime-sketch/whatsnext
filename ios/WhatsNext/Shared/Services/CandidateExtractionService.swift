import Foundation

// Rule-based text parser. Designed to be replaced with an ML model later.
struct CandidateExtractionService {

    func extract(from text: String, source: ImportSourceType = .text) -> [ExtractedCandidate] {
        text.components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { $0.count > 3 }
            .compactMap { parse($0, source: source) }
    }

    // MARK: - Line parser

    private func parse(_ raw: String, source: ImportSourceType) -> ExtractedCandidate? {
        let stripped = stripBullet(raw)
        guard stripped.count > 3 else { return nil }

        var c = ExtractedCandidate()
        c.sourceType  = source
        c.originalText = raw
        c.itemType    = inferType(stripped)
        c.target      = c.itemType == .event ? .calendar : .reminders

        let lower = stripped.lowercased()

        // Date
        if let (dateText, date) = extractDate(lower) {
            c.dateText        = dateText
            c.startDate       = date
            c.needsDateReview = date == nil
        } else {
            c.needsDateReview = true
        }

        // Time
        if let (timeText, comps) = extractTime(stripped) {
            c.timeText = timeText
            if let start = c.startDate, let hour = comps.hour {
                c.startDate = applyTime(to: start, hour: hour, minute: comps.minute ?? 0)
                c.endDate   = c.startDate.map { $0.addingTimeInterval(3600) }
            } else if c.itemType == .event {
                c.needsTimeReview = true
            }
        } else if c.itemType == .event {
            c.needsTimeReview = true
        }

        // Location
        c.location = extractLocation(stripped) ?? ""

        // Confidence
        c.confidence = scoreConfidence(c)

        // Clean title
        c.title = cleanTitle(stripped)
        guard !c.title.isEmpty else { return nil }

        return c
    }

    // MARK: - Helpers

    private func stripBullet(_ s: String) -> String {
        s.replacingOccurrences(of: #"^[-•*\d\.]+\s+"#, with: "", options: .regularExpression)
    }

    private func inferType(_ text: String) -> CandidateItemType {
        let lower = text.lowercased()
        let eventWords    = ["dinner","lunch","breakfast","meeting","call","review",
                             "sync","conference","interview","appointment","with"]
        let reminderWords = ["send","submit","email","remind","deadline","report",
                             "by friday","by monday","by end","don't forget"]
        let eScore = eventWords.filter    { lower.contains($0) }.count
        let rScore = reminderWords.filter { lower.contains($0) }.count
        if eScore > rScore { return .event }
        if rScore > 0      { return .reminder }
        return .task
    }

    private func extractDate(_ lower: String) -> (String, Date?)? {
        let now = Date.now
        let cal = Calendar.current
        func startOfDay(_ d: Date) -> Date { cal.startOfDay(for: d) }
        func offset(_ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: startOfDay(now))! }

        let rules: [(String, Date?)] = [
            ("today",           startOfDay(now)),
            ("tomorrow",        offset(1)),
            ("next monday",     nextWeekday(2, from: now)),
            ("next tuesday",    nextWeekday(3, from: now)),
            ("next wednesday",  nextWeekday(4, from: now)),
            ("next thursday",   nextWeekday(5, from: now)),
            ("next friday",     nextWeekday(6, from: now)),
            ("next saturday",   nextWeekday(7, from: now)),
            ("next sunday",     nextWeekday(1, from: now)),
            ("on saturday",     nextWeekday(7, from: now)),
            ("on friday",       nextWeekday(6, from: now)),
            ("by friday",       nextWeekday(6, from: now)),
            ("by monday",       nextWeekday(2, from: now)),
            ("saturday",        nextWeekday(7, from: now)),
            ("friday",          nextWeekday(6, from: now)),
            ("thursday",        nextWeekday(5, from: now)),
            ("wednesday",       nextWeekday(4, from: now)),
            ("tuesday",         nextWeekday(3, from: now)),
            ("monday",          nextWeekday(2, from: now)),
        ]
        for (keyword, date) in rules where lower.contains(keyword) {
            return (keyword, date)
        }
        return nil
    }

    private func extractTime(_ text: String) -> (String, DateComponents?)? {
        let patterns = [
            #"\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b"#,
            #"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b"#,
        ]
        for pattern in patterns {
            guard let regex  = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
                  let match  = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  let range  = Range(match.range, in: text)
            else { continue }

            let matchStr = String(text[range])
            let isPM     = matchStr.lowercased().contains("pm")
            let nums     = matchStr
                .replacingOccurrences(of: #"[^\d:]"#, with: " ", options: .regularExpression)
                .components(separatedBy: .whitespaces)
                .compactMap { Int($0) }

            guard var hour = nums.first else { continue }
            let minute = nums.count > 1 ? nums[1] : 0
            if isPM && hour < 12 { hour += 12 }
            if !isPM && hour == 12 { hour = 0 }

            var comps    = DateComponents()
            comps.hour   = hour
            comps.minute = minute
            return (matchStr, comps)
        }
        return nil
    }

    private func extractLocation(_ text: String) -> String? {
        let pattern = #"(?:near|at|in)\s+([A-Z][a-zA-Z\s]+(Station|Street|Ave|Rd|St|Park|Hotel|Center|Square))"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              match.numberOfRanges > 1,
              let range = Range(match.range(at: 1), in: text)
        else { return nil }
        return String(text[range])
    }

    private func applyTime(to date: Date, hour: Int, minute: Int) -> Date {
        Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: date) ?? date
    }

    private func cleanTitle(_ text: String) -> String {
        let removes = [
            #"\b(on|at|by|next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b"#,
            #"\btoday\b"#, #"\btomorrow\b"#,
            #"\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)\b"#,
            #"\b\d{1,2}(:\d{2})?\s*(am|pm)\b"#,
            #"\bnear\s+\S.*$"#,
        ]
        var result = text
        for p in removes {
            result = result.replacingOccurrences(of: p, with: "",
                options: [.regularExpression, .caseInsensitive])
        }
        return result
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: #"\s{2,}"#, with: " ", options: .regularExpression)
    }

    private func scoreConfidence(_ c: ExtractedCandidate) -> CandidateConfidence {
        var score = 0
        if !c.dateText.isEmpty  { score += 2 }
        if !c.timeText.isEmpty  { score += 2 }
        if c.title.count > 5   { score += 1 }
        if !c.location.isEmpty { score += 1 }
        switch score {
        case 5...: return .high
        case 2...: return .medium
        default:   return .low
        }
    }

    private func nextWeekday(_ weekday: Int, from date: Date) -> Date? {
        Calendar.current.nextDate(
            after: date,
            matching: DateComponents(weekday: weekday),
            matchingPolicy: .nextTime
        )
    }
}
