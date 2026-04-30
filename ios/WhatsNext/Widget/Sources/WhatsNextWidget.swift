import SwiftUI
import WidgetKit

struct WhatsNextEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct WhatsNextProvider: TimelineProvider {
    private let repository = AppRepository()

    func placeholder(in context: Context) -> WhatsNextEntry {
        WhatsNextEntry(date: .now, snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (WhatsNextEntry) -> Void) {
        completion(WhatsNextEntry(date: .now, snapshot: repository.loadWidgetSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WhatsNextEntry>) -> Void) {
        let entry = WhatsNextEntry(date: .now, snapshot: repository.loadWidgetSnapshot())
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: .now) ?? .now.addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }
}

struct WhatsNextWidgetView: View {
    var entry: WhatsNextEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("지금 할 일 하나")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            Text(entry.snapshot.title)
                .font(.headline)
                .lineLimit(3)

            Text(entry.snapshot.subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            Spacer(minLength: 0)

            HStack {
                Label("\(entry.snapshot.durationMinutes)분", systemImage: "clock")
                    .font(.caption2)
                Spacer()
                Text("남은 일 \(entry.snapshot.remainingCount)개")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [
                    Color(red: 1.00, green: 0.98, blue: 0.95),
                    Color(red: 0.98, green: 0.93, blue: 0.86)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .widgetURL(URL(string: entry.snapshot.deepLink))
    }
}

struct WhatsNextWidget: Widget {
    let kind = "WhatsNextWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WhatsNextProvider()) { entry in
            WhatsNextWidgetView(entry: entry)
        }
        .configurationDisplayName("오늘하나 Now Card")
        .description("홈 화면에서 지금 할 일 하나를 바로 확인합니다.")
        .supportedFamilies([.systemSmall])
    }
}

@main
struct WhatsNextWidgetBundle: WidgetBundle {
    var body: some Widget {
        WhatsNextWidget()
    }
}
